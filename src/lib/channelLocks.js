const fs = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const DEFAULT_FILE = path.join(__dirname, '..', '..', 'data', 'channel-locks.json');
const SNOWFLAKE = /^\d{15,20}$/;
const PERMISSION_STATES = new Set(['allow', 'deny', 'inherit']);
const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);

let stateQueue = Promise.resolve();

function channelLocksFile() {
  return process.env.CHANNEL_LOCKS_FILE
    ? path.resolve(process.env.CHANNEL_LOCKS_FILE)
    : DEFAULT_FILE;
}

function cleanText(value, maxLength) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeLock(value) {
  if (!value || typeof value !== 'object') return null;

  const guildId = cleanText(value.guildId, 32);
  const channelId = cleanText(value.channelId, 32);
  const previous = cleanText(value.previous, 16);
  const lockedAt = Number(value.lockedAt);

  if (!SNOWFLAKE.test(guildId) || !SNOWFLAKE.test(channelId)) return null;
  if (!PERMISSION_STATES.has(previous)) return null;
  if (!Number.isFinite(lockedAt) || lockedAt <= 0) return null;

  return {
    guildId,
    channelId,
    previous,
    moderatorId: cleanText(value.moderatorId, 32) || null,
    reason: cleanText(value.reason, 400) || 'No reason provided',
    lockedAt,
  };
}

async function readState() {
  try {
    const parsed = JSON.parse(await fs.readFile(channelLocksFile(), 'utf8'));
    const values = Array.isArray(parsed) ? parsed : parsed?.locks;
    if (!Array.isArray(values)) throw new Error('channel-lock file has an unexpected shape');

    const unique = new Map();
    for (const value of values) {
      const lock = normalizeLock(value);
      if (!lock) continue;
      unique.set(`${lock.guildId}:${lock.channelId}`, lock);
    }

    return { version: 1, locks: [...unique.values()] };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[channelLocks] Could not read ${channelLocksFile()}: ${error.message}`);
    }
    return { version: 1, locks: [] };
  }
}

async function replaceFile(temporary, file) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await fs.rename(temporary, file);
      return;
    } catch (error) {
      if (!RETRYABLE_RENAME_CODES.has(error.code) || attempt >= 4) throw error;
      await delay(25 * (attempt + 1));
    }
  }
}

async function writeState(state) {
  const file = channelLocksFile();
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });

  try {
    await fs.writeFile(
      temporary,
      `${JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        locks: state.locks,
      }, null, 2)}\n`,
      'utf8',
    );
    await replaceFile(temporary, file);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

function withState(operation) {
  const run = stateQueue.then(async () => {
    const state = await readState();
    const result = await operation(state);
    await writeState(state);
    return result;
  });

  stateQueue = run.catch(() => {});
  return run;
}

function cloneLock(lock) {
  return lock ? { ...lock } : null;
}

/** Returns the saved lock for one channel, if Zen locked it. */
async function getChannelLock(guildId, channelId) {
  const state = await readState();
  const lock = state.locks.find(
    (entry) => entry.guildId === String(guildId) && entry.channelId === String(channelId),
  );

  return cloneLock(lock);
}

/**
 * Saves the previous @everyone SendMessages state before a channel is locked.
 *
 * @param {{guildId: string, channelId: string, previous: string, moderatorId?: string, reason?: string, now?: number}} input
 * @returns {Promise<object>}
 */
async function saveChannelLock(input) {
  const guildId = cleanText(input.guildId, 32);
  const channelId = cleanText(input.channelId, 32);
  const previous = cleanText(input.previous, 16);

  if (!SNOWFLAKE.test(guildId) || !SNOWFLAKE.test(channelId)) {
    throw new Error('A valid server and channel are required to lock a channel.');
  }
  if (!PERMISSION_STATES.has(previous)) {
    throw new Error('The previous permission state is invalid.');
  }

  const lock = {
    guildId,
    channelId,
    previous,
    moderatorId: cleanText(input.moderatorId, 32) || null,
    reason: cleanText(input.reason, 400) || 'No reason provided',
    lockedAt: Number.isFinite(Number(input.now)) ? Number(input.now) : Date.now(),
  };

  await withState((state) => {
    state.locks = state.locks.filter(
      (entry) => entry.guildId !== guildId || entry.channelId !== channelId,
    );
    state.locks.push(lock);
  });

  return cloneLock(lock);
}

/** Removes a saved lock after the channel has been restored. */
async function clearChannelLock(guildId, channelId) {
  return withState((state) => {
    const existing = state.locks.find(
      (entry) => entry.guildId === String(guildId) && entry.channelId === String(channelId),
    );

    state.locks = state.locks.filter(
      (entry) => entry.guildId !== String(guildId) || entry.channelId !== String(channelId),
    );

    return cloneLock(existing);
  });
}

module.exports = {
  channelLocksFile,
  clearChannelLock,
  getChannelLock,
  saveChannelLock,
};
