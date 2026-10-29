const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const moderation = require('../src/lib/moderation');

async function withModerationFile(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'legend-moderation-'));
  process.env.MODERATION_FILE = path.join(directory, 'moderation.json');

  try {
    await run(process.env.MODERATION_FILE);
  } finally {
    delete process.env.MODERATION_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function fakeMember(id, position) {
  const highest = {
    position,
    comparePositionTo(other) {
      return position - other.position;
    },
  };

  return { id, roles: { highest } };
}

const GUILD_ID = '1308833568914407495';
const USER_ID = '649645473774436353';
const OTHER_USER_ID = '649645473774436354';

test('moderation durations cover Discord timeout limits and permanent bans', () => {
  assert.ok(moderation.MUTE_DURATIONS.length > 0);
  assert.ok(
    moderation.MUTE_DURATIONS.every(
      (duration) => duration.ms > 0 && duration.ms <= moderation.MAX_TIMEOUT_MS,
    ),
  );
  assert.equal(moderation.durationByValue(moderation.MUTE_DURATIONS, '28d').ms, moderation.MAX_TIMEOUT_MS);
  assert.equal(moderation.durationByValue(moderation.BAN_DURATIONS, 'permanent').ms, 0);
  assert.deepEqual(
    moderation.DELETE_MESSAGE_CHOICES.map((choice) => choice.value),
    [0, 3600, 21600, 86400, 604800],
  );
});

test('target checks protect the owner, the bot and higher roles', () => {
  const guild = {
    ownerId: 'owner-id',
    members: { me: fakeMember('bot-id', 50) },
  };
  const moderator = fakeMember('moderator-id', 40);

  assert.equal(
    moderation.targetModerationError({
      guild,
      member: fakeMember('target-id', 30),
      moderator,
    }),
    null,
  );
  assert.match(
    moderation.targetModerationError({
      guild,
      member: fakeMember('target-id', 50),
      moderator,
    }),
    /at or above mine/,
  );
  assert.match(
    moderation.targetModerationError({
      guild,
      member: fakeMember('target-id', 40),
      moderator,
    }),
    /at or above yours/,
  );
  assert.match(
    moderation.targetModerationError({
      guild,
      member: fakeMember('moderator-id', 10),
      moderator,
    }),
    /yourself/,
  );
  assert.match(
    moderation.targetModerationError({
      guild,
      member: fakeMember('bot-id', 10),
      moderator,
    }),
    /myself/,
  );
  assert.match(
    moderation.targetModerationError({
      guild,
      member: fakeMember('owner-id', 10),
      moderator,
    }),
    /owner/,
  );
  assert.match(
    moderation.targetModerationError({ guild, member: null, moderator }),
    /not in this server/,
  );
});

test('scheduled unbans persist, deduplicate and can be cancelled', async () => {
  await withModerationFile(async () => {
    const now = Date.now();
    const first = await moderation.scheduleUnban({
      guildId: GUILD_ID,
      userId: USER_ID,
      username: 'Tester',
      moderatorId: 'moderator-id',
      reason: 'Cool down',
      dueAt: now + 60_000,
    });

    assert.equal(first.userId, USER_ID);
    assert.equal((await moderation.getDueUnbans(now)).length, 0);

    const due = await moderation.getDueUnbans(now + 61_000);
    assert.equal(due.length, 1);
    assert.equal(due[0].id, first.id);
    assert.equal(due[0].reason, 'Cool down');

    await moderation.scheduleUnban({
      guildId: GUILD_ID,
      userId: USER_ID,
      username: 'Tester',
      moderatorId: 'moderator-id',
      reason: 'Longer cool down',
      dueAt: now + 120_000,
    });

    const updated = await moderation.getDueUnbans(now + 121_000);
    assert.equal(updated.length, 1);
    assert.equal(updated[0].reason, 'Longer cool down');

    const cancelled = await moderation.cancelScheduledUnban(GUILD_ID, USER_ID);
    assert.equal(cancelled.userId, USER_ID);
    assert.equal(await moderation.cancelScheduledUnban(GUILD_ID, USER_ID), null);
    assert.equal((await moderation.getDueUnbans(now + 121_000)).length, 0);
  });
});

test('the dispatcher lifts due bans and clears their schedule', async () => {
  await withModerationFile(async () => {
    const removed = [];
    const guild = {
      id: GUILD_ID,
      bans: {
        remove: async (userId, reason) => {
          removed.push({ userId, reason });
        },
      },
    };
    const client = { guilds: { cache: new Map([[guild.id, guild]]) } };
    const logger = { log() {}, warn() {}, error() {} };

    await moderation.scheduleUnban({
      guildId: GUILD_ID,
      userId: OTHER_USER_ID,
      username: 'Tester',
      dueAt: Date.now() + 50,
    });

    const lifted = await moderation.processDueUnbans(client, {
      now: Date.now() + 1000,
      logger,
    });

    assert.equal(lifted, 1);
    assert.equal(removed.length, 1);
    assert.equal(removed[0].userId, OTHER_USER_ID);
    assert.match(removed[0].reason, /Temporary ban expired/);
    assert.equal((await moderation.getDueUnbans(Date.now() + 1000)).length, 0);
  });
});
