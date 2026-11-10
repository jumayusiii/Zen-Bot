const fs = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { COLORS, createEmbed } = require('./embeds');
const { getGuildLanguage, t } = require('./i18n');

const DEFAULT_FILE = path.join(__dirname, '..', '..', 'data', 'moderation-logs.json');
const SNOWFLAKE = /^\d{15,20}$/;
const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);

const ACTIONS = Object.freeze({
  mute: { title: '🔇 Member muted', color: COLORS.warning },
  unmute: { title: '🔊 Timeout removed', color: COLORS.success },
  kick: { title: '👢 Member kicked', color: COLORS.danger },
  ban: { title: '🔨 User banned', color: COLORS.danger },
  unban: { title: '🔓 User unbanned', color: COLORS.success },
  softban: { title: '🧹 Member softbanned', color: COLORS.danger },
  'auto-unban': { title: '⏰ Temporary ban expired', color: COLORS.info },
  lock: { title: '🔒 Channel locked', color: COLORS.warning },
  unlock: { title: '🔓 Channel unlocked', color: COLORS.success },
  grantcoins: { title: '🪙 Coins granted', color: COLORS.game },
  levelsystem: { title: '📈 Level system updated', color: COLORS.warning },
  warn: { title: '⚠️ Member warned', color: COLORS.warning },
  clearwarnings: { title: '🧹 Warnings cleared', color: COLORS.success },
  purge: { title: '🧹 Messages purged', color: COLORS.neutral },
  slowmode: { title: '🐢 Slowmode updated', color: COLORS.info },
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

function buildModerationLogEmbed(client, entry = {}, language = 'en') {
  const action = ACTIONS[entry.action] ?? {
    title: '🛡️ Moderation action',
    color: COLORS.info,
  };
  const title = t(
    language,
    `moderation.audit.actions.${entry.action}`,
    {},
    t(language, 'moderation.audit.defaultTitle'),
  );

  if (entry.action === 'config') {
    return createEmbed(client, {
      section: t(language, 'moderation.audit.section'),
      title,
      description: t(language, 'moderation.audit.configDescription'),
      color: action.color,
      fields: [
        { name: `📁 ${t(language, 'moderation.fields.channel')}`, value: `<#${entry.channelId}>`, inline: true },
        { name: `🛡️ ${t(language, 'moderation.audit.status')}`, value: t(language, 'moderation.audit.enabled'), inline: true },
        {
          name: `👤 ${t(language, 'moderation.audit.configuredBy')}`,
          value: entry.moderatorId
            ? `<@${entry.moderatorId}>`
            : t(language, 'moderation.audit.serverAdmin'),
          inline: true,
        },
      ],
      footer: t(language, 'moderation.audit.footer'),
    });
  }

  const fields = [
    {
      name: `🎯 ${t(language, 'moderation.audit.target')}`,
      value: entry.targetId
        ? `${entry.targetName ? `**${cleanText(entry.targetName, 80)}**\n` : ''}\`${entry.targetId}\``
        : entry.targetName
          ? `**${cleanText(entry.targetName, 80)}**`
          : t(language, 'moderation.audit.notApplicable'),
      inline: true,
    },
    {
      name: `🛡️ ${t(language, 'moderation.audit.moderator')}`,
      value: entry.moderatorId
        ? `<@${entry.moderatorId}>`
        : cleanText(entry.moderatorName, 80) || t(language, 'moderation.audit.automatic'),
      inline: true,
    },
  ];

  if (entry.duration) {
    fields.push({
      name: `⏳ ${t(language, 'moderation.audit.duration')}`,
      value: cleanText(entry.duration, 80),
      inline: true,
    });
  }

  if (Number.isFinite(entry.expiresAt)) {
    fields.push({
      name: `📅 ${t(language, 'moderation.audit.expires')}`,
      value: `<t:${Math.floor(entry.expiresAt / 1000)}:F> (<t:${Math.floor(entry.expiresAt / 1000)}:R>)`,
      inline: true,
    });
  }

  fields.push({
    name: `📝 ${t(language, 'moderation.audit.reason')}`,
    value: cleanText(entry.reason, 400) || t(language, 'moderation.audit.noReason'),
    inline: false,
  });

  if (entry.extra) {
    fields.push({
      name: `📌 ${t(language, 'moderation.audit.details')}`,
      value: cleanText(entry.extra, 400),
      inline: false,
    });
  }

  return createEmbed(client, {
    section: t(language, 'moderation.audit.section'),
    title,
    description: entry.targetId
      ? t(language, 'moderation.audit.descriptionTarget', { target: `<@${entry.targetId}>` })
      : t(language, 'moderation.audit.descriptionGeneric'),
    color: action.color,
    fields,
    footer: t(language, 'moderation.audit.footer'),
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

  const language = await getGuildLanguage(guildId).catch(() => 'en');

  try {
    await channel.send({
      embeds: [buildModerationLogEmbed(client, { ...entry, channelId }, language)],
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
