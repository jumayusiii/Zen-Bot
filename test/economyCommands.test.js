const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const dailyCommand = require('../src/commands/economy/daily');
const buyCommand = require('../src/commands/economy/buy');
const rankCardCommand = require('../src/commands/levels/rankcard');

async function withEconomyFile(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'zen-economy-commands-'));
  process.env.ECONOMY_FILE = path.join(directory, 'economy.json');

  try {
    await run(process.env.ECONOMY_FILE);
  } finally {
    delete process.env.ECONOMY_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function fakeInteraction(options = {}) {
  const captured = {};
  return {
    captured,
    guild: { id: 'guild-1' },
    user: { id: 'user-1', username: 'tester' },
    client: {
      user: {
        username: 'TestBot',
        displayAvatarURL: () => 'https://cdn.example/bot.png',
      },
    },
    options: {
      getString: (name) => options[name] ?? null,
      getUser: () => null,
    },
    async reply(payload) {
      captured.reply = payload;
    },
  };
}

test('/daily claims a reward and updates the wallet', async () => {
  await withEconomyFile(async () => {
    const interaction = fakeInteraction();
    await dailyCommand.execute(interaction);

    assert.equal(interaction.captured.reply.embeds[0].data.title, 'Daily reward claimed');
    assert.match(interaction.captured.reply.embeds[0].data.description, /100 coins/);

    const second = fakeInteraction();
    await dailyCommand.execute(second);
    assert.equal(second.captured.reply.embeds[0].data.title, 'Daily reward');
    assert.match(second.captured.reply.embeds[0].data.description, /already collected/);
  });
});

test('/buy purchases a theme and /rankcard refuses unowned themes', async () => {
  await withEconomyFile(async (file) => {
    await fs.writeFile(
      file,
      JSON.stringify({
        version: 1,
        users: [
          {
            guildId: 'guild-1',
            userId: 'user-1',
            balance: 1000,
            owned: ['aurora'],
            theme: 'aurora',
          },
        ],
      }),
      'utf8',
    );

    const purchase = fakeInteraction({ theme: 'ocean' });
    await buyCommand.execute(purchase);
    assert.equal(purchase.captured.reply.embeds[0].data.title, 'Theme unlocked');
    assert.equal(purchase.captured.reply.flags, 64);

    const unowned = fakeInteraction({ theme: 'candy' });
    await rankCardCommand.execute(unowned);
    assert.match(unowned.captured.reply.content, /do not own/);

    const equip = fakeInteraction({ theme: 'ocean' });
    await rankCardCommand.execute(equip);
    assert.equal(equip.captured.reply.embeds[0].data.title, 'Card theme equipped');
    assert.match(equip.captured.reply.embeds[0].data.description, /Ocean/);
  });
});
