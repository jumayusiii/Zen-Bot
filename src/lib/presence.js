const { ActivityType } = require('discord.js');
const { presenceText } = require('./config');

const REFRESH_MS = 10 * 60 * 1000;

/** The presence payload used both at login and by the refresh helper. */
function buildPresence() {
  return {
    status: 'online',
    activities: [
      {
        name: presenceText(),
        type: ActivityType.Playing,
      },
    ],
  };
}

/**
 * Applies the Playing activity. Returns false instead of throwing when the
 * client is not logged in yet or the gateway rejects the update.
 *
 * @param {import('discord.js').Client} client
 * @param {Console} [logger]
 */
function applyPresence(client, logger = console) {
  if (typeof client?.user?.setPresence !== 'function') return false;

  try {
    client.user.setPresence(buildPresence());
    return true;
  } catch (error) {
    logger.warn(`[presence] Could not update the rich presence: ${error.message}`);
    return false;
  }
}

/**
 * Sets the presence once and then periodically re-applies it. Discord can drop
 * an activity after a gateway resume, so this keeps "Playing I am Legend."
 * visible without requiring a bot restart.
 *
 * @param {import('discord.js').Client} client
 * @param {{intervalMs?: number, logger?: Console}} [options]
 * @returns {NodeJS.Timeout|null}
 */
function startPresence(client, { intervalMs = REFRESH_MS, logger = console } = {}) {
  if (!applyPresence(client, logger)) {
    logger.warn('[presence] Bot user is not ready; the rich presence was not set.');
    return null;
  }

  logger.log(`[bot] Rich presence set: Playing ${buildPresence().activities[0].name}`);

  const timer = setInterval(() => {
    applyPresence(client, logger);
  }, intervalMs);
  timer.unref?.();
  return timer;
}

module.exports = {
  REFRESH_MS,
  applyPresence,
  buildPresence,
  startPresence,
};
