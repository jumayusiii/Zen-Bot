const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const dailyCommand = require('../src/commands/economy/daily');
const workCommand = require('../src/commands/economy/work');
const shopCommand = require('../src/commands/economy/shop');
const buyCommand = require('../src/commands/economy/buy');
const stealCommand = require('../src/commands/economy/steal');
const blackjackCommand = require('../src/commands/economy/blackjack');
const economyLeaderboardCommand = require('../src/commands/economy/ecoleaderboard');
const balanceCommand = require('../src/commands/economy/balance');
const { setGuildLanguage } = require('../src/lib/i18n');
const rankCardCommand = require('../src/commands/levels/rankcard');

async function withEconomyFile(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'zen-economy-commands-'));
  process.env.ECONOMY_FILE = path.join(directory, 'economy.json');
  process.env.LANGUAGES_FILE = path.join(directory, 'languages.json');

  try {
    await run(process.env.ECONOMY_FILE);
  } finally {
    delete process.env.ECONOMY_FILE;
    delete process.env.LANGUAGES_FILE;
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
    assert.equal(free.captured.reply.components[0].components.length, 2);
    assert.ok(free.captured.reply.components.length >= 1);

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

test('/balance and /ecoleaderboard follow the saved German language', async () => {
  await withEconomyFile(async (file) => {
    await fs.writeFile(
      file,
      JSON.stringify({
        version: 1,
        users: [
          { guildId: 'guild-1', userId: 'user-1', balance: 500, owned: ['aurora'], dailyStreak: 2 },
          { guildId: 'guild-1', userId: 'user-2', balance: 300, owned: ['aurora'] },
        ],
      }),
      'utf8',
    );
    await setGuildLanguage('guild-1', 'de');

    const guild = {
      id: 'guild-1',
      name: 'Test Server',
      iconURL: () => null,
      members: { cache: new Map([['user-1', { displayName: 'Tester' }]]) },
    };

    const wallet = fakeInteraction({ guild });
    await balanceCommand.execute(wallet);

    const walletEmbed = wallet.captured.reply.embeds[0].data;
    assert.equal(walletEmbed.title, 'Geldbörse von tester');
    assert.ok(walletEmbed.fields.some((field) => field.name === '💰 Guthaben'));
    assert.ok(walletEmbed.fields.some(
      (field) => field.name === '📊 Server-Rang' && field.value === '**#1** von **2**',
    ));

    const board = fakeInteraction({ guild });
    await economyLeaderboardCommand.execute(board);

    const boardEmbed = board.captured.reply.embeds[0].data;
    assert.equal(boardEmbed.title, 'Rangliste von Test Server');
    assert.match(boardEmbed.description, /Die \*\*2\*\* reichsten von \*\*2\*\* Geldbörsen/);
  });
});

test('German economy responses localize copy, labels and numbers', async () => {
  await withEconomyFile(async (file) => {
    await fs.writeFile(
      file,
      JSON.stringify({
        version: 1,
        users: [
          {
            guildId: 'guild-1',
            userId: 'user-1',
            balance: 1500,
            owned: ['aurora'],
            theme: 'aurora',
          },
        ],
      }),
      'utf8',
    );
    await setGuildLanguage('guild-1', 'de');

    const daily = fakeInteraction();
    await dailyCommand.execute(daily);
    const dailyEmbed = daily.captured.reply.embeds[0].data;
    assert.equal(dailyEmbed.title, 'Tägliche Belohnung abgeholt');
    assert.match(dailyEmbed.description, /Münzen/);
    assert.ok(dailyEmbed.fields.some(
      (field) => field.name === '💰 Guthaben' && field.value === '**1.600** Münzen',
    ));

    const work = fakeInteraction();
    await workCommand.execute(work);
    const workEmbed = work.captured.reply.embeds[0].data;
    assert.equal(workEmbed.title, 'Schicht abgeschlossen');
    assert.match(workEmbed.description, /Münzen/);
    assert.ok(workEmbed.fields.some((field) => field.name === '⏰ Nächste Schicht'));

    const shop = fakeInteraction();
    await shopCommand.execute(shop);
    const shopEmbed = shop.captured.reply.embeds[0].data;
    assert.equal(shopEmbed.title, 'Rank-Card-Shop');
    assert.ok(shopEmbed.fields.some(
      (field) => field.name.startsWith('Aurora')
        && field.name.includes('Kostenlos')
        && field.value.includes('klassische Zen-Verlauf'),
    ));

    const style = fakeInteraction();
    await rankCardCommand.execute(style);
    const styleEmbed = style.captured.reply.embeds[0].data;
    assert.equal(styleEmbed.title, 'Rank-Card-Stil');
    assert.ok(styleEmbed.fields.some((field) => field.name === '🖼️ Eigene Themes'));

    const unowned = fakeInteraction({ theme: 'candy' });
    await rankCardCommand.execute(unowned);
    assert.match(unowned.captured.reply.content, /Du besitzt \*\*Candy\*\* noch nicht/);

    const blackjack = fakeInteraction();
    await blackjackCommand.execute(blackjack);
    const blackjackEmbed = blackjack.captured.reply.embeds[0].data;
    assert.equal(blackjackEmbed.title, 'Blackjack');
    assert.ok(blackjackEmbed.fields.some((field) => field.name === 'Deine Hand'));
    assert.deepEqual(
      blackjack.captured.reply.components[0].components.map((button) => button.data.label),
      ['Ziehen', 'Halten'],
    );

    const tooMuch = fakeInteraction({ bet: 5000 });
    await blackjackCommand.execute(tooMuch);
    assert.match(tooMuch.captured.reply.content, /Du hast nur \*\*[\d.]+ Münzen\*\*/);
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
