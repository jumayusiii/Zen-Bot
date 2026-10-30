const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const logs = require('../src/lib/moderationLogs');

const GUILD_ID = '910000000000000001';
const CHANNEL_ID = '910000000000000002';
const USER_ID = '910000000000000003';

async function withLogFile(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'legend-modlogs-'));
  process.env.MODERATION_LOG_FILE = path.join(directory, 'moderation-logs.json');

  try {
    await run();
  } finally {
    delete process.env.MODERATION_LOG_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function fakeClient(send) {
  return {
    user: {
      username: 'TestBot',
      displayAvatarURL: () => 'https://cdn.example/bot.png',
    },
    channels: {
      cache: new Map([
        [
          CHANNEL_ID,
          {
            id: CHANNEL_ID,
            isTextBased: () => true,
            send: async (payload) => {
              send(payload);
              return { id: 'message-id' };
            },
          },
        ],
      ]),
    },
  };
}

test('audit-log channel settings persist and can be cleared', async () => {
  await withLogFile(async () => {
    assert.equal(await logs.getModLogChannelId(GUILD_ID), null);

    await logs.setModLogChannel(GUILD_ID, CHANNEL_ID, USER_ID);
    assert.equal(await logs.getModLogChannelId(GUILD_ID), CHANNEL_ID);

    const state = JSON.parse(await fs.readFile(process.env.MODERATION_LOG_FILE, 'utf8'));
    assert.equal(state.guilds[GUILD_ID].channelId, CHANNEL_ID);

    await logs.clearModLogChannel(GUILD_ID);
    assert.equal(await logs.getModLogChannelId(GUILD_ID), null);
  });
});

test('moderation log embeds use compact inline details', () => {
  const embed = logs.buildModerationLogEmbed(fakeClient(() => {}), {
    action: 'ban',
    targetId: USER_ID,
    targetName: 'Tester',
    moderatorId: '910000000000000004',
    reason: 'Spam',
    duration: '1 day',
    expiresAt: Date.now() + 86_400_000,
    extra: 'Messages deleted: Last hour',
  });

  assert.equal(embed.data.title, '🔨 User banned');
  assert.ok(embed.data.fields.length >= 5);
  assert.equal(embed.data.fields[0].inline, true);
  assert.equal(embed.data.fields[1].inline, true);
  assert.equal(embed.data.fields[2].inline, true);
  assert.match(embed.data.fields[0].value, /Tester/);
  assert.match(embed.data.fields[1].value, /910000000000000004/);
});

test('warn, purge and slowmode entries have dedicated titles', () => {
  const warn = logs.buildModerationLogEmbed(fakeClient(() => {}), {
    action: 'warn',
    targetId: USER_ID,
    targetName: 'Tester',
    moderatorId: '910000000000000004',
    reason: 'Rule reminder',
  });
  assert.equal(warn.data.title, '⚠️ Member warned');

  const purge = logs.buildModerationLogEmbed(fakeClient(() => {}), {
    action: 'purge',
    targetName: '#general',
    moderatorId: '910000000000000004',
    reason: 'Cleanup',
  });
  assert.equal(purge.data.title, '🧹 Messages purged');
  assert.match(purge.data.fields[0].value, /#general/);

  const slowmode = logs.buildModerationLogEmbed(fakeClient(() => {}), {
    action: 'slowmode',
    targetName: '#general',
    moderatorId: '910000000000000004',
    reason: 'Calm down',
  });
  assert.equal(slowmode.data.title, '🐢 Slowmode updated');
});

test('the audit logger sends to the configured channel and skips when disabled', async () => {
  await withLogFile(async () => {
    const sent = [];
    const client = fakeClient((payload) => sent.push(payload));

    const missing = await logs.sendModerationLog(client, GUILD_ID, {
      action: 'kick',
      targetId: USER_ID,
      reason: 'Test',
    });
    assert.equal(missing.sent, false);
    assert.equal(missing.reason, 'not-configured');

    await logs.setModLogChannel(GUILD_ID, CHANNEL_ID, USER_ID);
    const result = await logs.sendModerationLog(client, GUILD_ID, {
      action: 'mute',
      targetId: USER_ID,
      targetName: 'Tester',
      moderatorId: USER_ID,
      reason: 'Cool down',
      duration: '5 minutes',
      expiresAt: Date.now() + 300_000,
    });

    assert.equal(result.sent, true);
    assert.equal(sent.length, 1);
    assert.equal(sent[0].embeds[0].data.title, '🔇 Member muted');
    assert.deepEqual(sent[0].allowedMentions, { parse: [] });
  });
});
