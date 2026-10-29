const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const levels = require('../src/lib/levels');

async function withLevelsFile(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'legend-levels-'));
  process.env.LEVELS_FILE = path.join(directory, 'levels.json');

  try {
    await run();
  } finally {
    delete process.env.LEVELS_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('level thresholds grow and total XP is cumulative', () => {
  assert.equal(levels.xpForLevel(0), 100);
  assert.equal(levels.xpForLevel(1), 155);
  assert.equal(levels.xpForLevel(2), 220);
  assert.equal(levels.xpForLevel(10), 1100);

  assert.equal(levels.totalXpForLevel(1), 100);
  assert.equal(levels.totalXpForLevel(2), 255);
  assert.equal(levels.totalXpForLevel(3), 475);
});

test('progressFromXp handles boundaries and negative input', () => {
  assert.deepEqual(levels.progressFromXp(0), {
    level: 0,
    intoLevel: 0,
    needed: 100,
    totalXp: 0,
    percent: 0,
  });

  assert.equal(levels.progressFromXp(99).level, 0);
  assert.equal(levels.progressFromXp(99).intoLevel, 99);
  assert.equal(levels.progressFromXp(100).level, 1);
  assert.equal(levels.progressFromXp(100).intoLevel, 0);
  assert.equal(levels.progressFromXp(254).level, 1);
  assert.equal(levels.progressFromXp(255).level, 2);
  assert.equal(levels.progressFromXp(-50).totalXp, 0);
});

test('awardMessageXp grants XP, applies the cooldown and detects level ups', async () => {
  await withLevelsFile(async () => {
    const now = Date.UTC(2026, 9, 29, 12, 0, 0);

    const first = await levels.awardMessageXp({
      guildId: 'guild-1',
      userId: 'user-1',
      username: 'Tester',
      xp: 60,
      now,
    });

    assert.equal(first.awarded, true);
    assert.equal(first.gain, 60);
    assert.equal(first.entry.xp, 60);
    assert.equal(first.level, 0);
    assert.equal(first.leveledUp, false);

    const cooldown = await levels.awardMessageXp({
      guildId: 'guild-1',
      userId: 'user-1',
      xp: 60,
      now: now + 59_000,
    });

    assert.equal(cooldown.awarded, false);
    assert.equal(cooldown.reason, 'cooldown');
    assert.equal(cooldown.entry.xp, 60);

    const second = await levels.awardMessageXp({
      guildId: 'guild-1',
      userId: 'user-1',
      xp: 60,
      now: now + 61_000,
    });

    assert.equal(second.awarded, true);
    assert.equal(second.entry.xp, 120);
    assert.equal(second.level, 1);
    assert.equal(second.leveledUp, true);
    assert.equal(second.profile.intoLevel, 20);
  });
});

test('random XP stays between 15 and 25', async () => {
  await withLevelsFile(async () => {
    const low = await levels.awardMessageXp({
      guildId: 'guild-1',
      userId: 'user-low',
      random: () => 0,
      now: 1_000,
    });
    const high = await levels.awardMessageXp({
      guildId: 'guild-1',
      userId: 'user-high',
      random: () => 0.999999,
      now: 1_000,
    });

    assert.equal(low.gain, 15);
    assert.equal(high.gain, 25);
  });
});

test('leaderboard and profile ranks are scoped per guild', async () => {
  await withLevelsFile(async () => {
    const now = Date.UTC(2026, 9, 29, 12, 0, 0);

    await levels.awardMessageXp({
      guildId: 'guild-1',
      userId: 'user-1',
      username: 'Alpha',
      xp: 30,
      now,
    });
    await levels.awardMessageXp({
      guildId: 'guild-1',
      userId: 'user-2',
      username: 'Beta',
      xp: 50,
      now: now + 1,
    });
    await levels.awardMessageXp({
      guildId: 'guild-1',
      userId: 'user-3',
      username: 'Gamma',
      xp: 20,
      now: now + 2,
    });
    await levels.awardMessageXp({
      guildId: 'guild-2',
      userId: 'user-1',
      username: 'Alpha',
      xp: 90,
      now: now + 3,
    });

    const board = await levels.getLeaderboard('guild-1', 10);
    assert.equal(board.totalUsers, 3);
    assert.deepEqual(board.entries.map((entry) => entry.userId), ['user-2', 'user-1', 'user-3']);
    assert.deepEqual(board.entries.map((entry) => entry.rank), [1, 2, 3]);

    const profile = await levels.getProfile('guild-1', 'user-1');
    assert.equal(profile.rank, 2);
    assert.equal(profile.totalUsers, 3);
    assert.equal(profile.entry.xp, 30);

    const otherGuild = await levels.getProfile('guild-2', 'user-1');
    assert.equal(otherGuild.rank, 1);
    assert.equal(otherGuild.entry.xp, 90);
  });
});
