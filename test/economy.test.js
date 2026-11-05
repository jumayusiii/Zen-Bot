const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const economy = require('../src/lib/economy');

async function withEconomyFile(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'zen-economy-'));
  process.env.ECONOMY_FILE = path.join(directory, 'economy.json');

  try {
    await run(process.env.ECONOMY_FILE);
  } finally {
    delete process.env.ECONOMY_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('new wallets start empty and own the free theme', async () => {
  await withEconomyFile(async () => {
    const account = await economy.getAccount('guild-1', 'user-1');
    assert.equal(account.balance, 0);
    assert.equal(account.dailyStreak, 0);
    assert.equal(account.theme, 'aurora');
    assert.deepEqual(account.owned, ['aurora']);
  });
});

test('level-ups credit coins that scale with the level reached', async () => {
  await withEconomyFile(async () => {
    assert.equal(economy.coinsForLevel(1), 25);
    assert.equal(economy.coinsForLevel(10), 70);
    assert.equal(economy.coinsForLevel(100), 250);
    assert.equal(economy.coinsForLevelRange(0, 3), 90);

    const first = await economy.awardLevelCoins({
      guildId: 'guild-1',
      userId: 'user-1',
      fromLevel: 0,
      toLevel: 3,
    });
    assert.equal(first.awarded, true);
    assert.equal(first.amount, 90);
    assert.equal(first.balance, 90);

    const second = await economy.awardLevelCoins({
      guildId: 'guild-1',
      userId: 'user-1',
      fromLevel: 3,
      toLevel: 5,
    });
    assert.equal(second.amount, 85);
    assert.equal(second.balance, 175);

    const unchanged = await economy.awardLevelCoins({
      guildId: 'guild-1',
      userId: 'user-1',
      fromLevel: 5,
      toLevel: 5,
    });
    assert.equal(unchanged.awarded, false);
    assert.equal(unchanged.amount, 0);

    const account = await economy.getAccount('guild-1', 'user-1');
    assert.equal(account.balance, 175);

    const otherGuild = await economy.getAccount('guild-2', 'user-1');
    assert.equal(otherGuild.balance, 0);
  });
});

test('daily rewards enforce the cooldown and build a streak', async () => {
  await withEconomyFile(async () => {
    const now = Date.UTC(2026, 10, 1, 12, 0, 0);

    const first = await economy.claimDaily({ guildId: 'guild-1', userId: 'user-1', now });
    assert.equal(first.claimed, true);
    assert.equal(first.amount, 100);
    assert.equal(first.streak, 1);
    assert.equal(first.balance, 100);

    const early = await economy.claimDaily({
      guildId: 'guild-1',
      userId: 'user-1',
      now: now + economy.DAILY_COOLDOWN_MS - 1,
    });
    assert.equal(early.claimed, false);
    assert.equal(early.reason, 'cooldown');
    assert.equal(early.balance, 100);

    const second = await economy.claimDaily({
      guildId: 'guild-1',
      userId: 'user-1',
      now: now + 25 * 60 * 60 * 1000,
    });
    assert.equal(second.claimed, true);
    assert.equal(second.streak, 2);
    assert.equal(second.amount, 125);
    assert.equal(second.balance, 225);

    const broken = await economy.claimDaily({
      guildId: 'guild-1',
      userId: 'user-1',
      now: now + 100 * 60 * 60 * 1000,
    });
    assert.equal(broken.claimed, true);
    assert.equal(broken.streak, 1);
    assert.equal(broken.amount, 100);
  });
});

test('admin coin grants credit wallets and stop at the balance cap', async () => {
  await withEconomyFile(async (file) => {
    const first = await economy.grantCoins({
      guildId: 'guild-1',
      userId: 'user-1',
      amount: 500,
    });
    assert.equal(first.requested, 500);
    assert.equal(first.amount, 500);
    assert.equal(first.balance, 500);
    assert.equal(first.capped, false);

    await fs.writeFile(
      file,
      JSON.stringify({
        version: 1,
        users: [
          {
            guildId: 'guild-1',
            userId: 'user-1',
            balance: economy.MAX_BALANCE - 10,
            owned: ['aurora'],
            theme: 'aurora',
          },
        ],
      }),
      'utf8',
    );

    const capped = await economy.grantCoins({
      guildId: 'guild-1',
      userId: 'user-1',
      amount: 100,
    });
    assert.equal(capped.amount, 10);
    assert.equal(capped.balance, economy.MAX_BALANCE);
    assert.equal(capped.capped, true);

    await assert.rejects(
      economy.grantCoins({ guildId: 'guild-1', userId: 'user-1', amount: 0 }),
      /at least 1 coin/,
    );
    await assert.rejects(
      economy.grantCoins({
        guildId: 'guild-1',
        userId: 'user-1',
        amount: economy.MAX_GRANT + 1,
      }),
      /at most/,
    );
  });
});

test('admin coin removals deduct wallets and never go below zero', async () => {
  await withEconomyFile(async () => {
    await economy.grantCoins({ guildId: 'guild-1', userId: 'user-1', amount: 500 });

    const removed = await economy.removeCoins({
      guildId: 'guild-1',
      userId: 'user-1',
      amount: 200,
    });
    assert.equal(removed.requested, 200);
    assert.equal(removed.amount, 200);
    assert.equal(removed.balance, 300);
    assert.equal(removed.shortfall, 0);

    const clamped = await economy.removeCoins({
      guildId: 'guild-1',
      userId: 'user-1',
      amount: 5000,
    });
    assert.equal(clamped.amount, 300);
    assert.equal(clamped.balance, 0);
    assert.equal(clamped.shortfall, 4700);

    await assert.rejects(
      economy.removeCoins({ guildId: 'guild-1', userId: 'user-1', amount: 0 }),
      /at least 1 coin/,
    );
    await assert.rejects(
      economy.removeCoins({
        guildId: 'guild-1',
        userId: 'user-1',
        amount: economy.MAX_GRANT + 1,
      }),
      /at most/,
    );
  });
});

test('buying a theme deducts coins, equips it and prevents a second purchase', async () => {
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

    const bought = await economy.buyTheme({
      guildId: 'guild-1',
      userId: 'user-1',
      themeId: 'ocean',
    });
    assert.equal(bought.balance, 100);
    assert.equal(bought.theme.id, 'ocean');

    const account = await economy.getAccount('guild-1', 'user-1');
    assert.equal(account.theme, 'ocean');
    assert.deepEqual(account.owned, ['aurora', 'ocean']);

    await assert.rejects(
      economy.buyTheme({ guildId: 'guild-1', userId: 'user-1', themeId: 'ocean' }),
      (error) => error.code === 'already_owned',
    );

    await assert.rejects(
      economy.buyTheme({ guildId: 'guild-1', userId: 'user-1', themeId: 'candy' }),
      (error) => error.code === 'insufficient' && error.balance === 100,
    );
  });
});

test('steal attempts can succeed or fail and always start a 25-minute cooldown', async () => {
  await withEconomyFile(async () => {
    const now = Date.UTC(2026, 10, 3, 12, 0, 0);
    const values = [0.1, 0.5];

    const first = await economy.attemptSteal({
      guildId: 'guild-1',
      userId: 'user-1',
      now,
      random: () => values.shift() ?? 0,
    });
    assert.equal(first.stole, true);
    assert.equal(first.amount, 50);
    assert.equal(first.balance, 50);
    assert.equal(first.nextAt, now + economy.STEAL_COOLDOWN_MS);

    const blocked = await economy.attemptSteal({
      guildId: 'guild-1',
      userId: 'user-1',
      now: now + 5 * 60 * 1000,
      random: () => 0,
    });
    assert.equal(blocked.stole, false);
    assert.equal(blocked.reason, 'cooldown');
    assert.equal(blocked.balance, 50);
    assert.equal(blocked.nextAt, first.nextAt);

    const failed = await economy.attemptSteal({
      guildId: 'guild-1',
      userId: 'user-1',
      now: first.nextAt,
      random: () => 0.9,
    });
    assert.equal(failed.stole, false);
    assert.equal(failed.reason, undefined);
    assert.equal(failed.amount, 0);
    assert.equal(failed.balance, 50);
    assert.equal(failed.nextAt, first.nextAt + economy.STEAL_COOLDOWN_MS);

    const account = await economy.getAccount('guild-1', 'user-1');
    assert.equal(account.balance, 50);
    assert.equal(account.lastStealAt, first.nextAt);
  });
});


test('the economy leaderboard ranks funded wallets per server', async () => {
  await withEconomyFile(async (file) => {
    await fs.writeFile(
      file,
      JSON.stringify({
        version: 1,
        users: [
          { guildId: 'guild-1', userId: 'a', balance: 500, updatedAt: 1 },
          { guildId: 'guild-1', userId: 'b', balance: 900, updatedAt: 2 },
          { guildId: 'guild-1', userId: 'c', balance: 0 },
          { guildId: 'guild-1', userId: 'e', balance: 100, updatedAt: 5 },
          { guildId: 'guild-2', userId: 'd', balance: 9999 },
        ],
      }),
      'utf8',
    );

    const topTwo = await economy.getEconomyLeaderboard('guild-1', 2, 'e');
    assert.equal(topTwo.totalUsers, 3);
    assert.deepEqual(
      topTwo.entries.map((entry) => [entry.userId, entry.rank, entry.balance]),
      [['b', 1, 900], ['a', 2, 500]],
    );
    assert.deepEqual(topTwo.member, { rank: 3, balance: 100 });

    const all = await economy.getEconomyLeaderboard('guild-1', 10, 'b');
    assert.deepEqual(all.entries.map((entry) => entry.userId), ['b', 'a', 'e']);
    assert.deepEqual(all.member, { rank: 1, balance: 900 });

    const empty = await economy.getEconomyLeaderboard('guild-3');
    assert.equal(empty.totalUsers, 0);
    assert.deepEqual(empty.entries, []);
  });
});

test('creditCoins adds payouts and ignores a zero payout', async () => {
  await withEconomyFile(async () => {
    const credited = await economy.creditCoins({
      guildId: 'guild-1',
      userId: 'user-1',
      amount: 250,
    });
    assert.equal(credited.amount, 250);
    assert.equal(credited.balance, 250);

    const zero = await economy.creditCoins({
      guildId: 'guild-1',
      userId: 'user-1',
      amount: 0,
    });
    assert.equal(zero.amount, 0);
    assert.equal(zero.balance, 250);

    await assert.rejects(
      economy.creditCoins({ guildId: 'guild-1', userId: 'user-1', amount: -1 }),
      (error) => error.code === 'invalid_amount',
    );
  });
});

test('blackjack payouts return twice the stake on a win and the stake on a push', () => {
  const { blackjackPayout } = require('../src/lib/economyGames');

  assert.equal(blackjackPayout('win', 100), 200);
  assert.equal(blackjackPayout('push', 100), 100);
  assert.equal(blackjackPayout('lose', 100), 0);
  assert.equal(blackjackPayout('win', 0), 0);
});

test('equipping a theme requires ownership and stays per server', async () => {
  await withEconomyFile(async (file) => {
    await fs.writeFile(
      file,
      JSON.stringify({
        version: 1,
        users: [
          {
            guildId: 'guild-1',
            userId: 'user-1',
            balance: 100,
            owned: ['aurora', 'sunset'],
            theme: 'sunset',
          },
        ],
      }),
      'utf8',
    );

    const equipped = await economy.setCardTheme({
      guildId: 'guild-1',
      userId: 'user-1',
      themeId: 'aurora',
    });
    assert.equal(equipped.theme.id, 'aurora');

    await assert.rejects(
      economy.setCardTheme({
        guildId: 'guild-1',
        userId: 'user-1',
        themeId: 'ocean',
      }),
      (error) => error.code === 'not_owned',
    );

    const otherGuild = await economy.getAccount('guild-2', 'user-1');
    assert.equal(otherGuild.balance, 0);
    assert.equal(otherGuild.theme, 'aurora');
  });
});
