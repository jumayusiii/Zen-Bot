const fs = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const DEFAULT_FILE = path.join(__dirname, '..', '..', 'data', 'weather-preferences.json');
const MAX_USERS = 100_000;
const USER_ID_PATTERN = /^\d{17,20}$/;
const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);

let stateQueue = Promise.resolve();

function weatherPreferencesFile() {
  return process.env.WEATHER_PREFERENCES_FILE
    ? path.resolve(process.env.WEATHER_PREFERENCES_FILE)
    : DEFAULT_FILE;
}

function cleanUserId(value) {
  const userId = String(value ?? '').trim();
  return USER_ID_PATTERN.test(userId) ? userId : null;
}

function normalizeState(parsed) {
  const values = Array.isArray(parsed) ? parsed : parsed?.users;
  if (!Array.isArray(values)) throw new Error('weather preference file has an unexpected shape');

  const users = new Set();
  for (const value of values) {
    const userId = cleanUserId(typeof value === 'string' ? value : value?.userId);
    if (!userId) continue;
    users.add(userId);
    if (users.size >= MAX_USERS) break;
  }

  return { version: 1, users: [...users] };
}

async function readState() {
  try {
    return normalizeState(JSON.parse(await fs.readFile(weatherPreferencesFile(), 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[weather] Could not read ${weatherPreferencesFile()}: ${error.message}`);
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
  const file = weatherPreferencesFile();

  if (state.users.length === 0) {
    await fs.rm(file, { force: true }).catch(() => {});
    return;
  }

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

/** Whether this member has opted into private weather replies. */
async function isWeatherPrivate(userId) {
  const id = cleanUserId(userId);
  if (!id) return false;
  return withState((state) => state.users.includes(id), false);
}

/**
 * Remembers a member's weather privacy choice until they explicitly turn it
 * off. A false choice removes the saved entry instead of keeping a false flag.
 */
async function setWeatherPrivate(userId, enabled) {
  const id = cleanUserId(userId);
  if (!id) throw new Error('A valid Discord user ID is required to save a weather preference.');

  const privateMode = enabled === true;
  return withState((state) => {
    const users = new Set(state.users);
    if (privateMode) users.add(id);
    else users.delete(id);
    state.users = [...users];
    return privateMode;
  });
}

module.exports = {
  isWeatherPrivate,
  setWeatherPrivate,
  weatherPreferencesFile,
};
