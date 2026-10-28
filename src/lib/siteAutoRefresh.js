const fs = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const DEFAULT_FILE = path.join(__dirname, '..', '..', 'data', 'sitestatus-autorefresh.json');
const MAX_AUTO_REFRESHES = 50;
const REFRESH_INTERVALS = Object.freeze([5, 15, 30]);
const DEFAULT_REFRESH_INTERVAL = 5;
const SNOWFLAKE = /^[1-9]\d{15,21}$/;
const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);

let saveQueue = Promise.resolve();

function autoRefreshFile() {
  return process.env.SITE_AUTOREFRESH_FILE
    ? path.resolve(process.env.SITE_AUTOREFRESH_FILE)
    : DEFAULT_FILE;
}

function parseRefreshInterval(value) {
  const minutes = Number(value);
  return REFRESH_INTERVALS.includes(minutes) ? minutes : null;
}

function normalizeRefreshInterval(value) {
  return parseRefreshInterval(value) ?? DEFAULT_REFRESH_INTERVAL;
}

function normalizeSubscription(value) {
  if (!value || typeof value !== 'object') return null;

  const messageId = String(value.messageId ?? '');
  const channelId = String(value.channelId ?? '');
  const ownerId = String(value.ownerId ?? '');
  const nextAt = Number(value.nextAt);

  if (!SNOWFLAKE.test(messageId) || !SNOWFLAKE.test(channelId) || !SNOWFLAKE.test(ownerId)) {
    return null;
  }

  return {
    messageId,
    channelId,
    ownerId,
    intervalMinutes: normalizeRefreshInterval(value.intervalMinutes),
    nextAt: Number.isFinite(nextAt) && nextAt > 0 ? nextAt : Date.now(),
  };
}

/**
 * Loads the reports that should keep refreshing. A corrupt or missing file
 * simply starts with no subscriptions so the bot can always boot.
 *
 * @returns {Promise<{messageId: string, channelId: string, ownerId: string, intervalMinutes: number, nextAt: number}[]>}
 */
async function loadSubscriptions() {
  try {
    const parsed = JSON.parse(await fs.readFile(autoRefreshFile(), 'utf8'));
    const values = Array.isArray(parsed) ? parsed : parsed?.subscriptions;
    if (!Array.isArray(values)) throw new Error('auto-refresh file has an unexpected shape');

    const unique = new Map();
    for (const value of values) {
      const subscription = normalizeSubscription(value);
      if (subscription && !unique.has(subscription.messageId)) {
        unique.set(subscription.messageId, subscription);
      }
    }

    return [...unique.values()]
      .sort((a, b) => a.nextAt - b.nextAt)
      .slice(0, MAX_AUTO_REFRESHES);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[siteAutoRefresh] Could not read ${autoRefreshFile()}: ${error.message}`);
    }
    return [];
  }
}

async function replaceStateFile(temporary, file) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await fs.rename(temporary, file);
      return;
    } catch (error) {
      // Windows can briefly refuse to replace a file another process is reading.
      if (!RETRYABLE_RENAME_CODES.has(error.code) || attempt >= 4) throw error;
      await delay(25 * (attempt + 1));
    }
  }
}

/**
 * Persists active subscriptions atomically. Old report IDs are harmless; a
 * failed refresh removes them when the message or channel is no longer there.
 *
 * @param {{messageId: string, channelId: string, ownerId: string, intervalMinutes?: number, nextAt: number}[]} subscriptions
 * @returns {Promise<void>}
 */
function saveSubscriptions(subscriptions) {
  const values = subscriptions
    .map(normalizeSubscription)
    .filter(Boolean)
    .slice(0, MAX_AUTO_REFRESHES);

  const operation = saveQueue.then(async () => {
    const file = autoRefreshFile();
    const temporary = `${file}.${process.pid}.tmp`;

    await fs.mkdir(path.dirname(file), { recursive: true });
    try {
      await fs.writeFile(
        temporary,
        `${JSON.stringify({
          version: 2,
          updatedAt: new Date().toISOString(),
          subscriptions: values,
        }, null, 2)}\n`,
        'utf8',
      );
      await replaceStateFile(temporary, file);
    } catch (error) {
      await fs.rm(temporary, { force: true }).catch(() => {});
      throw error;
    }
  });

  saveQueue = operation.catch(() => {});
  return operation;
}

module.exports = {
  DEFAULT_REFRESH_INTERVAL,
  MAX_AUTO_REFRESHES,
  REFRESH_INTERVALS,
  autoRefreshFile,
  loadSubscriptions,
  normalizeRefreshInterval,
  parseRefreshInterval,
  saveSubscriptions,
};
