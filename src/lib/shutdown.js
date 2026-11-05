const { spawn } = require('node:child_process');

const APP_NAME = 'zen-bot';
const DEFAULT_DELAY_SECONDS = 2;
const MAX_DELAY_SECONDS = 30;

function isPm2(env = process.env) {
  return Boolean(env.pm_id || env.PM2_HOME || env.PM2_USAGE);
}

/** PM2 must stop the app rather than see a clean exit, which it would restart. */
function pm2StopCommand() {
  return {
    command: 'pm2',
    args: ['stop', APP_NAME],
  };
}

/**
 * Stops the bot after the delay. Under PM2 it asks the daemon to stop the app,
 * so autorestart does not bring it back; otherwise it exits the process.
 * The timer, spawn and exit hooks are injectable for tests.
 */
function scheduleShutdown({
  delaySeconds = DEFAULT_DELAY_SECONDS,
  env = process.env,
  platform = process.platform,
  spawnImpl = spawn,
  exit = (code) => process.exit(code),
  timer = setTimeout,
  logger = console,
} = {}) {
  const seconds = Math.min(
    MAX_DELAY_SECONDS,
    Math.max(0, Math.trunc(Number(delaySeconds)) || 0),
  );

  timer(() => {
    if (isPm2(env)) {
      try {
        const { command, args } = pm2StopCommand(platform);
        const child = spawnImpl(command, args, {
          detached: true,
          stdio: 'ignore',
          windowsHide: true,
          // pm2.cmd is a batch file on Windows, so it needs cmd.exe to run.
          shell: platform === 'win32',
        });
        child.on?.('error', (error) => {
          logger.warn(`[shutdown] Could not ask PM2 to stop: ${error.message}`);
          exit(0);
        });
        child.unref?.();
        logger.log('[shutdown] PM2 stop requested from Discord; the bot will stay offline.');
        return;
      } catch (error) {
        logger.warn(`[shutdown] Could not ask PM2 to stop: ${error.message}`);
      }
    }

    logger.log('[shutdown] Shutdown requested from Discord.');
    exit(0);
  }, seconds * 1000);

  return seconds;
}

module.exports = {
  APP_NAME,
  DEFAULT_DELAY_SECONDS,
  MAX_DELAY_SECONDS,
  isPm2,
  pm2StopCommand,
  scheduleShutdown,
};
