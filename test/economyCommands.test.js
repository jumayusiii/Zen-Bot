const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const dailyCommand = require('../src/commands/economy/daily');
const buyCommand = require('../src/commands/economy/buy');
const stealCommand = require('../src/commands/economy/steal');
const blackjackCommand = require('../src/commands/economy/blackjack');
const economyLeaderboardCommand = require('../src/commands/economy/ecoleaderboard');
const balanceCommand = require('../src/commands/economy/balance');
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
    guild: options.guild ?? { id: 'guild-1' },
    user: options.user ?? {
      id: 'user-1',
      username: 'tester',
      displayAvatarURL: () => 'https://cdn.example/avatar.png',
    },
    client: {
      user: {
        username: 'TestBot',
        displayAvatarURL: () => 'https://cdn.example/bot.png',
      },
    },
    options: {
      getString: (name) => options[name] ?? null,
      getInteger: (name) => options[name] ?? null,
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

test('/steal pays out once and then enforces its cooldown', async () => {
  await withEconomyFile(async () => {
    const originalRandom = Math.random;
    Math.random = () => 0.1;

    try {
      const first = fakeInteraction();
      await stealCommand.execute(first);

      assert.equal(first.captured.reply.embeds[0].data.title, 'Heist successful');
      assert.match(first.captured.reply.embeds[0].data.description, /30 coins/);

      const second = fakeInteraction();
      await stealCommand.execute(second);

      assert.equal(second.captured.reply.embeds[0].data.title, 'Lay low for a while');
      assert.equal(second.captured.reply.flags, 64);
    } finally {
      Math.random = originalRandom;
    }
  });
});

test('/blackjack starts a free hand and refuses a bet the wallet cannot cover', async () => {
  await withEconomyFile(async (file) => {
    await fs.writeFile(
      file,
      JSON.stringify({
        version: 1,
        users: [{ guildId: 'guild-1', userId: 'user-1', balance: 500, owned: ['aurora'] }],
      }),
      'utf8',
    );

    const free = fakeInteraction();
    await blackjackCommand.execute(free);
    assert.equal(free.captured.reply.embeds[0].data.title, 'Blackjack');
    assert.equal(free.captured.reply.components.length, 1);

    const tooMuch = fakeInteraction({ bet: 5000 });
    await blackjackCommand.execute(tooMuch);
    assert.equal(tooMuch.captured.reply.flags, 64);
    assert.match(tooMuch.captured.reply.content, /only have \*\*500 coins\*\*/);
  });
});

test('/ecoleaderboard ranks wallets and shows member names', async () => {
  await withEconomyFile(async (file) => {
    await fs.writeFile(
      file,
      JSON.stringify({
        version: 1,
        users: [
          { guildId: 'guild-1', userId: 'user-1', balance: 500, owned: ['aurora'] },
          { guildId: 'guild-1', userId: 'user-2', balance: 300, owned: ['aurora'] },
          { guildId: 'guild-2', userId: 'user-3', balance: 9000, owned: ['aurora'] },
        ],
      }),
      'utf8',
    );

    const guild = {
      id: 'guild-1',
      name: 'Test Server',
      iconURL: () => null,
      members: {
        cache: new Map([
          ['user-1', { displayName: 'Tester' }],
          ['user-2', { displayName: 'Second' }],
        ]),
      },
    };

    const interaction = fakeInteraction({ guild });
    await economyLeaderboardCommand.execute(interaction);

    const embed = interaction.captured.reply.embeds[0].data;
    assert.equal(embed.title, 'Test Server leaderboard');
    assert.match(embed.description, /Top \*\*2\*\* of \*\*2\*\*/);
    assert.match(embed.fields[0].name, /Tester/);
    assert.match(embed.fields[0].value, /500\*\* coins/);
    assert.match(embed.fields[1].name, /Second/);
    assert.match(embed.fields[1].value, /300\*\* coins/);
  });
});

test('/balance shows the wallet balance and server rank', async () => {
  await withEconomyFile(async (file) => {
    await fs.writeFile(
      file,
      JSON.stringify({
        version: 1,
        users: [
          { guildId: 'guild-1', userId: 'user-1', balance: 500, owned: ['aurora'], dailyStreak: 3 },
          { guildId: 'guild-1', userId: 'user-2', balance: 300, owned: ['aurora'] },
          { guildId: 'guild-2', userId: 'user-3', balance: 9000, owned: ['aurora'] },
        ],
      }),
      'utf8',
    );

    const interaction = fakeInteraction();
    await balanceCommand.execute(interaction);

    const embed = interaction.captured.reply.embeds[0].data;
    const fields = Object.fromEntries(embed.fields.map((field) => [field.name, field.value]));
    assert.equal(embed.title, "tester's wallet");
    assert.equal(fields['💰 Balance'], '**500** coins');
    assert.equal(fields['📊 Server rank'], '**#1** of **2**');
    assert.equal(fields['🔥 Daily streak'], '**3** days');

    const newcomer = fakeInteraction({
      user: {
        id: 'user-9',
        username: 'newbie',
        displayAvatarURL: () => 'https://cdn.example/avatar.png',
      },
    });
    await balanceCommand.execute(newcomer);

    const newcomerFields = Object.fromEntries(
      newcomer.captured.reply.embeds[0].data.fields.map((field) => [field.name, field.value]),
    );
    assert.equal(newcomerFields['💰 Balance'], '**0** coins');
    assert.equal(newcomerFields['📊 Server rank'], '**Unranked**');
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
