#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const DEFAULT_APP = 'zen-bot';
const DEFAULT_THRESHOLD = 2;
const DEFAULT_TIMEOUT_SECONDS = 90;
const PM2_RESTART_TIMEOUT_MS = 25 * 1000;
const PM2_KILL_TIMEOUT_MS = 10 * 1000;
const PM2_START_TIMEOUT_MS = 60 * 1000;
const PM2_SAVE_TIMEOUT_MS = 15 * 1000;
const PID_STOP_TIMEOUT_MS = 5 * 1000;
const LOCK_STALE_MS = 10 * 60 * 1000;
const ROOT = path.resolve(__dirname, '..');
const LOG_DIR = path.join(ROOT, 'logs');
const HEALTH_SCRIPT = path.join(__dirname, 'health-check.js');
const NODE_DIR = path.dirname(process.execPath);
const PM2_CLI = path.join(NODE_DIR, 'node_modules', 'pm2', 'bin', 'pm2');
const BOT_SCRIPT = path.join(ROOT, 'src', 'index.js');

const USAGE = `Zen bot watchdog

Usage: node scripts/watchdog.js [options]

Options:
  --app <name>          PM2 app name (default: ${DEFAULT_APP})
  --threshold <count>   Consecutive failures before a restart (default: ${DEFAULT_THRESHOLD})
  --timeout <seconds>   Health-check boot timeout (default: ${DEFAULT_TIMEOUT_SECONDS})
  --state-file <path>   Failure counter file (default: logs/watchdog-state.json)
  --log-file <path>     Event log (default: logs/watchdog.log)
  --lock-file <path>    Overlap lock file (default: logs/watchdog.lock)
  -h, --help            Show this help

Runs the normal health check. A healthy result resets the counter. When the app
fails the configured number of checks in a row, the watchdog restarts it through
PM2 and resets the counter so one outage cannot trigger a restart loop.

If PM2 itself stops responding, the watchdog force-stops the stale PM2 daemon
and app processes, starts a fresh PM2 daemon, and verifies the Discord login
before treating the recovery as successful.

Exit codes: 0 healthy, skipped or restart issued; 1 still unhealthy; 2 usage error.`;

function parseArgs(argv) {
  const options = {
    app: DEFAULT_APP,
    threshold: DEFAULT_THRESHOLD,
    timeout: DEFAULT_TIMEOUT_SECONDS,
    stateFile: path.join(LOG_DIR, 'watchdog-state.json'),
    logFile: path.join(LOG_DIR, 'watchdog.log'),
    lockFile: path.join(LOG_DIR, 'watchdog.lock'),
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (!['--app', '--threshold', '--timeout', '--state-file', '--log-file', '--lock-file'].includes(arg)) {
      throw new Error(`unknown option: ${arg}`);
    }

    const value = argv[index + 1];
    if (value === undefined) throw new Error(`${arg} needs a value`);
    index += 1;

    if (arg === '--app') {
      options.app = value;
    } else if (arg === '--state-file') {
      options.stateFile = path.resolve(value);
    } else if (arg === '--log-file') {
      options.logFile = path.resolve(value);
    } else if (arg === '--lock-file') {
      options.lockFile = path.resolve(value);
    } else {
      const number = Number(value);
      if (!Number.isFinite(number) || number <= 0) {
        throw new Error(`${arg} needs a positive number`);
      }
      if (arg === '--threshold') options.threshold = Math.max(1, Math.floor(number));
      else options.timeout = number;
    }
  }

  return options;
}

function isoNow() {
  return new Date().toISOString();
}

function appendLog(file, line) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, `[${isoNow()}] ${line}\n`, 'utf8');
  } catch (error) {
    console.error(`[watchdog] could not write ${file}: ${error.message}`);
  }
}

function readState(file) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      failures: Math.max(0, Math.floor(Number(parsed?.failures) || 0)),
      restarts: Math.max(0, Math.floor(Number(parsed?.restarts) || 0)),
      lastCheckAt: Number(parsed?.lastCheckAt) || 0,
      lastHealthyAt: Number(parsed?.lastHealthyAt) || 0,
      lastFailureAt: Number(parsed?.lastFailureAt) || 0,
      lastRestartAt: Number(parsed?.lastRestartAt) || 0,
      lastProblem: typeof parsed?.lastProblem === 'string' ? parsed.lastProblem : null,
    };
  } catch {
    return {
      failures: 0,
      restarts: 0,
      lastCheckAt: 0,
      lastHealthyAt: 0,
      lastFailureAt: 0,
      lastRestartAt: 0,
      lastProblem: null,
    };
  }
}

function writeState(file, state) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
    fs.renameSync(temporary, file);
  } catch (error) {
    console.error(`[watchdog] could not save ${file}: ${error.message}`);
  }
}

function isProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

function acquireLock(file, { now = Date.now(), pid = process.pid, isAlive = isProcessAlive } = {}) {
  const payload = `${JSON.stringify({ pid, startedAt: now })}\n`;
  fs.mkdirSync(path.dirname(file), { recursive: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const descriptor = fs.openSync(file, 'wx');
      try {
        fs.writeFileSync(descriptor, payload, 'utf8');
      } finally {
        fs.closeSync(descriptor);
      }
      return { ok: true, pid, startedAt: now };
    } catch (error) {
      if (error.code !== 'EEXIST') return { ok: false, message: error.message };

      let holder = null;
      try {
        holder = JSON.parse(fs.readFileSync(file, 'utf8'));
      } catch {
        holder = null;
      }

      const holderPid = Number(holder?.pid) || 0;
      const holderStartedAt = Number(holder?.startedAt) || 0;
      const stale = !holderPid
        || !isAlive(holderPid)
        || now < holderStartedAt
        || now - holderStartedAt > LOCK_STALE_MS;

      if (!stale) {
        return { ok: false, holder: { pid: holderPid, startedAt: holderStartedAt } };
      }

      try {
        fs.unlinkSync(file);
      } catch {
        // Another run may have replaced the stale lock first.
      }
    }
  }

  return { ok: false, message: `could not acquire ${file}` };
}

function releaseLock(file, pid = process.pid) {
  try {
    const holder = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (Number(holder?.pid) === pid) fs.unlinkSync(file);
  } catch {
    // Missing or already replaced locks are fine.
  }
}

function runPm2(args, { timeoutMs = PM2_RESTART_TIMEOUT_MS, spawnImpl = spawnSync } = {}) {
  const useCli = fs.existsSync(PM2_CLI);
  const command = useCli ? process.execPath : 'pm2';
  const commandArgs = useCli ? [PM2_CLI, ...args] : args;
  const label = `pm2 ${args[0] || 'command'}`;

  let result;
  try {
    result = spawnImpl(command, commandArgs, {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: timeoutMs,
      windowsHide: true,
      shell: !useCli,
      env: {
        ...process.env,
        PATH: NODE_DIR + path.delimiter + (process.env.PATH || ''),
      },
    });
  } catch (error) {
    return { ok: false, timedOut: false, message: `${label} failed: ${error.message}` };
  }

  const timedOut = Boolean(
    result.error
    && (result.error.code === 'ETIMEDOUT' || /timed out/i.test(result.error.message || '')),
  );
  if (timedOut) {
    return {
      ok: false,
      timedOut: true,
      message: `${label} timed out after ${Math.round(timeoutMs / 1000)}s`,
    };
  }

  if (result.error) return { ok: false, timedOut: false, message: `${label} failed: ${result.error.message}` };

  const output = (result.stderr || result.stdout || '').trim();
  if (result.status !== 0) {
    return {
      ok: false,
      timedOut: false,
      message: output || `${label} exited with code ${result.status}`,
    };
  }

  return {
    ok: true,
    timedOut: false,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
  };
}

function restartApp(app, { spawnImpl = spawnSync } = {}) {
  return runPm2(
    ['restart', app, '--update-env'],
    { timeoutMs: PM2_RESTART_TIMEOUT_MS, spawnImpl },
  );
}

function startApp(app, { spawnImpl = spawnSync } = {}) {
  return runPm2(
    ['start', BOT_SCRIPT, '--name', app, '--time'],
    { timeoutMs: PM2_START_TIMEOUT_MS, spawnImpl },
  );
}

function pm2Home(env = process.env) {
  return path.resolve(env.PM2_HOME || path.join(os.homedir(), '.pm2'));
}

function readPidFile(file) {
  try {
    const pid = Number.parseInt(fs.readFileSync(file, 'utf8').trim(), 10);
    return Number.isInteger(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

function trackedPids(app, env = process.env) {
  const home = pm2Home(env);
  const pids = new Set();
  const daemonPid = readPidFile(path.join(home, 'pm2.pid'));
  if (daemonPid) pids.add(daemonPid);

  let names = [];
  try {
    names = fs.readdirSync(path.join(home, 'pids'));
  } catch {
    names = [];
  }

  for (const name of names) {
    if (!name.startsWith(`${app}-`) || !name.endsWith('.pid')) continue;
    const pid = readPidFile(path.join(home, 'pids', name));
    if (pid) pids.add(pid);
  }

  return [...pids].filter((pid) => pid !== process.pid);
}

function allPm2ChildPids(env = process.env) {
  const home = pm2Home(env);
  const pids = new Set();
  let names = [];
  try {
    names = fs.readdirSync(path.join(home, 'pids'));
  } catch {
    names = [];
  }

  for (const name of names) {
    if (!name.endsWith('.pid')) continue;
    const pid = readPidFile(path.join(home, 'pids', name));
    if (pid) pids.add(pid);
  }

  return [...pids].filter((pid) => pid !== process.pid);
}

function parseWindowsPm2Daemons(output) {
  const pids = new Set();
  const text = String(output || '').replace(/\r/g, '');

  for (const block of text.split(/\n\s*\n/)) {
    const command = block.match(/^CommandLine=(.*)$/m);
    const processId = block.match(/^ProcessId=(\d+)\s*$/m);
    if (!command || !processId) continue;
    if (!/pm2[\\/]lib[\\/]Daemon\.js/i.test(command[1])) continue;

    const pid = Number(processId[1]);
    if (Number.isInteger(pid) && pid > 0) pids.add(pid);
  }

  return [...pids];
}

function findPm2DaemonPids({ platform = process.platform, spawnImpl = spawnSync } = {}) {
  if (platform === 'win32') {
    const wmic = spawnImpl(
      'wmic',
      ['process', 'where', "name='node.exe'", 'get', 'ProcessId,ParentProcessId,CommandLine', '/format:list'],
      { encoding: 'utf8', timeout: 10000, windowsHide: true },
    );

    if (!wmic.error && wmic.status === 0) {
      const pids = parseWindowsPm2Daemons(wmic.stdout);
      if (pids.length) return pids;
    }

    const script = "Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress";
    const powershell = spawnImpl(
      'powershell.exe',
      ['-NoProfile', '-Command', script],
      { encoding: 'utf8', timeout: 10000, windowsHide: true },
    );
    if (powershell.error || powershell.status !== 0) return [];

    try {
      const parsed = JSON.parse((powershell.stdout || '').trim() || '[]');
      const entries = Array.isArray(parsed) ? parsed : [parsed];
      return entries
        .filter((entry) => /pm2[\\/]lib[\\/]Daemon\.js/i.test(entry?.CommandLine || ''))
        .map((entry) => Number(entry.ProcessId))
        .filter((pid) => Number.isInteger(pid) && pid > 0);
    } catch {
      return [];
    }
  }

  const result = spawnImpl('ps', ['-eo', 'pid=,args='], {
    encoding: 'utf8',
    timeout: 10000,
    windowsHide: true,
  });
  if (result.error || result.status !== 0) return [];

  const pids = new Set();
  for (const line of String(result.stdout || '').split(/\r?\n/)) {
    const match = line.match(/^\s*(\d+)\s+(.*)$/);
    if (!match || !/pm2[\\/]lib[\\/]Daemon\.js/i.test(match[2])) continue;

    const pid = Number(match[1]);
    if (Number.isInteger(pid) && pid > 0) pids.add(pid);
  }
  return [...pids];
}

function killPid(pid, {
  platform = process.platform,
  spawnImpl = spawnSync,
  timeoutMs = 10 * 1000,
} = {}) {
  if (!isProcessAlive(pid)) return { ok: true, alreadyStopped: true };

  if (platform === 'win32') {
    let result;
    try {
      result = spawnImpl('taskkill', ['/F', '/T', '/PID', String(pid)], {
        encoding: 'utf8',
        timeout: timeoutMs,
        windowsHide: true,
      });
    } catch (error) {
      return { ok: false, message: error.message };
    }

    if (result.error && isProcessAlive(pid)) {
      return { ok: false, message: result.error.message };
    }
    if (result.status !== 0 && isProcessAlive(pid)) {
      const output = (result.stderr || result.stdout || '').trim();
      return { ok: false, message: output || `taskkill exited with code ${result.status}` };
    }
    return { ok: true };
  }

  try {
    process.kill(pid, 'SIGKILL');
    return { ok: true };
  } catch (error) {
    if (error.code === 'ESRCH') return { ok: true, alreadyStopped: true };
    return { ok: false, message: error.message };
  }
}

function sleepSync(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

function waitForExit(pids, {
  timeoutMs = PID_STOP_TIMEOUT_MS,
  isAlive = isProcessAlive,
  sleepImpl = sleepSync,
} = {}) {
  let remaining = pids.filter((pid) => isAlive(pid));
  const deadline = Date.now() + timeoutMs;

  while (remaining.length && Date.now() < deadline) {
    sleepImpl(100);
    remaining = remaining.filter((pid) => isAlive(pid));
  }

  return remaining;
}

function recoverPm2(app, {
  spawnImpl = spawnSync,
  killPidImpl = killPid,
  isAlive = isProcessAlive,
  waitForExitImpl = waitForExit,
  discoverDaemonPids = findPm2DaemonPids,
  allPm2Pids = allPm2ChildPids,
  env = process.env,
  platform = process.platform,
  logger = console,
} = {}) {
  logger.log(`[watchdog] ${app}: forcing a clean PM2 recovery after a failed restart`);

  const graceful = runPm2(['kill'], { timeoutMs: PM2_KILL_TIMEOUT_MS, spawnImpl });
  if (!graceful.ok) {
    logger.warn(`[watchdog] pm2 kill did not finish cleanly: ${graceful.message}`);
  }

  const discovered = discoverDaemonPids({ platform, spawnImpl });
  const pids = [...new Set([
    ...trackedPids(app, env),
    ...allPm2Pids(env),
    ...discovered,
  ])].filter((pid) => pid !== process.pid);

  if (discovered.length) logger.log(`[watchdog] found ${discovered.length} running PM2 daemon(s)`);
  const failures = [];

  for (const pid of pids) {
    if (!isAlive(pid)) continue;
    const killed = killPidImpl(pid, { platform, spawnImpl });
    if (killed.ok) logger.log(`[watchdog] force-stopped stale PID ${pid}`);
    else failures.push(`${pid} (${killed.message})`);
  }

  if (failures.length) {
    return { ok: false, message: `could not stop stale PM2 processes: ${failures.join(', ')}` };
  }

  const survivors = waitForExitImpl(pids, { isAlive });
  if (survivors.length) {
    return { ok: false, message: `stale PM2 processes are still running: ${survivors.join(', ')}` };
  }

  const started = startApp(app, { spawnImpl });
  if (!started.ok) {
    return { ok: false, message: `fresh PM2 start failed: ${started.message}` };
  }

  const saved = runPm2(['save'], { timeoutMs: PM2_SAVE_TIMEOUT_MS, spawnImpl });
  return {
    ok: true,
    killed: pids,
    saveWarning: saved.ok ? null : saved.message,
  };
}

function checkHealth(app, timeout) {
  const result = spawnSync(
    process.execPath,
    [HEALTH_SCRIPT, '--app', app, '--timeout', String(timeout), '--json'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: (timeout + 30) * 1000,
      env: {
        ...process.env,
        PATH: NODE_DIR + path.delimiter + (process.env.PATH || ''),
      },
    },
  );

  let payload = null;
  try {
    payload = JSON.parse((result.stdout || '').trim());
  } catch {
    payload = null;
  }

  if (payload && typeof payload.ok === 'boolean') {
    const failure = Array.isArray(payload.checks)
      ? payload.checks.find((check) => check.level === 'fail')
      : null;
    return {
      ok: payload.ok,
      problem: failure?.message || 'the health check reported an unhealthy bot',
    };
  }

  return {
    ok: false,
    problem: result.error?.message
      || (result.stderr || '').trim()
      || `the health check exited with code ${result.status}`,
  };
}

function runCheck(options, deps, now) {
  const healthCheck = deps.checkHealth || checkHealth;
  const restart = deps.restartApp || restartApp;
  const recover = deps.recoverPm2 || recoverPm2;
  const state = readState(options.stateFile);
  const health = healthCheck(options.app, options.timeout);
  state.lastCheckAt = now;

  if (health.ok) {
    const recovered = state.failures > 0;
    state.failures = 0;
    state.lastHealthyAt = now;
    state.lastProblem = null;
    writeState(options.stateFile, state);

    if (recovered) {
      appendLog(options.logFile, `${options.app} recovered without a restart`);
      console.log(`[watchdog] ${options.app} is healthy again`);
    } else {
      console.log(`[watchdog] ${options.app} is healthy`);
    }
    return 0;
  }

  state.failures += 1;
  state.lastFailureAt = now;
  state.lastProblem = health.problem;

  if (state.failures < options.threshold) {
    writeState(options.stateFile, state);
    appendLog(
      options.logFile,
      `${options.app} failed check ${state.failures}/${options.threshold}: ${health.problem}`,
    );
    console.log(
      `[watchdog] ${options.app} failed ${state.failures}/${options.threshold}: ${health.problem}`,
    );
    return 1;
  }

  appendLog(
    options.logFile,
    `${options.app} failed ${state.failures} checks in a row; restarting through PM2: ${health.problem}`,
  );

  const restartResult = restart(options.app);
  if (restartResult.ok) {
    state.failures = 0;
    state.restarts += 1;
    state.lastRestartAt = now;
    state.lastProblem = null;
    writeState(options.stateFile, state);
    appendLog(options.logFile, `${options.app} restarted successfully (restart ${state.restarts})`);
    console.log(`[watchdog] ${options.app} restarted after ${options.threshold} failed checks`);
    return 0;
  }

  appendLog(
    options.logFile,
    `PM2 restart failed (${restartResult.message}); forcing a clean PM2 recovery`,
  );

  const recovery = recover(options.app);
  if (!recovery.ok) {
    writeState(options.stateFile, state);
    appendLog(options.logFile, `clean PM2 recovery failed: ${recovery.message}`);
    console.error(`[watchdog] clean PM2 recovery failed: ${recovery.message}`);
    return 1;
  }

  if (recovery.saveWarning) {
    appendLog(options.logFile, `PM2 started, but pm2 save failed: ${recovery.saveWarning}`);
  }

  const verification = healthCheck(options.app, options.timeout);
  if (!verification.ok) {
    state.lastProblem = verification.problem;
    writeState(options.stateFile, state);
    appendLog(
      options.logFile,
      `clean PM2 recovery started a fresh daemon, but verification failed: ${verification.problem}`,
    );
    console.error(`[watchdog] clean PM2 recovery verification failed: ${verification.problem}`);
    return 1;
  }

  state.failures = 0;
  state.restarts += 1;
  state.lastRestartAt = now;
  state.lastProblem = null;
  writeState(options.stateFile, state);
  appendLog(
    options.logFile,
    `${options.app} recovered with a clean PM2 daemon and a verified Discord login (restart ${state.restarts})`,
  );
  console.log(`[watchdog] ${options.app} recovered with a clean PM2 daemon`);
  return 0;
}

function main(argv = process.argv.slice(2), deps = {}) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(`[watchdog] ${error.message}`);
    console.error(USAGE);
    return 2;
  }

  if (options.help) {
    console.log(USAGE);
    return 0;
  }

  const now = deps.now ? deps.now() : Date.now();
  const lock = acquireLock(options.lockFile, {
    now,
    isAlive: deps.isLockHolderAlive || isProcessAlive,
  });

  if (!lock.ok) {
    if (lock.holder) {
      console.log(`[watchdog] another run is already active (pid ${lock.holder.pid}); skipping`);
      return 0;
    }
    console.error(`[watchdog] could not acquire the watchdog lock: ${lock.message}`);
    return 1;
  }

  try {
    return runCheck(options, deps, now);
  } finally {
    releaseLock(options.lockFile);
  }
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  acquireLock,
  checkHealth,
  isProcessAlive,
  killPid,
  main,
  parseArgs,
  pm2Home,
  readState,
  recoverPm2,
  releaseLock,
  restartApp,
  runPm2,
  startApp,
  allPm2ChildPids,
  findPm2DaemonPids,
  trackedPids,
  waitForExit,
  writeState,
};
