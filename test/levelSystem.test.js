const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { MessageFlags } = require('discord.js');
const test = require('node:test');

const interactionCreate = require('../src/events/interactionCreate');
const messageCreate = require('../src/events/messageCreate');
const levelSettings = require('../src/lib/levelSettings');
const levelSystemCommand = require('../src/commands/moderation/levelsystem');

const GUILD_ID = '1558612109976408094';
const OTHER_GUILD_ID = '500000000000000002';

async function withSettingsFile(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'zen-level-system-'));
  process.env.LEVEL_SETTINGS_FILE = path.join(directory, 'level-settings.json');
  process.env.LANGUAGES_FILE = path.join(directory, 'languages.json');
  process.env.MODERATION_LOG_FILE = path.join(directory, 'moderation-logs.json');
  levelSettings.resetLevelSettingsCache();

  try {
    await run();
  } finally {
    delete process.env.LEVEL_SETTINGS_FILE;
    delete process.env.LANGUAGES_FILE;
    delete process.env.MODERATION_LOG_FILE;
    levelSettings.resetLevelSettingsCache();
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function fakeLevelSystemInteraction({
  enabled,
  userId = 'admin-1',
  isAdmin = true,
  ownerId = 'owner-1',
} = {}) {
  const replies = [];
  const client = {
    user: {
      username: 'Zen',
      displayAvatarURL: () => 'https://cdn.example/bot.png',
    },
  };

  return {
    replies,
    interaction: {
      guildId: 'guild-1',
      guild: { id: 'guild-1', name: 'Test Server', ownerId },
      user: { id: userId, username: 'Admin' },
      memberPermissions: { has: () => isAdmin },
      options: { getBoolean: () => enabled },
      client,
      reply: async (payload) => { replies.push(payload); },
    },
  };
}

test('message XP is ignored while a server has the level system disabled', async () => {
  await withSettingsFile(async () => {
    await levelSettings.setLevelSystemEnabled(GUILD_ID, false, 'admin-1');
    let sent = false;

    await messageCreate.execute({
      inGuild: () => true,
      author: { bot: false, id: 'user-1' },
      system: false,
      guildId: GUILD_ID,
      member: { displayName: 'Tester' },
      channel: { send: async () => { sent = true; } },
    });

    assert.equal(sent, false);
  });
});

test('level commands are blocked only while their server is disabled', async () => {
  await withSettingsFile(async () => {
    await levelSettings.setLevelSystemEnabled(GUILD_ID, false, 'admin-1');

    let blockedExecution = false;
    let blockedReply = null;
    const blocked = {
      isChatInputCommand: () => true,
      commandName: 'rank',
      guildId: GUILD_ID,
      client: {
        commands: new Map([['rank', { execute: async () => { blockedExecution = true; } }]]),
      },
      reply: async (payload) => { blockedReply = payload; },
    };

    await interactionCreate.execute(blocked);
    assert.equal(blockedExecution, false);
    assert.equal(blockedReply?.flags, MessageFlags.Ephemeral);
    assert.match(blockedReply?.content ?? '', /level system is disabled/i);

    let allowedExecution = false;
    const allowed = {
      isChatInputCommand: () => true,
      commandName: 'rank',
      guildId: OTHER_GUILD_ID,
      client: {
        commands: new Map([['rank', { execute: async () => { allowedExecution = true; } }]]),
      },
    };

    await interactionCreate.execute(allowed);
    assert.equal(allowedExecution, true);
  });
});

test('admins can disable the level system and the setting survives a reload', async () => {
  await withSettingsFile(async () => {
    const { interaction, replies } = fakeLevelSystemInteraction({ enabled: false });

    await levelSystemCommand.execute(interaction);

    assert.equal(levelSettings.isLevelSystemDisabled('guild-1'), true);
    assert.equal(replies.length, 1);
    assert.equal(replies[0].flags, MessageFlags.Ephemeral);
    assert.match(replies[0].embeds[0].data.title, /disabled/i);

    levelSettings.resetLevelSettingsCache();
    assert.equal(levelSettings.isLevelSystemDisabled('guild-1'), true);
  });
});

test('the server owner can re-enable the level system without Administrator', async () => {
  await withSettingsFile(async () => {
    await levelSettings.setLevelSystemEnabled('guild-1', false, 'admin-1');

    const { interaction, replies } = fakeLevelSystemInteraction({
      enabled: true,
      userId: 'owner-1',
      isAdmin: false,
      ownerId: 'owner-1',
    });

    await levelSystemCommand.execute(interaction);

    assert.equal(levelSettings.isLevelSystemDisabled('guild-1'), false);
    assert.match(replies[0].embeds[0].data.title, /enabled/i);
  });
});

test('members without Administrator or ownership cannot change the setting', async () => {
  await withSettingsFile(async () => {
    const { interaction, replies } = fakeLevelSystemInteraction({
      enabled: false,
      userId: 'member-1',
      isAdmin: false,
    });

    await levelSystemCommand.execute(interaction);

    assert.equal(levelSettings.isLevelSystemDisabled('guild-1'), false);
    assert.match(replies[0].content, /Administrator/i);
  });
});
