const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Collection } = require('discord.js');
const test = require('node:test');

const { DEFAULT_DEVELOPER_USER_ID, isDeveloper } = require('../src/lib/developers');
const { buildHelpPayload, groupCommands } = require('../src/lib/help');
const presence = require('../src/lib/presence');
const { MAX_IMAGE_BYTES, readAttachment, readImage } = require('../src/lib/botIdentity');
const { isSupervised, parseDelay, scheduleRestart } = require('../src/lib/restart');
const devPresence = require('../src/commands/developers/presence');
const devAvatar = require('../src/commands/developers/avatar');
const devBanner = require('../src/commands/developers/banner');
const devRestart = require('../src/commands/developers/restart');

const DEVELOPER_ID = DEFAULT_DEVELOPER_USER_ID;
const STRANGER_ID = '123456789012345678';

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
  const captured = { presence: null, reply: null, edit: null, avatar: null, banner: null };

  return {
    captured,
    user: { id: userId, username: 'Tester' },
    client: {
      user: {
        username: 'TestBot',
        displayAvatarURL: () => 'https://cdn.example/bot.png',
        bannerURL: () => 'https://cdn.example/banner.png',
        setPresence(payload) {
          captured.presence = payload;
        },
        async setAvatar(buffer) {
          captured.avatar = buffer;
        },
        async setBanner(buffer) {
          captured.banner = buffer;
        },
        async fetch() {
          return this;
        },
      },
    },
    options: {
      getString: (name) => (name in options ? options[name] : null),
      getBoolean: (name) => (name in options ? options[name] : null),
      getAttachment: (name) => (name in options ? options[name] : null),
      getInteger: (name) => (name in options ? options[name] : null),
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
  assert.equal(isDeveloper(STRANGER_ID), false);
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
    ['devavatar', fakeCommand('devavatar', 'developers', { developerOnly: true })],
    ['devbanner', fakeCommand('devbanner', 'developers', { developerOnly: true })],
    ['devrestart', fakeCommand('devrestart', 'developers', { developerOnly: true })],
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

test('everyone except the developer is refused by every developer command', async () => {
  for (const command of [devPresence, devAvatar, devBanner, devRestart]) {
    const stranger = fakeInteraction({
      userId: STRANGER_ID,
      options: { text: 'hijacked', reset: false, url: 'https://cdn.example/new.png' },
    });

    await command.execute(stranger);

    assert.match(stranger.captured.reply.content, /restricted/i);
    assert.equal(stranger.captured.presence, null);
    assert.equal(stranger.captured.edit, null);
    assert.equal(stranger.captured.avatar, null);
    assert.equal(stranger.captured.banner, null);
  }
});

test('the presence command applies text live and reset restores the default', async () => {
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

test('the avatar command needs an image and reports a missing source', async () => {
  const interaction = fakeInteraction({ options: {} });
  await devAvatar.execute(interaction);

  assert.match(interaction.captured.reply.content, /Attach an image/i);
  assert.equal(interaction.captured.avatar, null);
});

test('the banner command can clear the banner without an image', async () => {
  const interaction = fakeInteraction({ options: { reset: true } });
  await devBanner.execute(interaction);

  assert.equal(interaction.captured.banner, null);
  assert.equal(interaction.captured.edit.embeds.length, 1);
});

test('image downloads enforce https, image types and the 10 MB limit', async () => {
  await assert.rejects(
    () => readImage('http://cdn.example/cat.png', { fetchImpl: async () => ({}) }),
    /https/i,
  );

  await assert.rejects(
    () =>
      readImage('https://cdn.example/page', {
        fetchImpl: async () => ({
          ok: true,
          headers: { get: () => 'text/html' },
          arrayBuffer: async () => Buffer.from('<html>'),
        }),
      }),
    /PNG/,
  );

  const image = await readImage('https://cdn.example/ok.png', {
    fetchImpl: async () => ({
      ok: true,
      headers: { get: () => 'image/png' },
      arrayBuffer: async () => Buffer.from([0x89, 0x50, 0x4e, 0x47]),
    }),
  });
  assert.equal(image.contentType, 'image/png');
  assert.equal(image.buffer.length, 4);

  await assert.rejects(
    () =>
      readAttachment({
        url: 'https://cdn.example/huge.png',
        size: MAX_IMAGE_BYTES + 1,
        contentType: 'image/png',
      }),
    /10 MB/,
  );
});

test('restart helpers clamp delays and exit through the injected hook', () => {
  assert.equal(parseDelay(null), 3);
  assert.equal(parseDelay('12'), 12);
  assert.equal(parseDelay(-5), 0);
  assert.equal(parseDelay(999), 30);

  assert.equal(isSupervised({ pm_id: '0' }), true);
  assert.equal(isSupervised({ PM2_HOME: 'C:/pm2' }), true);
  assert.equal(isSupervised({}), false);

  let scheduled = null;
  const exits = [];

  scheduleRestart({
    delaySeconds: 999,
    timer: (callback, milliseconds) => {
      scheduled = { callback, milliseconds };
    },
    exit: (code) => exits.push(code),
    logger: { log: () => {} },
  });

  assert.equal(scheduled.milliseconds, 30000);
  scheduled.callback();
  assert.deepEqual(exits, [0]);
});
