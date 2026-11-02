const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const economy = require('../src/lib/economy');
const { resolveCoinBet, resolveSlotsBet } = require('../src/lib/economyGames');
const { SYMBOLS } = require('../src/lib/slots');

async function withEconomyFile(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'zen-economy-games-'));
  process.env.ECONOMY_FILE = path.join(directory, 'economy.json');

  try {
    await run();
  } finally {
    delete process.env.ECONOMY_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('work pays a random shift and enforces its cooldown', async () => {
  await withEconomyFile(async () => {
    const now = Date.UTC(2026, 10, 2, 12, 0, 0);
    const first = await economy.claimWork({
      guildId: 'guild-1',
      userId: 'user-1',
      now,
      random: () => 0,
    });
    assert.equal(first.worked, true);
    assert.equal(first.amount, economy.WORK_MIN);
    assert.equal(first.balance, economy.WORK_MIN);
    assert.equal(first.nextAt, now + economy.WORK_COOLDOWN_MS);

    const blocked = await economy.claimWork({
      guildId: 'guild-1',
      userId: 'user-1',
      now: now + 1,
      random: () => 0.5,
    });
    assert.equal(blocked.worked, false);
    assert.equal(blocked.reason, 'cooldown');
    assert.equal(blocked.amount, 0);
    assert.equal(blocked.balance, economy.WORK_MIN);

    const next = await economy.claimWork({
      guildId: 'guild-1',
      userId: 'user-1',
      now: now + economy.WORK_COOLDOWN_MS,
      random: () => 0.999999,
    });
    assert.equal(next.worked, true);
    assert.equal(next.amount, economy.WORK_MAX);
    assert.equal(next.balance, economy.WORK_MIN + economy.WORK_MAX);
  });
});

test('coin flips pay 1.9x on the called side and nothing on a miss', () => {
  const win = resolveCoinBet({ side: 'heads', wager: 100, random: () => 0.1 });
  assert.deepEqual(win, { result: 'heads', won: true, payout: 190 });

  const loss = resolveCoinBet({ side: 'tails', wager: 100, random: () => 0.1 });
  assert.deepEqual(loss, { result: 'heads', won: false, payout: 0 });
});

test('slot bets pay pairs and symbol-specific triples', () => {
  const jackpot = resolveSlotsBet({
    wager: 100,
    spin: () => [SYMBOLS[0], SYMBOLS[0], SYMBOLS[0]],
  });
  assert.equal(jackpot.outcome.matches, 3);
  assert.equal(jackpot.multiplier, 4);
  assert.equal(jackpot.payout, 400);

  const pair = resolveSlotsBet({
    wager: 100,
    spin: () => [SYMBOLS[0], SYMBOLS[0], SYMBOLS[1]],
  });
  assert.equal(pair.outcome.matches, 2);
  assert.equal(pair.multiplier, 1.5);
  assert.equal(pair.payout, 150);

  const miss = resolveSlotsBet({
    wager: 100,
    spin: () => [SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]],
  });
  assert.equal(miss.outcome.matches, 0);
  assert.equal(miss.payout, 0);
});

test('settleWager deducts the stake atomically and credits a gross payout', async () => {
  await withEconomyFile(async () => {
    await economy.grantCoins({ guildId: 'guild-1', userId: 'user-1', amount: 1000 });

    const win = await economy.settleWager({
      guildId: 'guild-1',
      userId: 'user-1',
      wager: 100,
      payout: 190,
    });
    assert.equal(win.wager, 100);
    assert.equal(win.payout, 190);
    assert.equal(win.net, 90);
    assert.equal(win.balance, 1090);
    assert.equal(win.won, true);

    const loss = await economy.settleWager({
      guildId: 'guild-1',
      userId: 'user-1',
      wager: 100,
      payout: 0,
    });
    assert.equal(loss.net, -100);
    assert.equal(loss.balance, 990);
    assert.equal(loss.won, false);

    await assert.rejects(
      economy.settleWager({
        guildId: 'guild-1',
        userId: 'user-1',
        wager: 5000,
        payout: 0,
      }),
      (error) => error.code === 'insufficient' && error.balance === 990,
    );
    await assert.rejects(
      economy.settleWager({
        guildId: 'guild-1',
        userId: 'user-1',
        wager: economy.MAX_WAGER + 1,
        payout: 0,
      }),
      (error) => error.code === 'wager_too_large',
    );
  });
});
