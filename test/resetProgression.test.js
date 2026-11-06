const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { resetProgression } = require('../scripts/reset-progression');

test('reset-progression previews, backs up and clears every guild', async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'zen-reset-'));
  const levelsPath = path.join(directory, 'levels.json');
  const economyPath = path.join(directory, 'economy.json');
  const previousLevelsFile = process.env.LEVELS_FILE;
  const previousEconomyFile = process.env.ECONOMY_FILE;

  await fs.writeFile(levelsPath, JSON.stringify({
    version: 1,
    users: [
      { guildId: 'guild-1', userId: 'user-1', xp: 650 },
      { guildId: 'guild-2', userId: 'user-1', xp: 672 },
    ],
  }), 'utf8');
  await fs.writeFile(economyPath, JSON.stringify({
    version: 1,
    users: [
      { guildId: 'guild-1', userId: 'user-1', balance: 175 },
    ],
  }), 'utf8');

  process.env.LEVELS_FILE = levelsPath;
  process.env.ECONOMY_FILE = economyPath;

  try {
    const dryRun = resetProgression({ now: new Date('2026-11-06T12:00:00.000Z') });
    assert.equal(dryRun.confirmed, false);
    assert.equal(dryRun.reset, false);
    assert.deepEqual(dryRun.targets.map((target) => target.records), [2, 1]);
    assert.equal(JSON.parse(await fs.readFile(levelsPath, 'utf8')).users.length, 2);
    assert.equal(JSON.parse(await fs.readFile(economyPath, 'utf8')).users.length, 1);

    const result = resetProgression({
      confirm: true,
      now: new Date('2026-11-06T12:01:00.000Z'),
    });

    assert.equal(result.confirmed, true);
    assert.equal(result.reset, true);
    assert.deepEqual(result.targets.map((target) => target.records), [2, 1]);

    for (const file of [levelsPath, economyPath]) {
      const cleared = JSON.parse(await fs.readFile(file, 'utf8'));
      assert.equal(cleared.version, 1);
      assert.deepEqual(cleared.users, []);
      assert.equal(cleared.updatedAt, '2026-11-06T12:01:00.000Z');
    }

    for (const target of result.targets) {
      assert.ok(target.backup);
      const backup = JSON.parse(await fs.readFile(target.backup, 'utf8'));
      assert.equal(backup.users.length, target.records);
    }
  } finally {
    if (previousLevelsFile === undefined) delete process.env.LEVELS_FILE;
    else process.env.LEVELS_FILE = previousLevelsFile;
    if (previousEconomyFile === undefined) delete process.env.ECONOMY_FILE;
    else process.env.ECONOMY_FILE = previousEconomyFile;
    await fs.rm(directory, { recursive: true, force: true });
  }
});
