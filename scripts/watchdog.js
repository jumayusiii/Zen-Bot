#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const DEFAULT_APP = 'zen-bot';
const DEFAULT_THRESHOLD = 2;
const DEFAULT_TIMEOUT_SECONDS = 90;
const ROOT = path.resolve(__dirname, '..');
const LOG_DIR = path.join(ROOT, 'logs');
const HEALTH_SCRIPT = path.join(__dirname, 'health-check.js');
const NODE_DIR = path.dirname(process.execPath);
const PM2_CLI = path.join(NODE_DIR, 'node_modules', 'pm2', 'bin', 'pm2');

const USAGE = `Zen bot watchdog

Usage: node scripts/watchdog.js [options]

Options:
  --app <name>          PM2 app name (default: ${DEFAULT_APP})
  --threshold <count>   Consecutive failures before a restart (default: ${DEFAULT_THRESHOLD})
  --timeout <seconds>   Health-check boot timeout (default: ${DEFAULT_TIMEOUT_SECONDS})
  --state-file <path>   Failure counter file (default: logs/watchdog-state.json)
  --log-file <path>     Event log (default: logs/watchdog.log)
  -h, --help            Show this help

Runs the normal health check. A healthy result resets the counter. When the app
fails the configured number of checks in a row, the watchdog restarts it through
PM2 and resets the counter so one outage cannot trigger a restart loop.

Exit codes: 0 healthy or restart issued, 1 still unhealthy, 2 usage error.`;

function parseArgs(argv) {
  const options = {
    app: DEFAULT_APP,
    threshold: DEFAULT_THRESHOLD,
    timeout: DEFAULT_TIMEOUT_SECONDS,
    stateFile: path.join(LOG_DIR, 'watchdog-state.json'),
    logFile: path.join(LOG_DIR, 'watchdog.log'),
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }

    if (!['--app', '--threshold', '--timeout', '--state-file', '--log-file'].includes(arg)) {
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

function restartApp(app) {
  const useCli = fs.existsSync(PM2_CLI);
  const result = spawnSync(
    useCli ? process.execPath : 'pm2',
    useCli ? [PM2_CLI, 'restart', app, '--update-env'] : ['restart', app, '--update-env'],
    {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: 60 * 1000,
      shell: !useCli,
      env: {
        ...process.env,
        PATH: NODE_DIR + path.delimiter + (process.env.PATH || ''),
      },
    },
  );

  if (result.error) return { ok: false, message: result.error.message };
  if (result.status !== 0) {
    return {
      ok: false,
      message: (result.stderr || result.stdout || '').trim() || `pm2 exited with code ${result.status}`,
    };
  }

  return { ok: true };
}

function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[watchdog] ${error.message}`);
    console.error(USAGE);
    return 2;
  }

  if (options.help) {
    console.log(USAGE);
    return 0;
  }

  const now = Date.now();
  const state = readState(options.stateFile);
  const health = checkHealth(options.app, options.timeout);
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

  const restart = restartApp(options.app);
  if (!restart.ok) {
    writeState(options.stateFile, state);
    appendLog(options.logFile, `restart of ${options.app} failed: ${restart.message}`);
    console.error(`[watchdog] restart of ${options.app} failed: ${restart.message}`);
    return 1;
  }

  state.failures = 0;
  state.restarts += 1;
  state.lastRestartAt = now;
  writeState(options.stateFile, state);
  appendLog(options.logFile, `${options.app} restarted successfully (restart ${state.restarts})`);
  console.log(`[watchdog] ${options.app} restarted after ${options.threshold} failed checks`);
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = { checkHealth, main, parseArgs, readState, restartApp, writeState };
