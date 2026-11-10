const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const presence = require('../src/lib/presence');
const { DEFAULT_DEVELOPER_USER_ID } = require('../src/lib/developers');
const { scheduleShutdown } = require('../src/lib/shutdown');
const devStatus = require('../src/commands/developers/status');
const devBio = require('../src/commands/developers/bio');

const DEVELOPER_ID = DEFAULT_DEVELOPER_USER_ID;

function fakeInteraction({ userId = DEVELOPER_ID, options = {} } = {}) {
  const captured = { presence: null, reply: null, edit: null, application: null };

  return {
    captured,
    user: { id: userId, username: 'Tester' },
    client: {
      application: {
        async edit(patch) {
          captured.application = patch;
        },
      },
      user: {
        username: 'TestBot',
        displayAvatarURL: () => 'https://cdn.example/bot.png',
        setPresence(payload) {
          captured.presence = payload;
        },
      },
    },
    options: {
      getString: (name) => (name in options ? options[name] : null),
      getBoolean: (name) => (name in options ? options[name] : null),
      getUser: (name) => (name in options ? options[name] : null),
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

async function withPresenceFiles(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'zen-status-'));
  process.env.PRESENCE_FILE = path.join(directory, 'presence.json');
  process.env.STATUS_FILE = path.join(directory, 'status.json');

  try {
    await run();
  } finally {
    await presence.clearPresenceOverride();
    await presence.clearCustomStatus();
    delete process.env.PRESENCE_FILE;
    delete process.env.STATUS_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('the status command sets a custom status beside the rich presence', async () => {
  await withPresenceFiles(async () => {
    const interaction = fakeInteraction({
      options: { text: 'Best emoji to describe your day?', emoji: '😀' },
    });

    await devStatus.execute(interaction);

    assert.equal(interaction.captured.presence.activities.length, 2);
    assert.equal(interaction.captured.presence.activities[0].name, 'use /help!');
    assert.equal(interaction.captured.presence.activities[1].name, 'Custom Status');
    assert.equal(interaction.captured.presence.activities[1].type, 4);
    assert.equal(
      interaction.captured.presence.activities[1].state,
      'Best emoji to describe your day?',
    );
    assert.equal(interaction.captured.presence.activities[1].emoji.name, '😀');
    assert.equal(interaction.captured.edit.embeds.length, 1);

    await presence.loadCustomStatus();
    assert.equal(presence.customStatusState().text, 'Best emoji to describe your day?');

    const reset = fakeInteraction({ options: { reset: true } });
    await devStatus.execute(reset);
    assert.equal(reset.captured.presence.activities.length, 1);
    assert.equal(presence.customStatusState(), null);
  });
});

test('the status command needs text unless it is resetting', async () => {
  await withPresenceFiles(async () => {
    const interaction = fakeInteraction({ options: {} });
    await devStatus.execute(interaction);

    assert.match(interaction.captured.reply.content, /status text/i);
    assert.equal(interaction.captured.presence, null);
  });
});

test('the bio command sends the new description to Discord', async () => {
  const interaction = fakeInteraction({
    options: { text: '  Zen — a friendly Discord bot. ' },
  });

  await devBio.execute(interaction);

  assert.deepEqual(interaction.captured.application, {
    description: 'Zen — a friendly Discord bot.',
  });
  assert.equal(interaction.captured.edit.embeds.length, 1);
});

test('shutdown asks PM2 to stop the app, or exits when unsupervised', () => {
  let scheduled = null;
  const spawned = [];
  const exits = [];

  scheduleShutdown({
    delaySeconds: 999,
    env: { pm_id: '0' },
    platform: 'win32',
    timer: (callback, milliseconds) => {
      scheduled = { callback, milliseconds };
    },
    spawnImpl: (command, args, options) => {
      spawned.push({ command, args, options });
      return { unref() {} };
    },
    exit: (code) => exits.push(code),
    logger: { log: () => {}, warn: () => {} },
  });

  assert.equal(scheduled.milliseconds, 30000);
  scheduled.callback();
  assert.equal(spawned[0].command, 'pm2');
  assert.deepEqual(spawned[0].args, ['stop', 'zen-bot']);
  assert.equal(spawned[0].options.shell, true);
  assert.equal(exits.length, 0);

  scheduleShutdown({
    env: {},
    timer: (callback) => callback(),
    spawnImpl: () => {
      throw new Error('should not spawn');
    },
    exit: (code) => exits.push(code),
    logger: { log: () => {}, warn: () => {} },
  });
  assert.deepEqual(exits, [0]);
});
