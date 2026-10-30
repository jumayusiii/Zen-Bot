const fs = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const DEFAULT_FILE = path.join(__dirname, '..', '..', 'data', 'typerace.json');
const MAX_ENTRIES = 25_000;
const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);

let stateQueue = Promise.resolve();

function leaderboardFile() {
  return process.env.TYPERACE_FILE
    ? path.resolve(process.env.TYPERACE_FILE)
    : DEFAULT_FILE;
}

function cleanText(value, maxLength) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeEntry(value) {
  if (!value || typeof value !== 'object') return null;

  const guildId = cleanText(value.guildId, 32);
  const userId = cleanText(value.userId, 32);
  const bestMs = Math.floor(Number(value.bestMs));
  const achievedAt = Number(value.achievedAt);

  if (!guildId || !userId || !Number.isFinite(bestMs) || bestMs <= 0) return null;

  return {
    guildId,
    userId,
    username: cleanText(value.username, 32) || `User ${userId}`,
    bestMs,
    wpm: Math.max(0, Math.floor(Number(value.wpm) || 0)),
    phrase: cleanText(value.phrase, 80),
    achievedAt: Number.isFinite(achievedAt) && achievedAt > 0 ? achievedAt : 0,
  };
}

async function readState() {
  try {
    const parsed = JSON.parse(await fs.readFile(leaderboardFile(), 'utf8'));
    const values = Array.isArray(parsed) ? parsed : parsed?.entries;
    if (!Array.isArray(values)) throw new Error('type race file has an unexpected shape');

    const unique = new Map();
    for (const value of values) {
      const entry = normalizeEntry(value);
      if (!entry) continue;

      const key = `${entry.guildId}:${entry.userId}`;
      const existing = unique.get(key);
      if (!existing || entry.bestMs < existing.bestMs) unique.set(key, entry);
    }

    return { version: 1, entries: [...unique.values()] };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[typerace] Could not read ${leaderboardFile()}: ${error.message}`);
    }
    return { version: 1, entries: [] };
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
  if (state.entries.length > MAX_ENTRIES) {
    state.entries = state.entries
      .sort(compareEntries)
      .slice(0, MAX_ENTRIES);
  }

  const file = leaderboardFile();
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });

  try {
    await fs.writeFile(
      temporary,
      `${JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        entries: state.entries,
      }, null, 2)}\n`,
      'utf8',
    );
    await replaceFile(temporary, file);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

function withQueuedState(operation) {
  const run = stateQueue.then(async () => {
    const state = await readState();
    const outcome = await operation(state);
    if (outcome.write !== false) await writeState(state);
    return outcome.value;
  });

  stateQueue = run.catch(() => {});
  return run;
}

function compareEntries(first, second) {
  return (
    first.bestMs - second.bestMs ||
    second.wpm - first.wpm ||
    first.achievedAt - second.achievedAt ||
    first.userId.localeCompare(second.userId)
  );
}

function cloneEntry(entry) {
  return entry ? { ...entry } : null;
}

/**
 * Saves a run only when it is faster than the member's existing personal best.
 * A slower run leaves the file untouched.
 *
 * @param {{guildId: string, userId: string, username?: string, elapsedMs: number, wpm?: number, phrase?: string, achievedAt?: number}} input
 * @returns {Promise<{entry: object, improved: boolean, previousBestMs: number|null}>}
 */
async function recordRace({
  guildId,
  userId,
  username,
  elapsedMs,
  wpm,
  phrase,
  achievedAt = Date.now(),
}) {
  const guildKey = cleanText(guildId, 32);
  const userKey = cleanText(userId, 32);
  const time = Math.floor(Number(elapsedMs));

  if (!guildKey || !userKey) throw new Error('A guild and user are required to save a Type Race time.');
  if (!Number.isFinite(time) || time <= 0) throw new RangeError('Type Race time must be positive.');

  const timestamp = Number.isFinite(achievedAt) && achievedAt > 0 ? achievedAt : Date.now();
  const displayName = cleanText(username, 32) || `User ${userKey}`;
  const speed = Math.max(0, Math.floor(Number(wpm) || 0));
  const wording = cleanText(phrase, 80);

  return withQueuedState((state) => {
    let entry = state.entries.find(
      (candidate) => candidate.guildId === guildKey && candidate.userId === userKey,
    );

    if (!entry) {
      entry = {
        guildId: guildKey,
        userId: userKey,
        username: displayName,
        bestMs: time,
        wpm: speed,
        phrase: wording,
        achievedAt: timestamp,
      };
      state.entries.push(entry);

      return {
        value: { entry: cloneEntry(entry), improved: true, previousBestMs: null },
      };
    }

    const previousBestMs = entry.bestMs;

    if (time >= previousBestMs) {
      return {
        write: false,
        value: { entry: cloneEntry(entry), improved: false, previousBestMs },
      };
    }

    Object.assign(entry, {
      username: displayName,
      bestMs: time,
      wpm: speed,
      phrase: wording,
      achievedAt: timestamp,
    });

    return {
      value: { entry: cloneEntry(entry), improved: true, previousBestMs },
    };
  });
}

/**
 * @param {string} guildId
 * @param {number} [limit]
 * @returns {Promise<{entries: object[], totalUsers: number}>}
 */
async function getLeaderboard(guildId, limit = 10) {
  const guildKey = cleanText(guildId, 32);
  const size = Math.max(1, Math.min(25, Math.floor(limit) || 10));
  if (!guildKey) return { entries: [], totalUsers: 0 };

  const state = await readState();
  const entries = state.entries
    .filter((entry) => entry.guildId === guildKey)
    .sort(compareEntries);

  return {
    totalUsers: entries.length,
    entries: entries.slice(0, size).map((entry, index) => ({
      ...entry,
      rank: index + 1,
    })),
  };
}

/**
 * @param {string} guildId
 * @param {string} userId
 * @returns {Promise<{entry: object|null, rank: number|null, totalUsers: number}>}
 */
async function getStanding(guildId, userId) {
  const guildKey = cleanText(guildId, 32);
  if (!guildKey) return { entry: null, rank: null, totalUsers: 0 };

  const state = await readState();
  const entries = state.entries
    .filter((entry) => entry.guildId === guildKey)
    .sort(compareEntries);
  const index = entries.findIndex((entry) => entry.userId === userId);

  return {
    entry: index >= 0 ? cloneEntry(entries[index]) : null,
    rank: index >= 0 ? index + 1 : null,
    totalUsers: entries.length,
  };
}

module.exports = {
  MAX_ENTRIES,
  getLeaderboard,
  getStanding,
  leaderboardFile,
  recordRace,
};
