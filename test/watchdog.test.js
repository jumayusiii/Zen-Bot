const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  acquireLock,
  findPm2DaemonPids,
  main,
  parseArgs,
  readState,
  recoverPm2,
  releaseLock,
  restartApp,
  runPm2,
  trackedPids,
} = require('../scripts/watchdog');

function tempDir(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zen-watchdog-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  return directory;
}

function writePid(directory, name, pid) {
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, name), `${pid}\n`, 'utf8');
}

test('watchdog options parse defaults and custom files', () => {
  const defaults = parseArgs([]);
  assert.equal(defaults.app, 'zen-bot');
  assert.equal(defaults.threshold, 2);
  assert.equal(defaults.timeout, 90);
  assert.match(defaults.lockFile, /watchdog\.lock$/);

  const custom = parseArgs([
    '--app', 'custom-bot',
    '--threshold', '4',
    '--timeout', '30',
    '--state-file', 'tmp/state.json',
    '--log-file', 'tmp/log.txt',
    '--lock-file', 'tmp/lock',
  ]);
  assert.equal(custom.app, 'custom-bot');
  assert.equal(custom.threshold, 4);
  assert.equal(custom.timeout, 30);
  assert.equal(custom.stateFile, path.resolve('tmp/state.json'));
  assert.equal(custom.logFile, path.resolve('tmp/log.txt'));
  assert.equal(custom.lockFile, path.resolve('tmp/lock'));
  assert.throws(() => parseArgs(['--unknown']), /unknown option/);
});

test('PM2 timeouts are reported as timeouts instead of ordinary failures', () => {
  const result = runPm2(['jlist'], {
    timeoutMs: 1000,
    spawnImpl: () => ({
      status: null,
      signal: 'SIGTERM',
      stdout: '',
      stderr: '',
      error: Object.assign(new Error('spawnSync node ETIMEDOUT'), { code: 'ETIMEDOUT' }),
    }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.timedOut, true);
  assert.match(result.message, /timed out after 1s/);
});

test('restartApp keeps the PM2 restart command bounded', () => {
  const calls = [];
  const result = restartApp('zen-bot', {
    spawnImpl: (command, args, options) => {
      calls.push({ command, args, options });
      return { status: 0, stdout: '', stderr: '', error: null };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(calls.length, 1);
  assert.ok(calls[0].args.includes('restart'));
  assert.ok(calls[0].args.includes('zen-bot'));
  assert.equal(calls[0].options.timeout, 25_000);
});

test('trackedPids includes the PM2 daemon and only this app process', (t) => {
  const home = tempDir(t);
  writePid(home, 'pm2.pid', 41001);
  writePid(path.join(home, 'pids'), 'zen-bot-0.pid', 41002);
  writePid(path.join(home, 'pids'), 'zen-bot-1.pid', 41003);
  writePid(path.join(home, 'pids'), 'another-app-0.pid', 41004);

  assert.deepEqual(
    trackedPids('zen-bot', { PM2_HOME: home }).sort((a, b) => a - b),
    [41001, 41002, 41003],
  );
});

test('running PM2 daemons are discovered from the process table', () => {
  const pids = findPm2DaemonPids({
    platform: 'win32',
    spawnImpl: () => ({
      status: 0,
      error: null,
      stderr: '',
      stdout: [
        'CommandLine=node C:\\bot\\node_modules\\pm2\\lib\\Daemon.js',
        'ParentProcessId=1',
        'ProcessId=43001',
        '',
        'CommandLine=node C:\\bot\\src\\index.js',
        'ParentProcessId=1',
        'ProcessId=43002',
        '',
      ].join('\r\n'),
    }),
  });

  assert.deepEqual(pids, [43001]);
});

test('the overlap lock refuses a live holder and can be released', (t) => {
  const directory = tempDir(t);
  const file = path.join(directory, 'watchdog.lock');

  const first = acquireLock(file, { now: 1000, pid: 111, isAlive: () => true });
  assert.equal(first.ok, true);

  const second = acquireLock(file, { now: 2000, pid: 222, isAlive: () => true });
  assert.equal(second.ok, false);
  assert.equal(second.holder.pid, 111);

  releaseLock(file, 111);
  const third = acquireLock(file, { now: 3000, pid: 333, isAlive: () => true });
  assert.equal(third.ok, true);
  releaseLock(file, 333);
});

test('a stale lock is replaced', (t) => {
  const directory = tempDir(t);
  const file = path.join(directory, 'watchdog.lock');
  fs.writeFileSync(file, JSON.stringify({ pid: 999, startedAt: 1000 }), 'utf8');

  const lock = acquireLock(file, { now: 1000 + 11 * 60 * 1000, pid: 123, isAlive: () => false });
  assert.equal(lock.ok, true);
  releaseLock(file, 123);
});

test('a timed-out PM2 daemon is force-stopped, restarted and saved', (t) => {
  const home = tempDir(t);
  writePid(home, 'pm2.pid', 42001);
  writePid(path.join(home, 'pids'), 'zen-bot-0.pid', 42002);

  const calls = [];
  const killed = [];
  const result = recoverPm2('zen-bot', {
    env: { PM2_HOME: home },
    platform: 'win32',
    spawnImpl: (command, args, options) => {
      calls.push({ command, args, options });
      if (args.includes('kill')) {
        return {
          status: null,
          signal: 'SIGTERM',
          stdout: '',
          stderr: '',
          error: Object.assign(new Error('spawnSync node ETIMEDOUT'), { code: 'ETIMEDOUT' }),
        };
      }
      return { status: 0, stdout: '', stderr: '', error: null };
    },
    killPidImpl: (pid) => {
      killed.push(pid);
      return { ok: true };
    },
    isAlive: () => true,
    waitForExitImpl: () => [],
    discoverDaemonPids: () => [42003],
    logger: { log: () => {}, warn: () => {} },
  });

  assert.equal(result.ok, true);
  assert.deepEqual(killed, [42001, 42002, 42003]);
  assert.deepEqual(
    calls.map(({ args }) => args.find((arg) => ['kill', 'start', 'save'].includes(arg))),
    ['kill', 'start', 'save'],
  );
  const start = calls.find(({ args }) => args.includes('start'));
  assert.ok(start.args.includes(path.resolve(__dirname, '..', 'src', 'index.js')));
  assert.ok(start.args.includes('--name'));
  assert.ok(start.args.includes('zen-bot'));
});

test('a wedged PM2 daemon triggers clean recovery and login verification', (t) => {
  const directory = tempDir(t);
  const stateFile = path.join(directory, 'state.json');
  const logFile = path.join(directory, 'watchdog.log');
  const lockFile = path.join(directory, 'watchdog.lock');
  const args = [
    '--app', 'zen-bot',
    '--threshold', '2',
    '--state-file', stateFile,
    '--log-file', logFile,
    '--lock-file', lockFile,
  ];

  let checks = 0;
  let restarts = 0;
  let recoveries = 0;
  const deps = {
    now: () => 1000,
    checkHealth: () => {
      checks += 1;
      return checks < 3
        ? { ok: false, problem: 'pm2 jlist timed out' }
        : { ok: true };
    },
    restartApp: () => {
      restarts += 1;
      return { ok: false, timedOut: true, message: 'pm2 restart timed out' };
    },
    recoverPm2: () => {
      recoveries += 1;
      return { ok: true };
    },
  };

  assert.equal(main(args, deps), 1);
  assert.equal(main(args, deps), 0);

  const state = readState(stateFile);
  assert.equal(checks, 3);
  assert.equal(restarts, 1);
  assert.equal(recoveries, 1);
  assert.equal(state.failures, 0);
  assert.equal(state.restarts, 1);
  assert.equal(state.lastProblem, null);
  assert.match(fs.readFileSync(logFile, 'utf8'), /clean PM2 daemon/);
});

test('an overlapping watchdog run exits without checking the bot', (t) => {
  const directory = tempDir(t);
  const lockFile = path.join(directory, 'watchdog.lock');
  fs.writeFileSync(lockFile, JSON.stringify({ pid: process.pid, startedAt: Date.now() }), 'utf8');

  let checks = 0;
  const result = main(
    ['--lock-file', lockFile],
    {
      checkHealth: () => {
        checks += 1;
        return { ok: true };
      },
    },
  );

  assert.equal(result, 0);
  assert.equal(checks, 0);
});
