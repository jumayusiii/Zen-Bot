const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const locks = require('../src/lib/channelLocks');

const GUILD_ID = '910000000000000001';
const CHANNEL_ID = '910000000000000002';
const MODERATOR_ID = '910000000000000003';

async function withLocksFile(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'zen-channel-locks-'));
  process.env.CHANNEL_LOCKS_FILE = path.join(directory, 'channel-locks.json');

  try {
    await run(process.env.CHANNEL_LOCKS_FILE);
  } finally {
    delete process.env.CHANNEL_LOCKS_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('channel locks save the previous setting and can be cleared', async () => {
  await withLocksFile(async (file) => {
    assert.equal(await locks.getChannelLock(GUILD_ID, CHANNEL_ID), null);

    const saved = await locks.saveChannelLock({
      guildId: GUILD_ID,
      channelId: CHANNEL_ID,
      previous: 'allow',
      moderatorId: MODERATOR_ID,
      reason: 'Raid',
    });

    assert.equal(saved.previous, 'allow');
    assert.equal(saved.reason, 'Raid');

    const stored = await locks.getChannelLock(GUILD_ID, CHANNEL_ID);
    assert.equal(stored.channelId, CHANNEL_ID);
    assert.equal(stored.moderatorId, MODERATOR_ID);

    const state = JSON.parse(await fs.readFile(file, 'utf8'));
    assert.equal(state.locks.length, 1);

    const cleared = await locks.clearChannelLock(GUILD_ID, CHANNEL_ID);
    assert.equal(cleared.previous, 'allow');
    assert.equal(await locks.getChannelLock(GUILD_ID, CHANNEL_ID), null);
  });
});

test('channel locks reject invalid ids and permission states', async () => {
  await withLocksFile(async () => {
    await assert.rejects(
      locks.saveChannelLock({
        guildId: 'not-a-server',
        channelId: CHANNEL_ID,
        previous: 'allow',
      }),
      /valid server and channel/,
    );

    await assert.rejects(
      locks.saveChannelLock({
        guildId: GUILD_ID,
        channelId: CHANNEL_ID,
        previous: 'sometimes',
      }),
      /previous permission state/,
    );
  });
});
