const fs = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const DEFAULT_FILE = path.join(__dirname, '..', '..', 'data', 'levels.json');
const MAX_LEVEL = 500;
const MAX_ENTRIES = 50_000;
const COOLDOWN_MS = 60 * 1000;
const MIN_XP = 25;
const MAX_XP = 35;
const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);

let stateQueue = Promise.resolve();

function levelsFile() {
  return process.env.LEVELS_FILE
    ? path.resolve(process.env.LEVELS_FILE)
    : DEFAULT_FILE;
}

function cleanText(value, maxLength) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

/** XP required to move from `level` to `level + 1`. */
function xpForLevel(level) {
  if (!Number.isInteger(level) || level < 0 || level > MAX_LEVEL) {
    throw new RangeError('level must be a whole number between 0 and 500.');
  }

  return 5 * level * level + 25 * level + 50;
}

/** Total XP required to reach a level from zero. */
function totalXpForLevel(level) {
  if (!Number.isInteger(level) || level < 0 || level > MAX_LEVEL) {
    throw new RangeError('level must be a whole number between 0 and 500.');
  }

  let total = 0;
  for (let current = 0; current < level; current += 1) {
    total += xpForLevel(current);
  }
  return total;
}

/**
 * Converts total XP into a level and the progress towards the next one.
 *
 * @param {number} totalXp
 * @returns {{level: number, intoLevel: number, needed: number, totalXp: number, percent: number}}
 */
function progressFromXp(totalXp) {
  const total = Math.max(0, Math.floor(Number(totalXp) || 0));
  let level = 0;
  let remaining = total;

  while (level < MAX_LEVEL) {
    const needed = xpForLevel(level);
    if (remaining < needed) break;
    remaining -= needed;
    level += 1;
  }

  const needed = level >= MAX_LEVEL ? 0 : xpForLevel(level);

  return {
    level,
    intoLevel: remaining,
    needed,
    totalXp: total,
    percent: needed === 0 ? 1 : remaining / needed,
  };
}

function normalizeEntry(value) {
  if (!value || typeof value !== 'object') return null;

  const guildId = cleanText(value.guildId, 32);
  const userId = cleanText(value.userId, 32);
  const xp = Number(value.xp);
  const lastXpAt = Number(value.lastXpAt);

  if (!guildId || !userId || !Number.isFinite(xp) || xp < 0) return null;

  return {
    guildId,
    userId,
    username: cleanText(value.username, 32) || `User ${userId}`,
    xp: Math.floor(xp),
    lastXpAt: Number.isFinite(lastXpAt) && lastXpAt > 0 ? lastXpAt : 0,
  };
}

async function readState() {
  try {
    const parsed = JSON.parse(await fs.readFile(levelsFile(), 'utf8'));
    const values = Array.isArray(parsed) ? parsed : parsed?.users;
    if (!Array.isArray(values)) throw new Error('level file has an unexpected shape');

    const unique = new Map();
    for (const value of values) {
      const entry = normalizeEntry(value);
      if (!entry) continue;

      const key = `${entry.guildId}:${entry.userId}`;
      const existing = unique.get(key);
      if (!existing || entry.xp > existing.xp) unique.set(key, entry);
    }

    return { version: 1, users: [...unique.values()] };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[levels] Could not read ${levelsFile()}: ${error.message}`);
    }
    return { version: 1, users: [] };
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
  if (state.users.length > MAX_ENTRIES) {
    state.users = state.users
      .sort((a, b) => b.xp - a.xp)
      .slice(0, MAX_ENTRIES);
  }

  const file = levelsFile();
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });

  try {
    await fs.writeFile(
      temporary,
      `${JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        users: state.users,
      }, null, 2)}\n`,
      'utf8',
    );
    await replaceFile(temporary, file);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

/**
 * Serializes XP awards so two messages cannot overwrite the same record.
 * The operation returns `{ value, write }`; cooldown hits skip the disk write.
 *
 * @template T
 * @param {(state: {version: number, users: object[]}) => Promise<{value: T, write?: boolean}>|{value: T, write?: boolean}} operation
 * @returns {Promise<T>}
 */
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

function compareEntries(a, b) {
  return (
    b.xp - a.xp ||
    a.lastXpAt - b.lastXpAt ||
    a.userId.localeCompare(b.userId)
  );
}

function cloneEntry(entry) {
  return entry ? { ...entry } : null;
}

/**
 * Adds chat XP when the user is off cooldown.
 *
 * @param {{guildId: string, userId: string, username?: string, xp?: number, now?: number, random?: () => number}} input
 * @returns {Promise<{awarded: boolean, reason: 'granted'|'cooldown', gain: number, leveledUp: boolean, level: number, profile: object, entry: object}>}
 */
async function awardMessageXp({
  guildId,
  userId,
  username,
  xp,
  now = Date.now(),
  random = Math.random,
}) {
  const guildKey = cleanText(guildId, 32);
  const userKey = cleanText(userId, 32);
  if (!guildKey || !userKey) throw new Error('A guild and user are required to award XP.');

  const timestamp = Number.isFinite(now) ? now : Date.now();
  const gain = Number.isFinite(xp)
    ? Math.min(100, Math.max(1, Math.floor(xp)))
    : MIN_XP + Math.floor(Math.min(0.999999, Math.max(0, random())) * (MAX_XP - MIN_XP + 1));

  return withQueuedState((state) => {
    let entry = state.users.find(
      (candidate) => candidate.guildId === guildKey && candidate.userId === userKey,
    );

    if (entry && timestamp - entry.lastXpAt < COOLDOWN_MS) {
      const profile = progressFromXp(entry.xp);
      return {
        write: false,
        value: {
          awarded: false,
          reason: 'cooldown',
          gain: 0,
          leveledUp: false,
          level: profile.level,
          profile,
          entry: cloneEntry(entry),
        },
      };
    }

    if (!entry) {
      entry = {
        guildId: guildKey,
        userId: userKey,
        username: cleanText(username, 32) || `User ${userKey}`,
        xp: 0,
        lastXpAt: 0,
      };
      state.users.push(entry);
    }

    const oldLevel = progressFromXp(entry.xp).level;
    entry.xp += gain;
    entry.lastXpAt = timestamp;
    if (username) entry.username = cleanText(username, 32) || entry.username;

    const profile = progressFromXp(entry.xp);
    return {
      value: {
        awarded: true,
        reason: 'granted',
        gain,
        leveledUp: profile.level > oldLevel,
        level: profile.level,
        profile,
        entry: cloneEntry(entry),
      },
    };
  });
}

/**
 * @param {string} guildId
 * @param {string} userId
 * @returns {Promise<{entry: object|null, rank: number|null, totalUsers: number, progress: object}>}
 */
async function getProfile(guildId, userId) {
  const state = await readState();
  const guildUsers = state.users
    .filter((entry) => entry.guildId === guildId)
    .sort(compareEntries);

  const entry = guildUsers.find((candidate) => candidate.userId === userId) ?? null;

  return {
    entry,
    rank: entry ? guildUsers.indexOf(entry) + 1 : null,
    totalUsers: guildUsers.length,
    progress: progressFromXp(entry?.xp ?? 0),
  };
}

/**
 * @param {string} guildId
 * @param {number} [limit]
 * @returns {Promise<{entries: object[], totalUsers: number}>}
 */
async function getLeaderboard(guildId, limit = 10) {
  const state = await readState();
  const guildUsers = state.users
    .filter((entry) => entry.guildId === guildId)
    .sort(compareEntries);

  const size = Math.max(1, Math.min(25, Math.floor(limit) || 10));

  return {
    totalUsers: guildUsers.length,
    entries: guildUsers.slice(0, size).map((entry, index) => ({
      ...entry,
      rank: index + 1,
      progress: progressFromXp(entry.xp),
    })),
  };
}

module.exports = {
  COOLDOWN_MS,
  MAX_ENTRIES,
  MAX_LEVEL,
  MAX_XP,
  MIN_XP,
  awardMessageXp,
  getLeaderboard,
  getProfile,
  levelsFile,
  progressFromXp,
  totalXpForLevel,
  xpForLevel,
};
