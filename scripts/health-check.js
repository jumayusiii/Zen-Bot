#!/usr/bin/env node
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const DEFAULT_APP = 'zen-bot';
const DEFAULT_TIMEOUT_SECONDS = 90;
const DEFAULT_INTERVAL_SECONDS = 3;
const MAX_LOG_BYTES = 512 * 1024;
const LOGIN_PATTERN = /\[bot\] Logged in as (.+?) \((\d+)\)/;
const TIMESTAMP_PATTERN = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/;
const DISCORD_ME_URL = 'https://discord.com/api/v10/users/@me';

const NODE_DIR = path.dirname(process.execPath);
const PM2_CLI = path.join(NODE_DIR, 'node_modules', 'pm2', 'bin', 'pm2');

const USAGE = `Zen bot health check

Usage: node scripts/health-check.js [options]

Options:
  --app <name>         PM2 app name (default: ${DEFAULT_APP})
  --timeout <seconds>  How long to wait for the bot to boot (default: ${DEFAULT_TIMEOUT_SECONDS})
  --interval <seconds> Seconds between checks while waiting (default: ${DEFAULT_INTERVAL_SECONDS})
  --json               Print a machine-readable result
  -h, --help           Show this help

Confirms that PM2 reports the app online, that its log contains a Discord login
line written after the current process started, and that DISCORD_TOKEN belongs
to that bot. Reads .env from ZEN_DEPLOY_DIR, %USERPROFILE%\\Zen-Bot or the
project root.

Exit codes: 0 healthy, 1 unhealthy, 2 usage error.`;

function parseArgs(argv) {
  const options = {
    app: DEFAULT_APP,
    timeout: DEFAULT_TIMEOUT_SECONDS,
    interval: DEFAULT_INTERVAL_SECONDS,
    json: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
      continue;
    }
    if (arg === '--json') {
      options.json = true;
      continue;
    }
    if (arg === '--app' || arg === '--timeout' || arg === '--interval') {
      const value = argv[i + 1];
      if (value === undefined) throw new Error(`${arg} needs a value`);
      i += 1;
      if (arg === '--app') {
        options.app = value;
      } else {
        const number = Number(value);
        if (!Number.isFinite(number) || number <= 0) {
          throw new Error(`${arg} needs a positive number`);
        }
        if (arg === '--timeout') options.timeout = number;
        else options.interval = number;
      }
      continue;
    }
    throw new Error(`unknown option: ${arg}`);
  }

  return options;
}

function deployDir() {
  if (process.env.ZEN_DEPLOY_DIR) return path.resolve(process.env.ZEN_DEPLOY_DIR);

  const stable = path.join(os.homedir(), 'Zen-Bot');
  if (fs.existsSync(path.join(stable, 'package.json'))) return stable;

  return path.resolve(__dirname, '..');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pm2(args) {
  const useCli = fs.existsSync(PM2_CLI);
  const result = spawnSync(
    useCli ? process.execPath : 'pm2',
    useCli ? [PM2_CLI, ...args] : args,
    {
      encoding: 'utf8',
      timeout: 20000,
      shell: !useCli,
      env: {
        ...process.env,
        PATH: NODE_DIR + path.delimiter + (process.env.PATH || ''),
      },
    },
  );

  if (result.error) return { error: result.error.message };
  if (result.status !== 0) {
    return { error: (result.stderr || '').trim() || `pm2 exited with code ${result.status}` };
  }
  return { stdout: result.stdout };
}

function readState(appName) {
  const response = pm2(['jlist']);
  if (response.error) return { error: response.error };

  let apps;
  try {
    apps = JSON.parse(response.stdout);
  } catch {
    return { error: 'pm2 jlist returned unreadable JSON' };
  }

  const app = apps.find((entry) => entry.name === appName);
  if (!app) return { app: null, error: `PM2 has no app named "${appName}"` };

  const env = app.pm2_env || {};
  return {
    name: app.name,
    status: env.status,
    pid: app.pid,
    startedAt: Number(env.pm_uptime) || null,
    restarts: env.restart_time,
    scriptPath: env.pm_exec_path || null,
    logfile: env.pm_out_log_path || null,
  };
}

function tail(file, bytes = MAX_LOG_BYTES) {
  try {
    const stat = fs.statSync(file);
    const size = Math.min(stat.size, bytes);
    const buffer = Buffer.alloc(size);
    const fd = fs.openSync(file, 'r');
    try {
      fs.readSync(fd, buffer, 0, size, stat.size - size);
    } finally {
      fs.closeSync(fd);
    }
    return {
      text: buffer.toString('utf8'),
      mtimeMs: stat.mtimeMs,
      partial: stat.size > bytes,
    };
  } catch {
    return null;
  }
}

function lastLogin(file) {
  const log = tail(file);
  if (!log) return null;

  const lines = log.text.split(/\r?\n/);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const match = lines[i].match(LOGIN_PATTERN);
    if (!match) continue;

    const timestamp = lines[i].match(TIMESTAMP_PATTERN);
    const at = timestamp ? Date.parse(timestamp[1]) : NaN;
    return {
      name: match[1].trim(),
      id: match[2],
      at: Number.isFinite(at) ? at : null,
      mtimeMs: log.mtimeMs,
    };
  }

  return null;
}

function readinessProblem(state) {
  if (state.error) return state.error;
  if (state.status !== 'online') return `PM2 reports status=${state.status}`;

  const login = state.logfile ? lastLogin(state.logfile) : null;
  if (!login) return 'no Discord "Logged in" line in the PM2 log yet';
  state.login = login;
  state.timestamped = login.at !== null;

  if (!state.startedAt) return null;
  if (login.at !== null) {
    if (login.at < state.startedAt - 5000) {
      return 'the last Discord login line is older than the current PM2 start';
    }
    return null;
  }

  if (login.mtimeMs < state.startedAt - 5000) {
    return 'the PM2 log has not been written since this process started';
  }
  return null;
}

async function waitForReady(appName, timeoutSeconds, intervalSeconds) {
  const deadline = Date.now() + timeoutSeconds * 1000;
  let state = readState(appName);
  let problem = readinessProblem(state);

  while (problem) {
    if (Date.now() >= deadline) return { state, problem };
    await sleep(intervalSeconds * 1000);
    state = readState(appName);
    problem = readinessProblem(state);
  }

  return { state, problem: null };
}

function readToken(dir) {
  if (process.env.DISCORD_TOKEN && process.env.DISCORD_TOKEN.trim()) {
    return { token: process.env.DISCORD_TOKEN.trim(), source: 'environment' };
  }

  const file = path.join(dir, '.env');
  let text;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch {
    return { token: null, source: null };
  }

  const line = text.split(/\r?\n/).find((entry) => /^\s*DISCORD_TOKEN\s*=/.test(entry));
  if (!line) return { token: null, source: file };

  let value = line.slice(line.indexOf('=') + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }

  return { token: value || null, source: file };
}

async function fetchBotIdentity(token) {
  try {
    const response = await fetch(DISCORD_ME_URL, {
      headers: { Authorization: `Bot ${token}` },
      signal: AbortSignal.timeout(10000),
    });

    if (response.status === 401) return { error: 'Discord rejected DISCORD_TOKEN (HTTP 401)' };
    if (!response.ok) return { error: `Discord API returned HTTP ${response.status}` };

    const user = await response.json();
    return { id: user.id, username: user.username };
  } catch (error) {
    const reason = error.name === 'TimeoutError' ? 'request timed out' : error.message;
    return { error: `Discord API unreachable (${reason})` };
  }
}

function formatTime(ms) {
  const date = new Date(ms);
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} `
    + `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatUptime(startedAt) {
  if (!startedAt) return 'unknown uptime';
  const seconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  if (seconds < 60) return `up ${seconds}s`;
  if (seconds < 3600) return `up ${Math.round(seconds / 60)}m`;
  return `up ${(seconds / 3600).toFixed(1)}h`;
}

function inside(dir, file) {
  if (!file) return null;
  const relative = path.relative(dir, file);
  return Boolean(relative) && !relative.startsWith('..') && !path.isAbsolute(relative);
}

async function main() {
  let options;
  try {
    options = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(`[health] ${error.message}`);
    console.error(USAGE);
    process.exit(2);
  }

  if (options.help) {
    console.log(USAGE);
    return;
  }

  const dir = deployDir();
  const started = Date.now();
  const { state, problem } = await waitForReady(options.app, options.timeout, options.interval);
  const checks = [];

  if (problem) {
    checks.push({ level: 'fail', message: problem });
  } else {
    checks.push({
      level: 'ok',
      message: `PM2 app ${state.name} is online (pid ${state.pid}, ${formatUptime(state.startedAt)}, restarts ${state.restarts})`,
    });

    if (state.scriptPath && !inside(dir, state.scriptPath)) {
      checks.push({
        level: 'warn',
        message: `the running process is ${state.scriptPath}, not inside ${dir}`,
      });
    }

    const login = state.login;
    const when = login.at ? ` at ${formatTime(login.at)}` : '';
    checks.push({
      level: 'ok',
      message: `Discord login: ${login.name} (${login.id})${when}, after the latest start`,
    });
    if (!state.timestamped) {
      checks.push({ level: 'warn', message: 'PM2 log lines have no timestamps; freshness was inferred from the log file' });
    }

    const { token } = readToken(dir);
    if (!token) {
      checks.push({ level: 'warn', message: `no DISCORD_TOKEN in ${path.join(dir, '.env')}; skipped identity check` });
    } else {
      const identity = await fetchBotIdentity(token);
      if (identity.error) {
        checks.push({ level: 'warn', message: `${identity.error}; skipped identity check` });
      } else if (identity.id !== login.id) {
        checks.push({
          level: 'fail',
          message: `DISCORD_TOKEN belongs to ${identity.username} (${identity.id}) but the bot is logged in as ${login.name} (${login.id})`,
        });
      } else {
        checks.push({ level: 'ok', message: `DISCORD_TOKEN matches the logged-in bot (${identity.username})` });
      }
    }
  }

  const healthy = !checks.some((check) => check.level === 'fail');
  const elapsed = ((Date.now() - started) / 1000).toFixed(1);

  if (options.json) {
    console.log(JSON.stringify({
      ok: healthy,
      app: options.app,
      dir,
      elapsedSeconds: Number(elapsed),
      checks,
    }, null, 2));
  } else {
    console.log(`[health] checking ${options.app} in ${dir} (waited ${elapsed}s)`);
    for (const check of checks) {
      console.log(`[health] ${check.level.toUpperCase()}: ${check.message}`);
    }
    console.log(healthy ? '[health] healthy' : '[health] unhealthy');
  }

  process.exit(healthy ? 0 : 1);
}

main().catch((error) => {
  console.error(`[health] unexpected failure: ${error.stack || error.message}`);
  process.exit(1);
});
