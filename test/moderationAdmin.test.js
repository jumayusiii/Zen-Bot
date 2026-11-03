const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { ChannelType, PermissionFlagsBits } = require('discord.js');
const test = require('node:test');

const { getChannelLock } = require('../src/lib/channelLocks');
const { getAccount } = require('../src/lib/economy');
const lockCommand = require('../src/commands/moderation/lock');
const unlockCommand = require('../src/commands/moderation/unlock');
const softbanCommand = require('../src/commands/moderation/softban');
const banCommand = require('../src/commands/moderation/ban');
const grantCoinsCommand = require('../src/commands/moderation/grantcoins');
const { setGuildLanguage } = require('../src/lib/i18n');

const GUILD_ID = '910000000000000001';
const CHANNEL_ID = '910000000000000002';
const MODERATOR_ID = '910000000000000003';
const USER_ID = '910000000000000004';
const BOT_ID = '910000000000000005';
const EVERYONE_ID = '910000000000000006';

async function withDataFiles(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'zen-moderation-admin-'));
  process.env.CHANNEL_LOCKS_FILE = path.join(directory, 'channel-locks.json');
  process.env.ECONOMY_FILE = path.join(directory, 'economy.json');
  process.env.MODERATION_LOG_FILE = path.join(directory, 'moderation-logs.json');
  process.env.MODERATION_FILE = path.join(directory, 'moderation.json');
  process.env.WARNINGS_FILE = path.join(directory, 'warnings.json');
  process.env.LANGUAGES_FILE = path.join(directory, 'languages.json');

  try {
    await run();
  } finally {
    delete process.env.CHANNEL_LOCKS_FILE;
    delete process.env.ECONOMY_FILE;
    delete process.env.MODERATION_LOG_FILE;
    delete process.env.MODERATION_FILE;
    delete process.env.WARNINGS_FILE;
    delete process.env.LANGUAGES_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function fakeMember(id, position, displayName) {
  const highest = {
    position,
    comparePositionTo(other) {
      return position - other.position;
    },
  };

  return {
    id,
    displayName,
    user: { id, username: displayName.toLowerCase() },
    roles: { highest },
    permissions: { has: () => true },
  };
}

function fakeClient() {
  return {
    user: {
      id: BOT_ID,
      username: 'TestBot',
      displayAvatarURL: () => 'https://cdn.example/bot.png',
    },
    channels: { cache: new Map(), fetch: async () => null },
  };
}

function fakeChannel() {
  const edits = [];
  const overwrite = {
    allow: { has: (bit) => bit === PermissionFlagsBits.SendMessages },
    deny: { has: () => false },
  };

  return {
    id: CHANNEL_ID,
    name: 'general',
    type: ChannelType.GuildText,
    guildId: GUILD_ID,
    toString: () => `<#${CHANNEL_ID}>`,
    permissionOverwrites: {
      cache: new Map([[EVERYONE_ID, overwrite]]),
      edit: async (role, changes, options) => {
        edits.push({ role, changes, options });
      },
    },
    edits,
  };
}

function fakeGuild(overrides = {}) {
  const target = fakeMember(USER_ID, 10, 'Target');
  const bans = {
    created: [],
    removed: [],
    fetch: async () => null,
    create: async (userId, options) => {
      bans.created.push({ userId, options });
    },
    remove: async (userId, reason) => {
      bans.removed.push({ userId, reason });
    },
  };

  return {
    id: GUILD_ID,
    name: 'Test Server',
    ownerId: MODERATOR_ID,
    roles: { everyone: { id: EVERYONE_ID } },
    members: {
      me: fakeMember(BOT_ID, 100, 'Zen'),
      fetch: async (id) => (id === USER_ID ? target : null),
    },
    bans,
    target,
    ...overrides,
  };
}

function fakeInteraction({
  guild,
  channel = null,
  options = {},
  allowed = true,
  user = { id: MODERATOR_ID, username: 'admin', bot: false },
} = {}) {
  const captured = {};

  return {
    captured,
    guild,
    guildId: guild?.id ?? GUILD_ID,
    channel,
    user,
    member: fakeMember(MODERATOR_ID, 90, 'Admin'),
    memberPermissions: { has: () => allowed },
    client: fakeClient(),
    options: {
      getChannel: () => options.channel ?? null,
      getString: (name) => options[name] ?? null,
      getInteger: (name) => options[name] ?? null,
      getUser: () => options.user ?? null,
    },
    async reply(payload) {
      captured.reply = payload;
    },
    async deferReply() {
      captured.deferred = true;
    },
    async editReply(payload) {
      captured.editReply = payload;
    },
  };
}

function targetUser() {
  return {
    id: USER_ID,
    username: 'target',
    globalName: 'Target',
    bot: false,
    displayAvatarURL: () => 'https://cdn.example/avatar.png',
  };
}

test('/lock saves the previous setting and /unlock restores it', async () => {
  await withDataFiles(async () => {
    const channel = fakeChannel();
    const guild = fakeGuild();

    const lock = fakeInteraction({ guild, channel, options: { reason: 'Raid' } });
    await lockCommand.execute(lock);

    assert.equal(lock.captured.reply.embeds[0].data.title, 'Channel locked');
    assert.deepEqual(channel.edits[0].changes, { SendMessages: false });

    const saved = await getChannelLock(GUILD_ID, CHANNEL_ID);
    assert.equal(saved.previous, 'allow');
    assert.equal(saved.reason, 'Raid');

    const unlock = fakeInteraction({ guild, channel, options: { reason: 'All clear' } });
    await unlockCommand.execute(unlock);

    assert.equal(unlock.captured.reply.embeds[0].data.title, 'Channel unlocked');
    assert.deepEqual(channel.edits[1].changes, { SendMessages: true });
    assert.equal(await getChannelLock(GUILD_ID, CHANNEL_ID), null);
  });
});

test('/unlock refuses channels that were not locked by Zen', async () => {
  await withDataFiles(async () => {
    const interaction = fakeInteraction({
      guild: fakeGuild(),
      channel: fakeChannel(),
    });

    await unlockCommand.execute(interaction);

    assert.match(interaction.captured.reply.content, /No Zen lock is recorded/);
  });
});

test('/softban bans, cleans messages, then immediately lifts the ban', async () => {
  await withDataFiles(async () => {
    const guild = fakeGuild();
    const interaction = fakeInteraction({
      guild,
      options: {
        user: targetUser(),
        delete_messages: 3600,
        reason: 'Spam',
      },
    });

    await softbanCommand.execute(interaction);

    assert.equal(interaction.captured.deferred, true);
    assert.equal(guild.bans.created.length, 1);
    assert.equal(guild.bans.created[0].userId, USER_ID);
    assert.equal(guild.bans.created[0].options.deleteMessageSeconds, 3600);
    assert.match(guild.bans.created[0].options.reason, /admin/);
    assert.equal(guild.bans.removed.length, 1);
    assert.equal(interaction.captured.editReply.embeds[0].data.title, 'Member softbanned');
  });
});

test('German moderation responses localize actions, states and audit fields', async () => {
  await withDataFiles(async () => {
    await setGuildLanguage(GUILD_ID, 'de');
    const channel = fakeChannel();
    const guild = fakeGuild();

    const lock = fakeInteraction({ guild, channel, options: { reason: 'Raid' } });
    await lockCommand.execute(lock);
    const lockEmbed = lock.captured.reply.embeds[0].data;
    assert.equal(lockEmbed.title, 'Channel gesperrt');
    assert.ok(lockEmbed.fields.some(
      (field) => field.name === '🔒 Vorher' && field.value === 'erlaubt',
    ));

    const unlocked = fakeInteraction({ guild, channel, options: { reason: 'Vorbei' } });
    await unlockCommand.execute(unlocked);
    const unlockEmbed = unlocked.captured.reply.embeds[0].data;
    assert.equal(unlockEmbed.title, 'Channel entsperrt');
    assert.match(unlockEmbed.description, /Mitglieder können wieder Nachrichten senden/);

    const softban = fakeInteraction({
      guild,
      options: { user: targetUser(), delete_messages: 3600, reason: 'Spam' },
    });
    await softbanCommand.execute(softban);
    assert.equal(softban.captured.editReply.embeds[0].data.title, 'Mitglied softgebannt');

    const ban = fakeInteraction({
      guild,
      options: { user: targetUser(), duration: '1d', reason: 'Spam' },
    });
    await banCommand.execute(ban);
    const banEmbed = ban.captured.editReply.embeds[0].data;
    assert.equal(banEmbed.title, 'Benutzer temporär gebannt');
    assert.ok(banEmbed.fields.some(
      (field) => field.name === '⏳ Dauer' && field.value === '1 Tag',
    ));
    assert.ok(banEmbed.fields.some(
      (field) => field.name === '🧹 Nachrichten' && field.value === 'Nichts löschen',
    ));

    const granted = fakeInteraction({
      guild,
      options: { user: targetUser(), amount: 500, reason: 'Eventpreis' },
    });
    await grantCoinsCommand.execute(granted);
    const grantedEmbed = granted.captured.reply.embeds[0].data;
    assert.equal(grantedEmbed.title, 'Münzen vergeben');
    assert.match(grantedEmbed.description, /hat \*\*500 Münzen\*\* erhalten/);
    assert.ok(grantedEmbed.fields.some((field) => field.name === '🪙 Vergeben'));
  });
});

test('/grantcoins credits a wallet for admins and refuses moderators', async () => {
  await withDataFiles(async () => {
    const guild = fakeGuild();
    const interaction = fakeInteraction({
      guild,
      options: { user: targetUser(), amount: 500, reason: 'Event prize' },
    });

    await grantCoinsCommand.execute(interaction);

    assert.equal(interaction.captured.reply.embeds[0].data.title, 'Coins granted');
    assert.equal(interaction.captured.reply.flags, 64);
    assert.equal((await getAccount(GUILD_ID, USER_ID)).balance, 500);

    const denied = fakeInteraction({
      guild: { ...guild, ownerId: 'another-owner' },
      allowed: false,
      options: { user: targetUser(), amount: 500 },
    });
    await grantCoinsCommand.execute(denied);
    assert.match(denied.captured.reply.content, /Administrator/);
  });
});
