const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const greetings = require('../src/lib/greetings');

const GUILD_ID = '920000000000000001';
const CHANNEL_ID = '920000000000000002';
const USER_ID = '920000000000000003';

async function withGreetingFile(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'legend-greetings-'));
  process.env.GREETINGS_FILE = path.join(directory, 'greetings.json');

  try {
    await run();
  } finally {
    delete process.env.GREETINGS_FILE;
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

function fakeMember() {
  const guild = {
    id: GUILD_ID,
    name: 'Cloud Cord',
    memberCount: 42,
  };

  return {
    id: USER_ID,
    guild,
    displayName: 'Tester',
    joinedTimestamp: Date.UTC(2026, 9, 20, 12),
    user: {
      id: USER_ID,
      username: 'tester',
      globalName: 'Tester',
      createdTimestamp: Date.UTC(2024, 0, 2, 12),
    },
    displayAvatarURL: () => 'https://cdn.example/avatar.png',
  };
}

test('greetings default to disabled and welcome/leave settings stay separate', async () => {
  await withGreetingFile(async () => {
    const initial = await greetings.getGreeting(GUILD_ID, 'welcome');
    assert.equal(initial.enabled, false);
    assert.match(initial.message, /\{user\}/);

    await greetings.setGreeting(GUILD_ID, 'welcome', {
      channelId: CHANNEL_ID,
      message: 'Hi {user}, welcome to {server}!',
      updatedBy: USER_ID,
    });

    const welcome = await greetings.getGreeting(GUILD_ID, 'welcome');
    const leave = await greetings.getGreeting(GUILD_ID, 'leave');
    assert.equal(welcome.enabled, true);
    assert.equal(welcome.channelId, CHANNEL_ID);
    assert.match(welcome.message, /Hi \{user\}/);
    assert.equal(leave.enabled, false);

    await greetings.disableGreeting(GUILD_ID, 'welcome');
    const disabled = await greetings.getGreeting(GUILD_ID, 'welcome');
    assert.equal(disabled.enabled, false);
    assert.equal(disabled.channelId, CHANNEL_ID);
  });
});

test('greeting templates replace supported placeholders', () => {
  const member = fakeMember();
  const text = greetings.renderGreeting(
    '{user} aka {username} joined {server} as member #{count}. Account {created}, joined {joined}.',
    { member, type: 'welcome' },
  );

  assert.match(text, new RegExp(`<@${USER_ID}>`));
  assert.match(text, /Tester/);
  assert.match(text, /Cloud Cord/);
  assert.match(text, /42/);
  assert.match(text, /<t:\d+:R>/);
});

test('welcome embeds use inline fields and the configured channel', async () => {
  await withGreetingFile(async () => {
    const sent = [];
    const client = fakeClient((payload) => sent.push(payload));
    const member = fakeMember();

    await greetings.setGreeting(GUILD_ID, 'welcome', {
      channelId: CHANNEL_ID,
      message: 'Welcome {user} to **{server}**!',
    });

    const result = await greetings.sendGreeting(client, member, 'welcome');
    assert.equal(result.sent, true);
    assert.equal(sent.length, 1);

    const embed = sent[0].embeds[0];
    assert.equal(embed.data.title, 'Welcome to Cloud Cord');
    assert.match(embed.data.description, new RegExp(`<@${USER_ID}>`));
    assert.equal(embed.data.fields.length, 3);
    assert.ok(embed.data.fields.every((field) => field.inline === true));
    assert.deepEqual(sent[0].allowedMentions, { users: [USER_ID] });

    await greetings.disableGreeting(GUILD_ID, 'welcome');
    const disabled = await greetings.sendGreeting(client, member, 'welcome');
    assert.equal(disabled.sent, false);

    const leave = greetings.buildGreetingEmbed(client, {
      type: 'leave',
      member,
      config: {
        enabled: true,
        channelId: CHANNEL_ID,
        message: '{username} left. We are now {count}.',
      },
    });
    assert.equal(leave.data.title, 'Goodbye, Tester');
    assert.ok(leave.data.fields.every((field) => field.inline === true));
  });
});
