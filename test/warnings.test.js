const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const warnings = require('../src/lib/warnings');

const GUILD_ID = '910000000000000001';
const OTHER_GUILD_ID = '910000000000000002';
const USER_ID = '910000000000000003';
const OTHER_USER_ID = '910000000000000004';

async function withWarningsFile(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'zen-warnings-'));
  process.env.WARNINGS_FILE = path.join(directory, 'warnings.json');

  try {
    await run(process.env.WARNINGS_FILE);
  } finally {
    delete process.env.WARNINGS_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('warnings persist, list newest first and stay isolated per server', async () => {
  await withWarningsFile(async (file) => {
    const first = await warnings.addWarning({
      guildId: GUILD_ID,
      userId: USER_ID,
      username: 'Tester',
      moderatorId: OTHER_USER_ID,
      moderatorName: 'Mod',
      reason: 'First warning',
    });

    await new Promise((resolve) => setTimeout(resolve, 2));

    await warnings.addWarning({
      guildId: GUILD_ID,
      userId: USER_ID,
      username: 'Tester',
      moderatorId: OTHER_USER_ID,
      moderatorName: 'Mod',
      reason: 'Second warning',
    });

    await warnings.addWarning({
      guildId: OTHER_GUILD_ID,
      userId: USER_ID,
      username: 'Tester',
      moderatorId: OTHER_USER_ID,
      moderatorName: 'Mod',
      reason: 'Other server',
    });

    assert.equal(await warnings.countWarnings(GUILD_ID, USER_ID), 2);
    assert.equal(await warnings.countWarnings(OTHER_GUILD_ID, USER_ID), 1);

    const list = await warnings.listWarnings(GUILD_ID, USER_ID);
    assert.equal(list.length, 2);
    assert.equal(list[0].reason, 'Second warning');
    assert.equal(list[1].reason, 'First warning');

    const removedOne = await warnings.clearWarnings(GUILD_ID, USER_ID, first.id);
    assert.equal(removedOne.removed.length, 1);
    assert.equal(await warnings.countWarnings(GUILD_ID, USER_ID), 1);

    const cleared = await warnings.clearWarnings(GUILD_ID, USER_ID);
    assert.equal(cleared.removed.length, 1);
    assert.equal(await warnings.countWarnings(GUILD_ID, USER_ID), 0);
    assert.equal(await warnings.countWarnings(OTHER_GUILD_ID, USER_ID), 1);

    const state = JSON.parse(await fs.readFile(file, 'utf8'));
    assert.equal(state.warnings.length, 1);
    assert.equal(state.warnings[0].guildId, OTHER_GUILD_ID);
  });
});

test('warnings reject invalid servers, members and empty reasons', async () => {
  await withWarningsFile(async () => {
    await assert.rejects(
      warnings.addWarning({
        guildId: 'not-a-server',
        userId: USER_ID,
        reason: 'Nope',
      }),
      /valid server and member/,
    );

    await assert.rejects(
      warnings.addWarning({
        guildId: GUILD_ID,
        userId: 'not-a-member',
        reason: 'Nope',
      }),
      /valid server and member/,
    );

    await assert.rejects(
      warnings.addWarning({
        guildId: GUILD_ID,
        userId: USER_ID,
        reason: '   ',
      }),
      /reason is required/,
    );
  });
});
