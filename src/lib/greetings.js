const fs = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { COLORS, createEmbed } = require('./embeds');

const DEFAULT_FILE = path.join(__dirname, '..', '..', 'data', 'greetings.json');
const SNOWFLAKE = /^\d{15,20}$/;
const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);
const TYPES = Object.freeze(['welcome', 'leave']);

const DEFAULT_MESSAGES = Object.freeze({
  welcome: 'Welcome {user} to **{server}**! You are member **#{count}**.',
  leave: '**{username}** left **{server}**. We are now **{count}** members.',
});

let stateQueue = Promise.resolve();

function greetingsFile() {
  return process.env.GREETINGS_FILE
    ? path.resolve(process.env.GREETINGS_FILE)
    : DEFAULT_FILE;
}

function cleanTemplate(value, fallback) {
  const text = String(value ?? '').replace(/\r\n?/g, '\n').trim();
  return (text || fallback).slice(0, 500);
}

function cleanText(value, maxLength) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function defaultConfig(type) {
  return {
    enabled: false,
    channelId: null,
    message: DEFAULT_MESSAGES[type],
    updatedBy: null,
    updatedAt: null,
  };
}

function normalizeConfig(value, type) {
  const fallback = defaultConfig(type);
  if (!value || typeof value !== 'object') return fallback;

  const channelId = String(value.channelId ?? '');
  const hasChannel = SNOWFLAKE.test(channelId);

  return {
    enabled: Boolean(value.enabled) && hasChannel,
    channelId: hasChannel ? channelId : null,
    message: cleanTemplate(value.message, fallback.message),
    updatedBy: cleanText(value.updatedBy, 32) || null,
    updatedAt: Number.isFinite(Number(value.updatedAt)) ? Number(value.updatedAt) : null,
  };
}

function normalizeState(value) {
  const guilds = {};
  const source = value && typeof value === 'object' ? value.guilds : null;

  if (source && typeof source === 'object' && !Array.isArray(source)) {
    for (const [guildId, settings] of Object.entries(source)) {
      if (!SNOWFLAKE.test(guildId) || !settings || typeof settings !== 'object') continue;
      guilds[guildId] = {
        welcome: normalizeConfig(settings.welcome, 'welcome'),
        leave: normalizeConfig(settings.leave, 'leave'),
      };
    }
  }

  return { version: 1, guilds };
}

async function readState() {
  try {
    const parsed = JSON.parse(await fs.readFile(greetingsFile(), 'utf8'));
    return normalizeState(parsed);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[greetings] Could not read ${greetingsFile()}: ${error.message}`);
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
  const file = greetingsFile();
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

function ensureType(type) {
  if (!TYPES.includes(type)) throw new Error(`Unknown greeting type: ${type}`);
}

/** Returns the stored welcome or leave settings for a server. */
async function getGreeting(guildId, type) {
  ensureType(type);
  const state = await readState();
  return normalizeConfig(state.guilds[String(guildId)]?.[type], type);
}

/**
 * Saves one greeting type. Enabling requires a channel; the default message is
 * restored when the template is cleared.
 */
async function setGreeting(guildId, type, { channelId, message, updatedBy = null } = {}) {
  ensureType(type);

  if (!SNOWFLAKE.test(String(guildId))) throw new Error('A valid server is required.');
  if (!SNOWFLAKE.test(String(channelId))) throw new Error('A valid channel is required.');

  const entry = {
    enabled: true,
    channelId: String(channelId),
    message: cleanTemplate(message, DEFAULT_MESSAGES[type]),
    updatedBy: cleanText(updatedBy, 32) || null,
    updatedAt: Date.now(),
  };

  await withState((state) => {
    const existing = state.guilds[String(guildId)] ?? {};
    state.guilds[String(guildId)] = {
      welcome: normalizeConfig(existing.welcome, 'welcome'),
      leave: normalizeConfig(existing.leave, 'leave'),
      [type]: entry,
    };
  });

  return { ...entry };
}

/** Turns a greeting off while keeping its channel and message. */
async function disableGreeting(guildId, type) {
  ensureType(type);

  return withState((state) => {
    const existing = state.guilds[String(guildId)] ?? {};
    const settings = {
      welcome: normalizeConfig(existing.welcome, 'welcome'),
      leave: normalizeConfig(existing.leave, 'leave'),
    };
    settings[type] = { ...settings[type], enabled: false, updatedAt: Date.now() };
    state.guilds[String(guildId)] = settings;
    return { ...settings[type] };
  });
}

/**
 * Replaces the supported placeholders while leaving other braces untouched.
 *
 * @param {string} template
 * @param {{member: object, type: 'welcome'|'leave'}} context
 */
function renderGreeting(template, { member, type = 'welcome' } = {}) {
  ensureType(type);
  const guild = member?.guild;
  const user = member?.user;
  const displayName = member?.displayName ?? user?.globalName ?? user?.username ?? 'Member';
  const createdAt = Number(user?.createdTimestamp);
  const joinedAt = Number(member?.joinedTimestamp);
  const count = Number(guild?.memberCount) || 0;

  const values = {
    user: user?.id ? `<@${user.id}>` : displayName,
    username: displayName,
    server: guild?.name ?? 'the server',
    count: count.toLocaleString('en-US'),
    created: Number.isFinite(createdAt) ? `<t:${Math.floor(createdAt / 1000)}:R>` : 'unknown',
    joined: Number.isFinite(joinedAt) ? `<t:${Math.floor(joinedAt / 1000)}:R>` : 'unknown',
  };

  return String(template ?? '')
    .replace(/\{(user|username|server|count|created|joined)\}/g, (_, key) => values[key])
    .trim()
    .slice(0, 1000);
}

function buildGreetingEmbed(client, { type, member, config }) {
  ensureType(type);
  const guild = member.guild;
  const displayName = member.displayName ?? member.user?.globalName ?? member.user?.username ?? 'Member';
  const avatar = member.displayAvatarURL?.({ extension: 'png', size: 256, forceStatic: true });

  const fields = type === 'welcome'
    ? [
        { name: '👤 Member', value: `<@${member.id}>`, inline: true },
        { name: '📊 Member #', value: Number(guild.memberCount).toLocaleString('en-US'), inline: true },
        { name: '📅 Account', value: member.user?.createdTimestamp ? `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>` : 'Unknown', inline: true },
      ]
    : [
        { name: '👤 Member', value: displayName, inline: true },
        { name: '📊 Members now', value: Number(guild.memberCount).toLocaleString('en-US'), inline: true },
        { name: '📅 Joined', value: Number.isFinite(Number(member.joinedTimestamp)) ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown', inline: true },
      ];

  return createEmbed(client, {
    section: type === 'welcome' ? 'Greetings' : 'Farewell',
    title: type === 'welcome' ? `Welcome to ${guild.name}` : `Goodbye, ${displayName}`,
    description: renderGreeting(config.message, { member, type }),
    color: type === 'welcome' ? COLORS.success : COLORS.warning,
    thumbnail: avatar ?? null,
    fields,
    footer: type === 'welcome' ? 'Welcome message' : 'Leave message',
  });
}

function buildGreetingPayload(client, { type, member, config }) {
  return {
    embeds: [buildGreetingEmbed(client, { type, member, config })],
    allowedMentions: type === 'welcome' ? { users: [member.id] } : { parse: [] },
  };
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
 * Sends a welcome or leave message when the server has it enabled.
 * Missing channels and permission errors are logged, never thrown.
 */
async function sendGreeting(client, member, type) {
  ensureType(type);

  if (!member?.guild) return { sent: false, reason: 'no-guild' };
  const config = await getGreeting(member.guild.id, type);
  if (!config.enabled || !config.channelId) return { sent: false, reason: 'disabled' };

  const channel = await resolveChannel(client, config.channelId);
  if (!channel?.isTextBased?.()) {
    console.warn(`[greetings] ${type} channel ${config.channelId} in ${member.guild.id} is missing.`);
    return { sent: false, reason: 'channel-missing' };
  }

  try {
    await channel.send(buildGreetingPayload(client, { type, member, config }));
    return { sent: true };
  } catch (error) {
    console.warn(`[greetings] Could not send the ${type} message: ${error.message}`);
    return { sent: false, reason: 'send-failed', error: error.message };
  }
}

module.exports = {
  DEFAULT_MESSAGES,
  TYPES,
  buildGreetingEmbed,
  buildGreetingPayload,
  defaultConfig,
  disableGreeting,
  getGreeting,
  greetingsFile,
  renderGreeting,
  resolveChannel,
  sendGreeting,
  setGreeting,
};
