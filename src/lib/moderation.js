const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { MessageFlags } = require('discord.js');
const { sendModerationLog } = require('./moderationLogs');

const DEFAULT_FILE = path.join(__dirname, '..', '..', 'data', 'moderation.json');
const MAX_SCHEDULED_BANS = 5000;
const CHECK_INTERVAL_MS = 30 * 1000;
const MINUTE_MS = 60 * 1000;
const MAX_TIMEOUT_MS = 28 * 24 * 60 * MINUTE_MS;
const MAX_REASON_LENGTH = 400;
const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);

const MUTE_DURATIONS = Object.freeze([
  { label: '5 minutes', value: '5m', ms: 5 * MINUTE_MS },
  { label: '10 minutes', value: '10m', ms: 10 * MINUTE_MS },
  { label: '30 minutes', value: '30m', ms: 30 * MINUTE_MS },
  { label: '1 hour', value: '1h', ms: 60 * MINUTE_MS },
  { label: '6 hours', value: '6h', ms: 6 * 60 * MINUTE_MS },
  { label: '12 hours', value: '12h', ms: 12 * 60 * MINUTE_MS },
  { label: '1 day', value: '1d', ms: 24 * 60 * MINUTE_MS },
  { label: '3 days', value: '3d', ms: 3 * 24 * 60 * MINUTE_MS },
  { label: '7 days', value: '7d', ms: 7 * 24 * 60 * MINUTE_MS },
  { label: '14 days', value: '14d', ms: 14 * 24 * 60 * MINUTE_MS },
  { label: '28 days', value: '28d', ms: MAX_TIMEOUT_MS },
]);

const BAN_DURATIONS = Object.freeze([
  { label: '1 hour', value: '1h', ms: 60 * MINUTE_MS },
  { label: '6 hours', value: '6h', ms: 6 * 60 * MINUTE_MS },
  { label: '12 hours', value: '12h', ms: 12 * 60 * MINUTE_MS },
  { label: '1 day', value: '1d', ms: 24 * 60 * MINUTE_MS },
  { label: '3 days', value: '3d', ms: 3 * 24 * 60 * MINUTE_MS },
  { label: '7 days', value: '7d', ms: 7 * 24 * 60 * MINUTE_MS },
  { label: '14 days', value: '14d', ms: 14 * 24 * 60 * MINUTE_MS },
  { label: '30 days', value: '30d', ms: 30 * 24 * 60 * MINUTE_MS },
  { label: 'Permanent', value: 'permanent', ms: 0 },
]);

const DELETE_MESSAGE_CHOICES = Object.freeze([
  { label: 'Do not delete any', value: 0 },
  { label: 'Last hour', value: 60 * 60 },
  { label: 'Last 6 hours', value: 6 * 60 * 60 },
  { label: 'Last 24 hours', value: 24 * 60 * 60 },
  { label: 'Last 7 days', value: 7 * 24 * 60 * 60 },
]);

let stateQueue = Promise.resolve();
let scheduler = null;

function moderationFile() {
  return process.env.MODERATION_FILE
    ? path.resolve(process.env.MODERATION_FILE)
    : DEFAULT_FILE;
}

function cleanText(value, maxLength) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function durationByValue(list, value) {
  return list.find((duration) => duration.value === value) ?? null;
}

function auditReason(moderator, reason) {
  const name = moderator?.user?.username ?? moderator?.username ?? 'Moderator';
  const id = moderator?.id ?? 'unknown';
  const text = cleanText(reason, MAX_REASON_LENGTH) || 'No reason provided';
  return cleanText(`${name} (${id}): ${text}`, 512);
}

function compareRoles(first, second) {
  const firstRole = first?.roles?.highest;
  const secondRole = second?.roles?.highest;
  if (!firstRole || !secondRole) return null;

  if (typeof firstRole.comparePositionTo === 'function') {
    return firstRole.comparePositionTo(secondRole);
  }

  return (firstRole.position ?? 0) - (secondRole.position ?? 0);
}

/**
 * Returns a friendly reason when a member cannot be moderated, or null when
 * the action is allowed. The server owner, the bot itself and the caller are
 * always protected, and the bot must sit above the target's highest role.
 *
 * @param {{guild: object, member: object, moderator?: object}} input
 * @returns {string|null}
 */
function targetModerationError({ guild, member, moderator }) {
  if (!member) return 'That member is not in this server.';
  if (member.id === moderator?.id) return 'You cannot moderate yourself.';
  if (member.id === guild?.members?.me?.id) return 'I cannot moderate myself.';
  if (member.id === guild?.ownerId) return 'The server owner cannot be moderated.';

  const botComparison = compareRoles(member, guild?.members?.me);
  if (botComparison !== null && botComparison >= 0) {
    return 'I cannot moderate a member whose highest role is at or above mine.';
  }

  if (moderator && moderator.id !== guild?.ownerId) {
    const moderatorComparison = compareRoles(member, moderator);
    if (moderatorComparison !== null && moderatorComparison >= 0) {
      return 'You cannot moderate a member whose highest role is at or above yours.';
    }
  }

  return null;
}

function moderationErrorMessage(error) {
  switch (Number(error?.code)) {
    case 50001:
    case 50013:
      return 'I am missing the permission for that action. Check my **Moderate Members**, **Kick Members** or **Ban Members** permission and my role position.';
    case 50035:
      return 'Discord rejected that action. Check the selected duration and try again.';
    case 10007:
      return 'That member is no longer in the server.';
    case 10013:
      return 'That user no longer exists.';
    case 10026:
      return 'That user is not currently banned.';
    default:
      return 'Discord could not complete that action. Check my permissions and role position.';
  }
}

function isSnowflake(value) {
  return /^\d{15,20}$/.test(String(value ?? ''));
}

async function sendModerationError(interaction, content) {
  const payload = { content, embeds: [], components: [] };

  try {
    if (interaction.deferred || interaction.replied) await interaction.editReply(payload);
    else await interaction.reply({ ...payload, flags: MessageFlags.Ephemeral });
  } catch (error) {
    console.error('[moderation] Could not deliver an error message:', error.message);
  }
}

function normalizeScheduledBan(value) {
  if (!value || typeof value !== 'object') return null;

  const id = cleanText(value.id, 64);
  const guildId = cleanText(value.guildId, 32);
  const userId = cleanText(value.userId, 32);
  const dueAt = Number(value.dueAt);
  const createdAt = Number(value.createdAt);

  if (!id || !guildId || !userId || !Number.isFinite(dueAt) || !Number.isFinite(createdAt)) {
    return null;
  }

  return {
    id,
    guildId,
    userId,
    username: cleanText(value.username, 32) || `User ${userId}`,
    moderatorId: cleanText(value.moderatorId, 32) || null,
    reason: cleanText(value.reason, MAX_REASON_LENGTH) || 'No reason provided',
    dueAt,
    createdAt,
  };
}

async function readState() {
  try {
    const parsed = JSON.parse(await fs.readFile(moderationFile(), 'utf8'));
    const values = Array.isArray(parsed) ? parsed : parsed?.scheduledBans;
    if (!Array.isArray(values)) throw new Error('moderation file has an unexpected shape');

    const unique = new Map();
    for (const value of values) {
      const entry = normalizeScheduledBan(value);
      if (entry && !unique.has(entry.id)) unique.set(entry.id, entry);
    }

    return { version: 1, scheduledBans: [...unique.values()] };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[moderation] Could not read ${moderationFile()}: ${error.message}`);
    }
    return { version: 1, scheduledBans: [] };
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
  state.scheduledBans = state.scheduledBans
    .sort((a, b) => a.dueAt - b.dueAt)
    .slice(0, MAX_SCHEDULED_BANS);

  const file = moderationFile();
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });

  try {
    await fs.writeFile(
      temporary,
      `${JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        scheduledBans: state.scheduledBans,
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
 * @param {(state: {version: number, scheduledBans: object[]}) => Promise<T>|T} operation
 * @returns {Promise<T>}
 */
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

function cloneEntry(entry) {
  return entry ? { ...entry } : null;
}

/**
 * Adds or replaces the auto-unban for one member in one server.
 *
 * @param {{guildId: string, userId: string, username?: string, moderatorId?: string, reason?: string, dueAt: number}} input
 * @returns {Promise<object>}
 */
async function scheduleUnban(input) {
  const now = Date.now();
  const dueAt = Number(input.dueAt);

  if (!isSnowflake(input.guildId) || !isSnowflake(input.userId)) {
    throw new Error('A valid server and user are required to schedule an unban.');
  }
  if (!Number.isFinite(dueAt) || dueAt <= now) {
    throw new Error('The unban time must be in the future.');
  }

  const entry = {
    id: crypto.randomUUID(),
    guildId: String(input.guildId),
    userId: String(input.userId),
    username: cleanText(input.username, 32) || `User ${input.userId}`,
    moderatorId: input.moderatorId ? String(input.moderatorId) : null,
    reason: cleanText(input.reason, MAX_REASON_LENGTH) || 'No reason provided',
    dueAt,
    createdAt: now,
  };

  await withState((state) => {
    state.scheduledBans = state.scheduledBans.filter(
      (item) => item.guildId !== entry.guildId || item.userId !== entry.userId,
    );
    state.scheduledBans.push(entry);
  });

  return cloneEntry(entry);
}

/**
 * Removes the scheduled unban for one member, if it exists.
 *
 * @param {string} guildId
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function cancelScheduledUnban(guildId, userId) {
  return withState((state) => {
    const index = state.scheduledBans.findIndex(
      (item) => item.guildId === guildId && item.userId === userId,
    );
    if (index === -1) return null;

    const [removed] = state.scheduledBans.splice(index, 1);
    return cloneEntry(removed);
  });
}

async function removeScheduledUnban(id) {
  return withState((state) => {
    state.scheduledBans = state.scheduledBans.filter((item) => item.id !== id);
  });
}

async function getDueUnbans(now = Date.now()) {
  const state = await readState();
  return state.scheduledBans
    .filter((entry) => entry.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt)
    .slice(0, 25)
    .map(cloneEntry);
}

/**
 * Lifts every due temporary ban. Missing guilds and permission errors are kept
 * for the next tick; an already-lifted ban is treated as complete.
 *
 * @param {import('discord.js').Client} client
 * @param {{now?: number, logger?: Console}} [options]
 * @returns {Promise<number>} number of bans lifted
 */
async function processDueUnbans(client, { now = Date.now(), logger = console } = {}) {
  const due = await getDueUnbans(now);
  let lifted = 0;

  for (const entry of due) {
    let guild = client.guilds?.cache?.get?.(entry.guildId) ?? null;

    if (!guild) {
      try {
        guild = await client.guilds.fetch(entry.guildId);
      } catch (error) {
        logger.warn(`[moderation] Could not reach guild ${entry.guildId} for a scheduled unban: ${error.message}`);
        continue;
      }
    }

    try {
      await guild.bans.remove(
        entry.userId,
        cleanText(`Temporary ban expired: ${entry.reason}`, 512),
      );
      await removeScheduledUnban(entry.id);
      lifted += 1;
      logger.log(`[moderation] Auto-unbanned ${entry.username} (${entry.userId}) in ${entry.guildId}.`);
      await sendModerationLog(client, entry.guildId, {
        action: 'auto-unban',
        targetId: entry.userId,
        targetName: entry.username,
        moderatorName: 'Automatic — temporary ban expired',
        reason: entry.reason,
        extra: 'The temporary ban reached its scheduled end.',
      });
    } catch (error) {
      if (Number(error?.code) === 10026 || Number(error?.code) === 10013) {
        await removeScheduledUnban(entry.id);
        logger.log(`[moderation] Cleared a stale temporary ban for ${entry.username} (${entry.userId}).`);
        continue;
      }

      logger.warn(
        `[moderation] Could not auto-unban ${entry.username} (${entry.userId}): ${error.message}`,
      );
    }
  }

  return lifted;
}

/**
 * Starts the background dispatcher for temporary bans.
 *
 * @param {import('discord.js').Client} client
 * @param {{intervalMs?: number, logger?: Console}} [options]
 * @returns {{stop: () => void}}
 */
function startModerationScheduler(client, { intervalMs = CHECK_INTERVAL_MS, logger = console } = {}) {
  if (scheduler) return scheduler;

  const interval = Math.max(5000, intervalMs);
  let running = false;

  const run = async () => {
    if (running) return;
    running = true;

    try {
      await processDueUnbans(client, { logger });
    } catch (error) {
      logger.error('[moderation] Scheduler tick failed:', error.message);
    } finally {
      running = false;
    }
  };

  const initial = setTimeout(run, 2000);
  const timer = setInterval(run, interval);
  initial.unref?.();
  timer.unref?.();

  scheduler = {
    stop() {
      clearTimeout(initial);
      clearInterval(timer);
      scheduler = null;
    },
  };

  logger.log(`[moderation] Temporary-ban scheduler enabled (checking every ${Math.round(interval / 1000)}s).`);
  return scheduler;
}

function stopModerationScheduler() {
  scheduler?.stop();
}

module.exports = {
  BAN_DURATIONS,
  DELETE_MESSAGE_CHOICES,
  MAX_REASON_LENGTH,
  MAX_TIMEOUT_MS,
  MUTE_DURATIONS,
  auditReason,
  cancelScheduledUnban,
  durationByValue,
  getDueUnbans,
  isSnowflake,
  moderationErrorMessage,
  moderationFile,
  processDueUnbans,
  removeScheduledUnban,
  scheduleUnban,
  sendModerationError,
  startModerationScheduler,
  stopModerationScheduler,
  targetModerationError,
};
