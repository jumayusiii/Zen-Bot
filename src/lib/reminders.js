const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { COLORS, createEmbed } = require('./embeds');

const DEFAULT_FILE = path.join(__dirname, '..', '..', 'data', 'reminders.json');
const MAX_PER_USER = 25;
const MAX_TOTAL = 1000;
const MIN_DELAY_MS = 60 * 1000;
const MAX_DELAY_MS = 30 * 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 15 * 1000;
const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);

let stateQueue = Promise.resolve();
let scheduler = null;

function remindersFile() {
  return process.env.REMINDERS_FILE
    ? path.resolve(process.env.REMINDERS_FILE)
    : DEFAULT_FILE;
}

function cleanText(value, maxLength) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeReminder(value) {
  if (!value || typeof value !== 'object') return null;

  const id = cleanText(value.id, 64);
  const userId = cleanText(value.userId, 32);
  const channelId = cleanText(value.channelId, 32);
  const message = cleanText(value.message, 500);
  const dueAt = Number(value.dueAt);
  const createdAt = Number(value.createdAt);

  if (!id || !userId || !channelId || !message) return null;
  if (!Number.isFinite(dueAt) || !Number.isFinite(createdAt)) return null;

  return {
    id,
    userId,
    channelId,
    guildId: cleanText(value.guildId, 32) || null,
    message,
    where: value.where === 'channel' ? 'channel' : 'dm',
    dueAt,
    createdAt,
  };
}

async function readState() {
  try {
    const parsed = JSON.parse(await fs.readFile(remindersFile(), 'utf8'));
    const values = Array.isArray(parsed) ? parsed : parsed?.reminders;
    if (!Array.isArray(values)) throw new Error('reminder file has an unexpected shape');

    const unique = new Map();
    for (const value of values) {
      const reminder = normalizeReminder(value);
      if (reminder && !unique.has(reminder.id)) unique.set(reminder.id, reminder);
    }

    return { version: 1, reminders: [...unique.values()] };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[reminders] Could not read ${remindersFile()}: ${error.message}`);
    }
    return { version: 1, reminders: [] };
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
  // Never prune by age alone: a reminder may legitimately be due weeks later.
  // Delivered reminders are removed explicitly by the dispatcher.
  state.reminders = state.reminders
    .sort((a, b) => a.dueAt - b.dueAt)
    .slice(0, MAX_TOTAL);

  const file = remindersFile();
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });

  try {
    await fs.writeFile(
      temporary,
      `${JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        reminders: state.reminders,
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
 * @template T
 * @param {(state: {version: number, reminders: object[]}) => Promise<T>|T} operation
 * @param {boolean} [write]
 * @returns {Promise<T>}
 */
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

function cloneReminder(reminder) {
  return reminder ? { ...reminder } : null;
}

/**
 * Parses a compact duration such as `10m`, `2h`, `3d` or `1w`.
 *
 * @param {string} input
 * @returns {number|null} milliseconds, or null when the input is not valid
 */
function parseDuration(input) {
  const match = String(input ?? '').trim().toLowerCase().match(
    /^(\d{1,4})\s*(s|sec|secs|seconds?|m|min|mins|minutes?|h|hr|hrs|hours?|d|day|days|w|wk|wks|weeks?)$/,
  );
  if (!match) return null;

  const amount = Number(match[1]);
  if (!Number.isInteger(amount) || amount <= 0) return null;

  const unit = match[2][0];
  const multiplier = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  }[unit];

  const milliseconds = amount * multiplier;
  return milliseconds >= MIN_DELAY_MS && milliseconds <= MAX_DELAY_MS ? milliseconds : null;
}

/**
 * @param {{userId: string, channelId: string, guildId?: string|null, message: string, dueAt: number, where?: 'dm'|'channel'}} input
 * @returns {Promise<object>}
 */
async function createReminder(input) {
  const now = Date.now();
  const dueAt = Number(input.dueAt);
  const message = cleanText(input.message, 500);

  if (!message) throw new Error('The reminder message cannot be empty.');
  if (!Number.isFinite(dueAt) || dueAt < now + MIN_DELAY_MS || dueAt > now + MAX_DELAY_MS) {
    throw new Error('Choose a reminder between 1 minute and 30 days from now.');
  }

  const reminder = {
    id: crypto.randomUUID(),
    userId: String(input.userId),
    channelId: String(input.channelId),
    guildId: input.guildId ? String(input.guildId) : null,
    message,
    where: input.where === 'channel' ? 'channel' : 'dm',
    dueAt,
    createdAt: now,
  };

  await withState((state) => {
    const pendingForUser = state.reminders.filter((item) => item.userId === reminder.userId).length;
    if (pendingForUser >= MAX_PER_USER) {
      throw new Error(`You already have **${MAX_PER_USER}** pending reminders.`);
    }
    if (state.reminders.length >= MAX_TOTAL) {
      throw new Error('The reminder queue is full. Try again later.');
    }

    state.reminders.push(reminder);
  });

  return cloneReminder(reminder);
}

async function getDueReminders(now = Date.now()) {
  return withState(
    (state) => state.reminders
      .filter((reminder) => reminder.dueAt <= now)
      .sort((a, b) => a.dueAt - b.dueAt)
      .slice(0, 25)
      .map(cloneReminder),
    false,
  );
}

async function removeReminder(id) {
  return withState((state) => {
    state.reminders = state.reminders.filter((reminder) => reminder.id !== id);
  });
}

/**
 * Removes a reminder only when it belongs to the requesting user.
 *
 * @param {string} id
 * @param {string} userId
 * @returns {Promise<object|null>} the cancelled reminder, or null when it does not exist
 */
async function cancelReminder(id, userId) {
  return withState((state) => {
    const index = state.reminders.findIndex(
      (reminder) => reminder.id === id && reminder.userId === userId,
    );
    if (index === -1) return null;

    const [removed] = state.reminders.splice(index, 1);
    return cloneReminder(removed);
  });
}

async function listReminders(userId) {
  return withState(
    (state) => state.reminders
      .filter((reminder) => reminder.userId === userId)
      .sort((a, b) => a.dueAt - b.dueAt)
      .map(cloneReminder),
    false,
  );
}

function reminderEmbed(client, reminder, deliveredAt = Date.now()) {
  const lateBy = Math.max(0, deliveredAt - reminder.dueAt);
  const late = lateBy > 60 * 1000;

  return createEmbed(client, {
    section: 'Reminders',
    title: '⏰ Reminder',
    description: `${late ? `This was due <t:${Math.floor(reminder.dueAt / 1000)}:R>.\n\n` : ''}${reminder.message}`,
    color: COLORS.brand,
    fields: [
      { name: '📅 Due', value: `<t:${Math.floor(reminder.dueAt / 1000)}:F>`, inline: false },
      { name: '📍 Delivery', value: reminder.where === 'dm' ? 'Direct message' : 'This channel', inline: true },
    ],
    footer: 'Reminder delivered',
    timestamp: reminder.dueAt,
  });
}

/**
 * Attempts DM delivery first when requested and falls back to the channel the
 * reminder was created in. A failed delivery is logged and dropped so a closed
 * DM cannot create an endless retry loop.
 *
 * @param {import('discord.js').Client} client
 * @param {object} reminder
 * @param {number} [now]
 * @returns {Promise<boolean>}
 */
async function deliverReminder(client, reminder, now = Date.now()) {
  const embed = reminderEmbed(client, reminder, now);

  if (reminder.where === 'dm') {
    try {
      const user = await client.users.fetch(reminder.userId);
      await user.send({ embeds: [embed] });
      return true;
    } catch (error) {
      console.warn(`[reminders] DM failed for ${reminder.userId}, falling back to channel: ${error.message}`);
    }
  }

  try {
    const channel = await client.channels.fetch(reminder.channelId);
    if (!channel?.isTextBased?.() || typeof channel.send !== 'function') {
      throw new Error('the reminder channel cannot receive messages');
    }

    await channel.send({
      content: `<@${reminder.userId}>`,
      allowedMentions: { users: [reminder.userId] },
      embeds: [embed],
    });
    return true;
  } catch (error) {
    console.error(`[reminders] Could not deliver reminder ${reminder.id}: ${error.message}`);
    return false;
  }
}

async function tick(client) {
  const due = await getDueReminders();
  let delivered = 0;

  for (const reminder of due) {
    const sent = await deliverReminder(client, reminder);
    await removeReminder(reminder.id);
    if (sent) delivered += 1;
  }

  if (delivered > 0) {
    console.log(`[reminders] Delivered ${delivered} reminder(s).`);
  }
}

/**
 * Starts the reminder dispatcher. Due reminders are checked periodically so
 * reminders created before a restart are still delivered.
 *
 * @param {import('discord.js').Client} client
 * @param {{intervalMs?: number}} [options]
 * @returns {{stop: () => void}}
 */
function startReminderScheduler(client, options = {}) {
  if (scheduler) return scheduler;

  const intervalMs = Math.max(5000, options.intervalMs ?? CHECK_INTERVAL_MS);
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;

    try {
      await tick(client);
    } catch (error) {
      console.error('[reminders] Scheduler tick failed:', error.message);
    } finally {
      running = false;
    }
  };

  const initial = setTimeout(run, 1500);
  const timer = setInterval(run, intervalMs);
  initial.unref?.();
  timer.unref?.();

  scheduler = {
    stop() {
      clearTimeout(initial);
      clearInterval(timer);
      scheduler = null;
    },
  };

  console.log(`[reminders] Dispatcher enabled (checking every ${Math.round(intervalMs / 1000)}s).`);
  return scheduler;
}

function stopReminderScheduler() {
  scheduler?.stop();
}

module.exports = {
  MAX_DELAY_MS,
  MAX_PER_USER,
  MIN_DELAY_MS,
  cancelReminder,
  createReminder,
  deliverReminder,
  getDueReminders,
  listReminders,
  parseDuration,
  reminderEmbed,
  remindersFile,
  removeReminder,
  startReminderScheduler,
  stopReminderScheduler,
};
