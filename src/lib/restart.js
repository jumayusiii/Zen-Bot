const DEFAULT_DELAY_SECONDS = 3;
const MAX_DELAY_SECONDS = 30;

/** Clamps the requested delay to a range that leaves time to send the reply. */
function parseDelay(value, fallback = DEFAULT_DELAY_SECONDS) {
  if (value === null || value === undefined || value === '') return fallback;

  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return fallback;

  return Math.min(MAX_DELAY_SECONDS, Math.max(0, Math.trunc(seconds)));
}

/** True when a process manager is expected to bring the bot back up. */
function isSupervised(env = process.env) {
  return Boolean(env.pm_id || env.PM2_HOME || env.PM2_USAGE);
}

/**
 * Exits the process after the delay, which lets PM2 start a fresh instance.
 * The timer and exit hook are injectable so tests never end the test runner.
 */
function scheduleRestart({
  delaySeconds = DEFAULT_DELAY_SECONDS,
  timer = setTimeout,
  exit = (code) => process.exit(code),
  logger = console,
} = {}) {
  const delay = parseDelay(delaySeconds);

  timer(() => {
    logger.log('[restart] Restart requested from Discord.');
    exit(0);
  }, delay * 1000);

  return delay;
}

module.exports = {
  DEFAULT_DELAY_SECONDS,
  MAX_DELAY_SECONDS,
  isSupervised,
  parseDelay,
  scheduleRestart,
};
