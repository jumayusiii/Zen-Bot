#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SOURCE = path.resolve(__dirname, '..');
const DEST = path.resolve(process.env.ZEN_DEPLOY_DIR || path.join(os.homedir(), 'Zen-Bot'));
const APP_NAME = 'zen-bot';

// Runtime data, secrets and installed modules stay in the deployment folder.
const PRESERVED = new Set(['.git', '.freebuff', '.env', 'node_modules', 'data', 'logs']);

const NODE_DIR = path.dirname(process.execPath);
const PM2_CLI = path.join(NODE_DIR, 'node_modules', 'pm2', 'bin', 'pm2');
const NPM_CLI = path.join(NODE_DIR, 'node_modules', 'npm', 'bin', 'npm-cli.js');
const CHILD_ENV = {
  ...process.env,
  PATH: NODE_DIR + path.delimiter + (process.env.PATH || ''),
};

function log(message) {
  console.log(`[deploy] ${message}`);
}

function fail(message) {
  console.error(`[deploy] ${message}`);
  process.exit(1);
}

function samePath(a, b) {
  return process.platform === 'win32'
    ? a.toLowerCase() === b.toLowerCase()
    : a === b;
}

function sha256(file) {
  if (!fs.existsSync(file)) return null;
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

function run(jsCli, fallback, args, options = {}) {
  const useJs = fs.existsSync(jsCli);
  const result = spawnSync(
    useJs ? process.execPath : fallback,
    useJs ? [jsCli, ...args] : args,
    {
      cwd: DEST,
      env: CHILD_ENV,
      stdio: 'inherit',
      shell: !useJs,
      ...options,
    }
  );
  return result.status === 0;
}

function pm2(...args) {
  return run(PM2_CLI, 'pm2', args);
}

function npm(...args) {
  return run(NPM_CLI, 'npm', args);
}

function pm2HasApp() {
  if (!fs.existsSync(PM2_CLI)) return true;
  const result = spawnSync(process.execPath, [PM2_CLI, 'jlist'], {
    env: CHILD_ENV,
    encoding: 'utf8',
  });
  if (result.status !== 0) return true;
  try {
    return JSON.parse(result.stdout).some((app) => app.name === APP_NAME);
  } catch {
    return true;
  }
}

function shouldSync(relative) {
  return !PRESERVED.has(relative.split(path.sep)[0]);
}

function copySource() {
  fs.cpSync(SOURCE, DEST, {
    recursive: true,
    force: true,
    filter: (src) => {
      const relative = path.relative(SOURCE, src);
      return !relative || shouldSync(relative);
    },
  });
}

function pruneStale() {
  let removed = 0;
  const walk = (dir, relativeBase) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const relative = relativeBase
        ? path.join(relativeBase, entry.name)
        : entry.name;
      if (!shouldSync(relative)) continue;
      const sourcePath = path.join(SOURCE, relative);
      const destPath = path.join(dir, entry.name);
      if (!fs.existsSync(sourcePath)) {
        fs.rmSync(destPath, { recursive: true, force: true });
        removed += 1;
      } else if (entry.isDirectory()) {
        walk(destPath, relative);
      }
    }
  };
  walk(DEST, '');
  return removed;
}

if (samePath(SOURCE, DEST)) {
  fail(`refusing to deploy: source and destination are both ${SOURCE}`);
}
if (
  !fs.existsSync(path.join(SOURCE, 'package.json')) ||
  !fs.existsSync(path.join(SOURCE, 'src', 'index.js'))
) {
  fail(`source does not look like the Zen project: ${SOURCE}`);
}
if (
  fs.existsSync(DEST) &&
  (!fs.existsSync(path.join(DEST, 'package.json')) ||
    !fs.existsSync(path.join(DEST, 'src', 'index.js')))
) {
  fail(`destination does not look like the deployed bot: ${DEST}`);
}
if (!fs.existsSync(DEST)) {
  fs.mkdirSync(DEST, { recursive: true });
}

const lockSource = path.join(SOURCE, 'package-lock.json');
const lockDest = path.join(DEST, 'package-lock.json');
const installNeeded =
  !fs.existsSync(path.join(DEST, 'node_modules')) ||
  !sha256(lockSource) ||
  sha256(lockSource) !== sha256(lockDest);

log(`source: ${SOURCE}`);
log(`destination: ${DEST}`);

const appExists = pm2HasApp();
let stopped = false;

try {
  if (installNeeded && appExists) {
    log('stopping the bot before reinstalling dependencies');
    stopped = pm2('stop', APP_NAME);
  }

  log('syncing files');
  copySource();

  const destEnv = path.join(DEST, '.env');
  const sourceEnv = path.join(SOURCE, '.env');
  if (!fs.existsSync(destEnv) && fs.existsSync(sourceEnv)) {
    fs.copyFileSync(sourceEnv, destEnv);
    log('copied .env because the destination had none');
  }

  const removed = pruneStale();
  if (removed) log(`removed ${removed} stale file(s)`);

  if (installNeeded) {
    log('package-lock.json changed; running npm ci');
    if (!npm('ci', '--no-audit', '--no-fund')) {
      throw new Error('npm ci failed');
    }
  } else {
    log('dependencies unchanged; skipping npm ci');
  }

  if (appExists) {
    log(`restarting ${APP_NAME}`);
    if (!pm2('restart', APP_NAME, '--update-env')) {
      throw new Error(`pm2 restart ${APP_NAME} failed`);
    }
  } else {
    log(`starting ${APP_NAME}`);
    if (!pm2('start', 'src/index.js', '--name', APP_NAME, '--time')) {
      throw new Error(`pm2 start ${APP_NAME} failed`);
    }
  }

  log('registering slash commands');
  if (!npm('run', 'deploy')) {
    throw new Error('slash-command registration failed');
  }

  pm2('save');
  pm2('status');
} catch (error) {
  console.error(`[deploy] ${error.message}`);
  if (stopped || installNeeded) {
    log('attempting to bring the bot back up');
    if (appExists) {
      pm2('restart', APP_NAME, '--update-env');
    } else {
      pm2('start', 'src/index.js', '--name', APP_NAME, '--time');
    }
  }
  process.exit(1);
}
