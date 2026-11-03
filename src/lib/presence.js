const fs = require('node:fs/promises');
const path = require('node:path');
const { ActivityType } = require('discord.js');
const { presenceText } = require('./config');

const REFRESH_MS = 10 * 60 * 1000;
const DEFAULT_FILE = path.join(__dirname, '..', '..', 'data', 'presence.json');
const MAX_TEXT_LENGTH = 128;

const ACTIVITY_TYPES = Object.freeze({
  playing: ActivityType.Playing,
  watching: ActivityType.Watching,
  listening: ActivityType.Listening,
  competing: ActivityType.Competing,
  streaming: ActivityType.Streaming,
});

const ACTIVITY_LABELS = Object.freeze({
  playing: 'Playing',
  watching: 'Watching',
  listening: 'Listening',
  competing: 'Competing',
  streaming: 'Streaming',
});

let override = null;
let presenceQueue = Promise.resolve();

function presenceFile() {
  return process.env.PRESENCE_FILE
    ? path.resolve(process.env.PRESENCE_FILE)
    : DEFAULT_FILE;
}

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, MAX_TEXT_LENGTH);
}

function normalizeType(value) {
  const key = String(value ?? '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(ACTIVITY_TYPES, key) ? key : null;
}

function httpUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(String(value).trim());
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href;
  } catch {
    return null;
  }
}

function normalizeOverride(value) {
  if (!value || typeof value !== 'object') return null;

  const text = cleanText(value.text);
  const type = normalizeType(value.type) ?? 'playing';
  const url = type === 'streaming' ? httpUrl(value.url) : null;
  if (!text) return null;
  if (type === 'streaming' && !url) return null;

  return {
    text,
    type,
    url,
    updatedAt: Number(value.updatedAt) || 0,
    updatedBy: String(value.updatedBy ?? '').slice(0, 32),
  };
}

/** The activity currently in use: the developer override, else the configured default. */
function presenceState() {
  if (override) return { ...override };
  return { text: presenceText(), type: 'playing', url: null, updatedAt: 0, updatedBy: '' };
}

function activityFor(state) {
  const activity = {
    name: state.text,
    type: ACTIVITY_TYPES[state.type] ?? ActivityType.Playing,
  };

  if (state.type === 'streaming' && state.url) activity.url = state.url;
  return activity;
}

/** The presence payload used both at login and by the refresh helper. */
function buildPresence() {
  return {
    status: 'online',
    activities: [activityFor(presenceState())],
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

function queueWrite(operation) {
  const run = presenceQueue.then(operation);
  presenceQueue = run.catch(() => {});
  return run;
}

async function writeOverrideFile() {
  const file = presenceFile();

  if (!override) {
    await fs.rm(file, { force: true }).catch(() => {});
    return;
  }

  const temporary = `${file}.${process.pid}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });

  try {
    await fs.writeFile(temporary, `${JSON.stringify(override, null, 2)}\n`, 'utf8');
    await fs.rename(temporary, file);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

/**
 * Replaces the presence with a developer override and persists it, so a
 * restart keeps the text instead of silently falling back to PRESENCE_TEXT.
 *
 * @param {{text?: string|null, type?: string|null, url?: string|null, userId?: string}} [patch]
 * @returns {Promise<object>} the presence state that is now active
 */
async function setPresenceOverride({ text, type, url, userId = '' } = {}) {
  const current = presenceState();
  const nextType = type === undefined || type === null || type === ''
    ? current.type
    : normalizeType(type);

  if (!nextType) {
    throw new Error('Choose playing, watching, listening, competing or streaming.');
  }

  const nextText = text === undefined || text === null || text === ''
    ? current.text
    : cleanText(text);

  if (!nextText) throw new Error('The presence text cannot be empty.');

  const candidateUrl = url === undefined || url === null || url === ''
    ? current.url
    : url;
  const nextUrl = nextType === 'streaming' ? httpUrl(candidateUrl) : null;

  if (nextType === 'streaming' && !nextUrl) {
    throw new Error('Streaming needs a valid http(s) URL.');
  }

  override = {
    text: nextText,
    type: nextType,
    url: nextUrl,
    updatedAt: Date.now(),
    updatedBy: String(userId ?? '').slice(0, 32),
  };

  await queueWrite(writeOverrideFile);
  return presenceState();
}

/** Drops the override so PRESENCE_TEXT applies again, and removes the saved file. */
async function clearPresenceOverride() {
  override = null;
  await queueWrite(writeOverrideFile);
  return presenceState();
}

/**
 * Reads a saved override at startup. A missing or unreadable file keeps the
 * configured default, so a broken file can never leave the bot without a presence.
 *
 * @returns {Promise<object>} the presence state that is now active
 */
async function loadPresenceOverride() {
  try {
    override = normalizeOverride(JSON.parse(await fs.readFile(presenceFile(), 'utf8')));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[presence] Could not read ${presenceFile()}: ${error.message}`);
    }
    override = null;
  }

  return presenceState();
}

/**
 * Sets the presence once and then periodically re-applies it. Discord can drop
 * an activity after a gateway resume, so this keeps the current text visible
 * without requiring a bot restart.
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

  const state = presenceState();
  logger.log(
    `[bot] Rich presence set: ${ACTIVITY_LABELS[state.type] ?? 'Playing'} ${state.text}`,
  );

  const timer = setInterval(() => {
    applyPresence(client, logger);
  }, intervalMs);
  timer.unref?.();
  return timer;
}

module.exports = {
  ACTIVITY_LABELS,
  ACTIVITY_TYPES,
  REFRESH_MS,
  applyPresence,
  buildPresence,
  clearPresenceOverride,
  loadPresenceOverride,
  presenceFile,
  presenceState,
  setPresenceOverride,
  startPresence,
};
