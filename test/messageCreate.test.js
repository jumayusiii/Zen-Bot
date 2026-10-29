const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const messageCreate = require('../src/events/messageCreate');

async function withLevelsFile(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'legend-message-xp-'));
  process.env.LEVELS_FILE = path.join(directory, 'levels.json');

  try {
    await run(process.env.LEVELS_FILE);
  } finally {
    delete process.env.LEVELS_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function fakeMessage({ userId = 'user-xp-1', bot = false, guildId = 'guild-xp-1' } = {}) {
  const sent = [];

  return {
    sent,
    inGuild: () => true,
    system: false,
    guildId,
    author: {
      id: userId,
      bot,
      username: 'tester',
      globalName: 'Tester',
    },
    member: { displayName: 'Tester' },
    channel: {
      send: async (payload) => {
        sent.push(payload);
      },
    },
    client: {
      user: {
        username: 'TestBot',
        displayAvatarURL: () => 'https://cdn.example/bot.png',
      },
    },
  };
}

test('a message awards XP once and a level up is announced', async () => {
  await withLevelsFile(async (file) => {
    await fs.writeFile(
      file,
      JSON.stringify({
        version: 1,
        users: [
          {
            guildId: 'guild-xp-2',
            userId: 'user-xp-2',
            username: 'Tester',
            xp: 95,
            lastXpAt: 0,
          },
        ],
      }),
      'utf8',
    );

    const message = fakeMessage({ guildId: 'guild-xp-2', userId: 'user-xp-2' });
    await messageCreate.execute(message);
    await messageCreate.execute(message);

    const stored = JSON.parse(await fs.readFile(file, 'utf8'));
    const entry = stored.users.find((user) => user.userId === 'user-xp-2');
    assert.ok(entry.xp >= 120 && entry.xp <= 130);
    assert.ok(entry.lastXpAt > 0);

    assert.equal(message.sent.length, 1);
    assert.equal(message.sent[0].content, '<@user-xp-2>');
    assert.equal(message.sent[0].embeds[0].data.title, 'Level up');
    assert.match(message.sent[0].embeds[0].data.description, /level 1/);
  });
});

test('bot messages and messages outside a guild do not earn XP', async () => {
  await withLevelsFile(async () => {
    const botMessage = fakeMessage({ userId: 'user-xp-3' });
    botMessage.author.bot = true;
    await messageCreate.execute(botMessage);
    assert.equal(botMessage.sent.length, 0);

    const dmMessage = fakeMessage({ userId: 'user-xp-4' });
    dmMessage.inGuild = () => false;
    await messageCreate.execute(dmMessage);
    assert.equal(dmMessage.sent.length, 0);
  });
});
