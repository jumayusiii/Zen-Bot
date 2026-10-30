const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const DEFAULT_FILE = path.join(__dirname, '..', '..', 'data', 'warnings.json');
const MAX_WARNINGS = 10_000;
const MAX_PER_USER = 100;
const MAX_REASON_LENGTH = 400;
const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);
const SNOWFLAKE = /^\d{15,20}$/;

let stateQueue = Promise.resolve();

function warningsFile() {
  return process.env.WARNINGS_FILE
    ? path.resolve(process.env.WARNINGS_FILE)
    : DEFAULT_FILE;
}

function cleanText(value, maxLength) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeWarning(value) {
  if (!value || typeof value !== 'object') return null;

  const id = cleanText(value.id, 64);
  const guildId = cleanText(value.guildId, 32);
  const userId = cleanText(value.userId, 32);
  const reason = cleanText(value.reason, MAX_REASON_LENGTH);
  const createdAt = Number(value.createdAt);

  if (!id || !SNOWFLAKE.test(guildId) || !SNOWFLAKE.test(userId) || !reason) return null;
  if (!Number.isFinite(createdAt) || createdAt <= 0) return null;

  return {
    id,
    guildId,
    userId,
    username: cleanText(value.username, 32) || `User ${userId}`,
    moderatorId: cleanText(value.moderatorId, 32) || null,
    moderatorName: cleanText(value.moderatorName, 32) || 'Moderator',
    reason,
    createdAt,
  };
}

async function readState() {
  try {
    const parsed = JSON.parse(await fs.readFile(warningsFile(), 'utf8'));
    const values = Array.isArray(parsed) ? parsed : parsed?.warnings;
    if (!Array.isArray(values)) throw new Error('warnings file has an unexpected shape');

    const unique = new Map();
    for (const value of values) {
      const warning = normalizeWarning(value);
      if (warning && !unique.has(warning.id)) unique.set(warning.id, warning);
    }

    return { version: 1, warnings: [...unique.values()] };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[warnings] Could not read ${warningsFile()}: ${error.message}`);
    }
    return { version: 1, warnings: [] };
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
  state.warnings.sort((a, b) => a.createdAt - b.createdAt);
  if (state.warnings.length > MAX_WARNINGS) {
    state.warnings = state.warnings.slice(-MAX_WARNINGS);
  }

  const file = warningsFile();
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });

  try {
    await fs.writeFile(
      temporary,
      `${JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        warnings: state.warnings,
      }, null, 2)}\n`,
      'utf8',
    );
    await replaceFile(temporary, file);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

function withState(operation, write = true) {
  const run = stateQueue.then(async () => {
    const state = await readState();
    const result = await operation(state);
    if (write) await writeState(state);
    return result;
  });

  stateQueue = run.catch(() => {});
  return run;
}

function cloneWarning(warning) {
  return warning ? { ...warning } : null;
}

/**
 * Records one warning for a member.
 *
 * @param {{guildId: string, userId: string, username?: string, moderatorId?: string, moderatorName?: string, reason: string}} input
 * @returns {Promise<object>}
 */
async function addWarning(input) {
  const guildId = cleanText(input.guildId, 32);
  const userId = cleanText(input.userId, 32);
  const reason = cleanText(input.reason, MAX_REASON_LENGTH);

  if (!SNOWFLAKE.test(guildId) || !SNOWFLAKE.test(userId)) {
    throw new Error('A valid server and member are required to add a warning.');
  }
  if (!reason) throw new Error('A reason is required for a warning.');

  const warning = {
    id: crypto.randomUUID(),
    guildId,
    userId,
    username: cleanText(input.username, 32) || `User ${userId}`,
    moderatorId: cleanText(input.moderatorId, 32) || null,
    moderatorName: cleanText(input.moderatorName, 32) || 'Moderator',
    reason,
    createdAt: Date.now(),
  };

  await withState((state) => {
    const total = state.warnings.filter(
      (item) => item.guildId === guildId && item.userId === userId,
    ).length;

    if (total >= MAX_PER_USER) {
      throw new Error(`This member already has ${MAX_PER_USER} warnings.`);
    }

    state.warnings.push(warning);
  });

  return cloneWarning(warning);
}

/**
 * Returns a member's warnings, newest first.
 *
 * @param {string} guildId
 * @param {string} userId
 * @returns {Promise<object[]>}
 */
async function listWarnings(guildId, userId) {
  return withState(
    (state) => state.warnings
      .filter((warning) => warning.guildId === String(guildId) && warning.userId === String(userId))
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(cloneWarning),
    false,
  );
}

/**
 * Counts a member's warnings.
 *
 * @param {string} guildId
 * @param {string} userId
 * @returns {Promise<number>}
 */
async function countWarnings(guildId, userId) {
  return withState(
    (state) => state.warnings.filter(
      (warning) => warning.guildId === String(guildId) && warning.userId === String(userId),
    ).length,
    false,
  );
}

/**
 * Clears every warning for a member, or one specific warning when an id is
 * supplied.
 *
 * @param {string} guildId
 * @param {string} userId
 * @param {string|null} [warningId]
 * @returns {Promise<{removed: object[]}>}
 */
async function clearWarnings(guildId, userId, warningId = null) {
  const guildKey = String(guildId);
  const userKey = String(userId);
  const targetId = warningId ? String(warningId) : null;

  return withState((state) => {
    const removed = state.warnings.filter(
      (warning) =>
        warning.guildId === guildKey &&
        warning.userId === userKey &&
        (!targetId || warning.id === targetId),
    );

    state.warnings = state.warnings.filter((warning) => !removed.includes(warning));
    return { removed: removed.map(cloneWarning) };
  });
}

module.exports = {
  MAX_PER_USER,
  MAX_REASON_LENGTH,
  MAX_WARNINGS,
  addWarning,
  clearWarnings,
  countWarnings,
  listWarnings,
  warningsFile,
};
