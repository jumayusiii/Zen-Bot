const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  applyLevelReward,
  clearLevelReward,
  getLevelReward,
  setLevelReward,
} = require('../src/lib/levelRewards');

const GUILD_ID = '1308833568914407495';
const ROLE_ID = '1308833568914407496';

async function withLevelRewardsFile(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'legend-level-rewards-'));
  process.env.LEVEL_REWARDS_FILE = path.join(directory, 'level-rewards.json');

  try {
    await run();
  } finally {
    delete process.env.LEVEL_REWARDS_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function fakeRole() {
  return {
    id: ROLE_ID,
    name: 'Level 3',
    position: 10,
    managed: false,
    toString: () => `<@&${ROLE_ID}>`,
  };
}

function fakeMember({ hasRole = false, botPosition = 50, manageRoles = true } = {}) {
  const role = fakeRole();
  const added = [];

  return {
    added,
    member: {
      guild: {
        id: GUILD_ID,
        roles: {
          cache: new Map([[ROLE_ID, role]]),
          fetch: async () => role,
        },
        members: {
          me: {
            permissions: { has: () => manageRoles },
            roles: { highest: { position: botPosition } },
          },
        },
      },
      roles: {
        cache: new Map(hasRole ? [[ROLE_ID, role]] : []),
        add: async (target, reason) => added.push({ roleId: target.id, reason }),
      },
    },
  };
}

test('level reward configuration is saved, replaced and cleared', async () => {
  await withLevelRewardsFile(async () => {
    assert.equal(await getLevelReward(GUILD_ID), null);

    await setLevelReward({ guildId: GUILD_ID, roleId: ROLE_ID, level: 3 });
    const saved = await getLevelReward(GUILD_ID);
    assert.equal(saved.guildId, GUILD_ID);
    assert.equal(saved.roleId, ROLE_ID);
    assert.equal(saved.level, 3);
    assert.ok(saved.updatedAt > 0);

    await setLevelReward({ guildId: GUILD_ID, roleId: ROLE_ID, level: 5 });
    assert.equal((await getLevelReward(GUILD_ID)).level, 5);

    const removed = await clearLevelReward(GUILD_ID);
    assert.equal(removed.level, 5);
    assert.equal(await getLevelReward(GUILD_ID), null);
    assert.equal(await clearLevelReward(GUILD_ID), null);
  });
});

test('applyLevelReward grants the role only when eligible and assignable', async () => {
  await withLevelRewardsFile(async () => {
    await setLevelReward({ guildId: GUILD_ID, roleId: ROLE_ID, level: 3 });

    const below = fakeMember();
    assert.deepEqual(await applyLevelReward(below.member, 2), {
      assigned: false,
      reason: 'below_level',
    });
    assert.equal(below.added.length, 0);

    const eligible = fakeMember();
    const granted = await applyLevelReward(eligible.member, 3);
    assert.equal(granted.assigned, true);
    assert.equal(granted.role.id, ROLE_ID);
    assert.equal(eligible.added.length, 1);
    assert.match(eligible.added[0].reason, /Level 3 reward/);

    const alreadyHas = fakeMember({ hasRole: true });
    assert.equal((await applyLevelReward(alreadyHas.member, 4)).reason, 'already_has');
    assert.equal(alreadyHas.added.length, 0);

    const noPermission = fakeMember({ manageRoles: false });
    assert.equal((await applyLevelReward(noPermission.member, 4)).reason, 'missing_permission');

    const roleTooHigh = fakeMember({ botPosition: 5 });
    assert.equal((await applyLevelReward(roleTooHigh.member, 4)).reason, 'role_too_high');
  });
});
