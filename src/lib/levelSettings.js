const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const DEFAULT_FILE = path.join(__dirname, '..', '..', 'data', 'level-settings.json');
const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);

let cache = null;
let writeQueue = Promise.resolve();

function settingsFile() {
  return process.env.LEVEL_SETTINGS_FILE
    ? path.resolve(process.env.LEVEL_SETTINGS_FILE)
    : DEFAULT_FILE;
}

function cleanText(value, maxLength) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeEntry(value) {
  if (!value || typeof value !== 'object' || value.enabled !== false) return null;

  return {
    enabled: false,
    updatedBy: cleanText(value.updatedBy, 32) || null,
    updatedAt: Number.isFinite(Number(value.updatedAt))
      ? Number(value.updatedAt)
      : Date.now(),
  };
}

function normalizeState(value) {
  const guilds = {};
  const source = value && typeof value === 'object' ? value.guilds : null;

  if (source && typeof source === 'object' && !Array.isArray(source)) {
    for (const [guildId, entry] of Object.entries(source)) {
      const id = cleanText(guildId, 32);
      if (!id) continue;
      const normalized = normalizeEntry(entry);
      if (normalized) guilds[id] = normalized;
    }
  }

  return { version: 1, guilds };
}

/**
 * Loads the disabled-server list once per process. Level checks happen on
 * every message, so the hot path must stay synchronous after the first read.
 */
function loadSettings() {
  if (cache) return cache;

  try {
    const parsed = JSON.parse(fs.readFileSync(settingsFile(), 'utf8'));
    cache = normalizeState(parsed);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[levels] Could not read ${settingsFile()}: ${error.message}`);
    }
    cache = normalizeState(null);
  }

  return cache;
}

function resetLevelSettingsCache() {
  cache = null;
}

function isLevelSystemDisabled(guildId) {
  const id = cleanText(guildId, 32);
  if (!id) return false;
  return loadSettings().guilds[id]?.enabled === false;
}

function getLevelSystemSettings(guildId) {
  const id = cleanText(guildId, 32);
  const entry = id ? loadSettings().guilds[id] : null;

  return {
    guildId: id || null,
    enabled: !entry,
    updatedBy: entry?.updatedBy ?? null,
    updatedAt: entry?.updatedAt ?? null,
  };
}

async function replaceFile(temporary, file) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await fsp.rename(temporary, file);
      return;
    } catch (error) {
      if (!RETRYABLE_RENAME_CODES.has(error.code) || attempt >= 4) throw error;
      await delay(25 * (attempt + 1));
    }
  }
}

async function writeState(state) {
  const file = settingsFile();
  const temporary = `${file}.${process.pid}.tmp`;
  await fsp.mkdir(path.dirname(file), { recursive: true });

  try {
    await fsp.writeFile(
      temporary,
      `${JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        guilds: state.guilds,
      }, null, 2)}\n`,
      'utf8',
    );
    await replaceFile(temporary, file);
  } catch (error) {
    await fsp.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

/**
 * Persists a server's level-system switch. Disabling writes one small entry;
 * enabling removes it so the default stays enabled for every other server.
 *
 * @param {string} guildId
 * @param {boolean} enabled
 * @param {string|null} [updatedBy]
 * @returns {Promise<{guildId: string, enabled: boolean, changed: boolean}>}
 */
async function setLevelSystemEnabled(guildId, enabled, updatedBy = null) {
  const id = cleanText(guildId, 32);
  if (!id) throw new Error('A server is required to change the level system.');

  const desired = Boolean(enabled);
  const run = writeQueue.then(async () => {
    const current = loadSettings();
    const changed = desired ? Boolean(current.guilds[id]) : !current.guilds[id];

    if (!changed) return { guildId: id, enabled: desired, changed: false };

    const next = normalizeState(current);
    if (desired) {
      delete next.guilds[id];
    } else {
      next.guilds[id] = {
        enabled: false,
        updatedBy: cleanText(updatedBy, 32) || null,
        updatedAt: Date.now(),
      };
    }

    await writeState(next);
    cache = next;
    return { guildId: id, enabled: desired, changed: true };
  });

  writeQueue = run.catch(() => {});
  return run;
}

module.exports = {
  getLevelSystemSettings,
  isLevelSystemDisabled,
  resetLevelSettingsCache,
  setLevelSystemEnabled,
  settingsFile,
};
