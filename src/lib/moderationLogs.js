const fs = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { COLORS, createEmbed } = require('./embeds');

const DEFAULT_FILE = path.join(__dirname, '..', '..', 'data', 'moderation-logs.json');
const SNOWFLAKE = /^\d{15,20}$/;
const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);

const ACTIONS = Object.freeze({
  mute: { title: '🔇 Member muted', color: COLORS.warning },
  unmute: { title: '🔊 Timeout removed', color: COLORS.success },
  kick: { title: '👢 Member kicked', color: COLORS.danger },
  ban: { title: '🔨 User banned', color: COLORS.danger },
  unban: { title: '🔓 User unbanned', color: COLORS.success },
  'auto-unban': { title: '⏰ Temporary ban expired', color: COLORS.info },
  config: { title: '📋 Audit log connected', color: COLORS.brand },
});

let stateQueue = Promise.resolve();

function logFile() {
  return process.env.MODERATION_LOG_FILE
    ? path.resolve(process.env.MODERATION_LOG_FILE)
    : DEFAULT_FILE;
}

function cleanText(value, maxLength) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizeEntry(value) {
  if (!value || typeof value !== 'object') return null;
  const channelId = String(value.channelId ?? '');
  if (!SNOWFLAKE.test(channelId)) return null;

  return {
    channelId,
    updatedBy: cleanText(value.updatedBy, 32) || null,
    updatedAt: Number.isFinite(Number(value.updatedAt)) ? Number(value.updatedAt) : Date.now(),
  };
}

function normalizeState(value) {
  const guilds = {};
  const source = value && typeof value === 'object' ? value.guilds : null;

  if (source && typeof source === 'object' && !Array.isArray(source)) {
    for (const [guildId, entry] of Object.entries(source)) {
      if (!SNOWFLAKE.test(guildId)) continue;
      const normalized = normalizeEntry(entry);
      if (normalized) guilds[guildId] = normalized;
    }
  }

  return { version: 1, guilds };
}

async function readState() {
  try {
    const parsed = JSON.parse(await fs.readFile(logFile(), 'utf8'));
    return normalizeState(parsed);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[moderationLogs] Could not read ${logFile()}: ${error.message}`);
    }
    return normalizeState(null);
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
  const file = logFile();
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });

  try {
    await fs.writeFile(
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

/** Returns the configured audit-log channel id for a server, if any. */
async function getModLogChannelId(guildId) {
  const state = await readState();
  return state.guilds[String(guildId)]?.channelId ?? null;
}

/** Stores the audit-log channel for a server. */
async function setModLogChannel(guildId, channelId, updatedBy = null) {
  if (!SNOWFLAKE.test(String(guildId)) || !SNOWFLAKE.test(String(channelId))) {
    throw new Error('A valid server and channel are required.');
  }

  const entry = {
    channelId: String(channelId),
    updatedBy: cleanText(updatedBy, 32) || null,
    updatedAt: Date.now(),
  };

  await withState((state) => {
    state.guilds[String(guildId)] = entry;
  });

  return { ...entry };
}

/** Removes the audit-log channel for a server. */
async function clearModLogChannel(guildId) {
  return withState((state) => {
    const existing = state.guilds[String(guildId)] ?? null;
    delete state.guilds[String(guildId)];
    return existing ? { ...existing } : null;
  });
}

function buildModerationLogEmbed(client, entry = {}) {
  const action = ACTIONS[entry.action] ?? {
    title: '🛡️ Moderation action',
    color: COLORS.info,
  };

  if (entry.action === 'config') {
    return createEmbed(client, {
      section: 'Audit Log',
      title: action.title,
      description: 'Moderation actions in this server will be recorded here.',
      color: action.color,
      fields: [
        { name: '📁 Channel', value: `<#${entry.channelId}>`, inline: true },
        { name: '🛡️ Status', value: 'Enabled', inline: true },
        { name: '👤 Configured by', value: entry.moderatorId ? `<@${entry.moderatorId}>` : 'Server admin', inline: true },
      ],
      footer: 'Moderation audit log',
    });
  }

  const fields = [
    {
      name: '🎯 Target',
      value: entry.targetId
        ? `${entry.targetName ? `**${cleanText(entry.targetName, 80)}**\n` : ''}\`${entry.targetId}\``
        : 'Unknown user',
      inline: true,
    },
    {
      name: '🛡️ Moderator',
      value: entry.moderatorId
        ? `<@${entry.moderatorId}>`
        : cleanText(entry.moderatorName, 80) || 'Automatic',
      inline: true,
    },
  ];

  if (entry.duration) {
    fields.push({ name: '⏳ Duration', value: cleanText(entry.duration, 80), inline: true });
  }

  if (Number.isFinite(entry.expiresAt)) {
    fields.push({
      name: '📅 Expires',
      value: `<t:${Math.floor(entry.expiresAt / 1000)}:F> (<t:${Math.floor(entry.expiresAt / 1000)}:R>)`,
      inline: true,
    });
  }

  fields.push({
    name: '📝 Reason',
    value: cleanText(entry.reason, 400) || 'No reason provided',
    inline: false,
  });

  if (entry.extra) {
    fields.push({ name: '📌 Details', value: cleanText(entry.extra, 400), inline: false });
  }

  return createEmbed(client, {
    section: 'Audit Log',
    title: action.title,
    description: entry.targetId
      ? `A moderation action was recorded for <@${entry.targetId}>.`
      : 'A moderation action was recorded.',
    color: action.color,
    fields,
    footer: 'Moderation audit log',
  });
}

async function resolveChannel(client, channelId) {
  const cached = client?.channels?.cache?.get?.(channelId);
  if (cached) return cached;

  if (typeof client?.channels?.fetch !== 'function') return null;
  try {
    return await client.channels.fetch(channelId);
  } catch {
    return null;
  }
}

/**
 * Sends one moderation entry to the configured audit-log channel.
 * Never throws: a missing or broken log channel must not break moderation.
 *
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {object} entry
 * @returns {Promise<{sent: boolean, reason?: string, error?: string}>}
 */
async function sendModerationLog(client, guildId, entry = {}) {
  const channelId = await getModLogChannelId(guildId);
  if (!channelId) return { sent: false, reason: 'not-configured' };

  const channel = await resolveChannel(client, channelId);
  if (!channel?.isTextBased?.()) {
    console.warn(`[moderationLogs] Channel ${channelId} in ${guildId} is missing or not text-based.`);
    return { sent: false, reason: 'channel-missing' };
  }

  try {
    await channel.send({
      embeds: [buildModerationLogEmbed(client, { ...entry, channelId })],
      allowedMentions: { parse: [] },
    });
    return { sent: true };
  } catch (error) {
    console.warn(`[moderationLogs] Could not post in ${guildId}: ${error.message}`);
    return { sent: false, reason: 'send-failed', error: error.message };
  }
}

module.exports = {
  ACTIONS,
  buildModerationLogEmbed,
  clearModLogChannel,
  getModLogChannelId,
  logFile,
  sendModerationLog,
  setModLogChannel,
};
