const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Collection } = require('discord.js');
const test = require('node:test');

const { DEFAULT_DEVELOPER_USER_ID, isDeveloper } = require('../src/lib/developers');
const { buildHelpPayload, groupCommands } = require('../src/lib/help');
const presence = require('../src/lib/presence');
const devPresence = require('../src/commands/developers/presence');

const DEVELOPER_ID = DEFAULT_DEVELOPER_USER_ID;

function fakeCommand(name, category, extra = {}) {
  return {
    category,
    ...extra,
    data: {
      name,
      description: `${name} command`,
      toJSON: () => ({ name, description: `${name} command`, options: [] }),
    },
  };
}

const client = {
  user: {
    username: 'TestBot',
    displayAvatarURL: () => 'https://cdn.example/bot.png',
  },
};

function fakeInteraction({ userId = DEVELOPER_ID, options = {} } = {}) {
  const captured = { presence: null, reply: null, edit: null };

  return {
    captured,
    user: { id: userId, username: 'Tester' },
    client: {
      user: {
        username: 'TestBot',
        displayAvatarURL: () => 'https://cdn.example/bot.png',
        setPresence(payload) {
          captured.presence = payload;
        },
        setAvatar: async () => {},
      },
    },
    options: {
      getString: (name) => (name in options ? options[name] : null),
      getBoolean: (name) => (name in options ? options[name] : null),
      getAttachment: (name) => (name in options ? options[name] : null),
    },
    async reply(payload) {
      captured.reply = payload;
    },
    async deferReply() {},
    async editReply(payload) {
      captured.edit = payload;
    },
  };
}

async function withPresenceFile(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'zen-presence-'));
  process.env.PRESENCE_FILE = path.join(directory, 'presence.json');

  try {
    await run();
  } finally {
    await presence.clearPresenceOverride();
    delete process.env.PRESENCE_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('only the configured developer id passes the gate', () => {
  delete process.env.DEVELOPER_USER_ID;

  assert.equal(isDeveloper(DEVELOPER_ID), true);
  assert.equal(isDeveloper('123456789012345678'), false);
  assert.equal(isDeveloper(''), false);
  assert.equal(isDeveloper(undefined), false);

  process.env.DEVELOPER_USER_ID = '42';
  assert.equal(isDeveloper('42'), true);
  assert.equal(isDeveloper(DEVELOPER_ID), false);
  delete process.env.DEVELOPER_USER_ID;
});

test('the Developers category stays out of the public directory', () => {
  delete process.env.DEVELOPER_USER_ID;

  const registry = new Collection([
    ['ping', fakeCommand('ping', 'utility')],
    ['devpresence', fakeCommand('devpresence', 'developers', { developerOnly: true })],
  ]);

  assert.deepEqual(groupCommands(registry).map((group) => group.meta.id), ['utility']);
  assert.deepEqual(
    groupCommands(registry, 'en', { viewerId: DEVELOPER_ID }).map((group) => group.meta.id),
    ['utility', 'developers'],
  );

  const publicOverview = buildHelpPayload(client, registry, 'overview', 'Tester');
  assert.equal(publicOverview.embeds[0].data.fields.length, 1);

  const developerOverview = buildHelpPayload(client, registry, 'overview', 'Tester', 'en', DEVELOPER_ID);
  assert.equal(developerOverview.embeds[0].data.fields.length, 2);

  const hiddenTab = buildHelpPayload(client, registry, 'developers', 'Tester');
  assert.equal(hiddenTab.embeds[0].data.title, 'Everything the bot can do');

  const developerTab = buildHelpPayload(client, registry, 'developers', 'Tester', 'en', DEVELOPER_ID);
  assert.equal(developerTab.embeds[0].data.title, 'Developer controls');
});

test('a saved override changes the payload, survives a reload and clears cleanly', async () => {
  await withPresenceFile(async () => {
    delete process.env.PRESENCE_TEXT;

    assert.equal(presence.buildPresence().activities[0].name, 'use /helplist!');
    assert.equal(presence.buildPresence().activities[0].type, 0);

    await presence.setPresenceOverride({
      text: '  Testing   presence ',
      type: 'watching',
      userId: DEVELOPER_ID,
    });

    assert.equal(presence.buildPresence().activities[0].name, 'Testing presence');
    assert.equal(presence.buildPresence().activities[0].type, 3);
    assert.equal(presence.presenceState().updatedBy, DEVELOPER_ID);

    await presence.loadPresenceOverride();
    assert.equal(presence.buildPresence().activities[0].name, 'Testing presence');

    await assert.rejects(
      () => presence.setPresenceOverride({ type: 'streaming' }),
      /URL/,
    );

    await presence.setPresenceOverride({
      text: 'Live now',
      type: 'streaming',
      url: 'https://twitch.tv/zen',
    });

    assert.equal(presence.buildPresence().activities[0].type, 1);
    assert.equal(presence.buildPresence().activities[0].url, 'https://twitch.tv/zen');

    await presence.clearPresenceOverride();
    assert.equal(presence.buildPresence().activities[0].name, 'use /helplist!');
    await assert.rejects(
      () => fs.readFile(process.env.PRESENCE_FILE, 'utf8'),
      { code: 'ENOENT' },
    );
  });
});

test('everyone except the developer is refused without touching the presence', async () => {
  const stranger = fakeInteraction({
    userId: '123456789012345678',
    options: { text: 'hijacked' },
  });

  await devPresence.execute(stranger);

  assert.match(stranger.captured.reply.content, /restricted/i);
  assert.equal(stranger.captured.presence, null);
  assert.equal(stranger.captured.edit, null);
});

test('the developer command applies text live and reset restores the default', async () => {
  await withPresenceFile(async () => {
    const applied = fakeInteraction({ options: { text: '  Maintenance   soon ' } });
    await devPresence.execute(applied);

    assert.equal(applied.captured.presence.activities[0].name, 'Maintenance soon');
    assert.equal(applied.captured.presence.activities[0].type, 0);
    assert.equal(applied.captured.edit.embeds.length, 1);
    assert.equal(presence.presenceState().type, 'playing');

    const reset = fakeInteraction({ options: { reset: true } });
    await devPresence.execute(reset);
    assert.equal(reset.captured.presence.activities[0].name, 'use /helplist!');
  });
});

test('streaming without a URL is explained instead of applied', async () => {
  await withPresenceFile(async () => {
    const interaction = fakeInteraction({ options: { type: 'streaming' } });
    await devPresence.execute(interaction);

    assert.match(interaction.captured.edit.content, /http/i);
    assert.equal(interaction.captured.presence, null);
  });
});
