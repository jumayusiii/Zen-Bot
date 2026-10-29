const fs = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const { PermissionFlagsBits } = require('discord.js');

const DEFAULT_FILE = path.join(__dirname, '..', '..', 'data', 'level-rewards.json');
const MIN_LEVEL = 1;
const MAX_LEVEL = 500;
const MAX_REWARDS = 1000;
const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);

let stateQueue = Promise.resolve();

function levelRewardsFile() {
  return process.env.LEVEL_REWARDS_FILE
    ? path.resolve(process.env.LEVEL_REWARDS_FILE)
    : DEFAULT_FILE;
}

function cleanText(value, maxLength) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function isSnowflake(value) {
  return /^\d{15,20}$/.test(String(value ?? ''));
}

function normalizeReward(value) {
  if (!value || typeof value !== 'object') return null;

  const guildId = cleanText(value.guildId, 32);
  const roleId = cleanText(value.roleId, 32);
  const level = Number(value.level);
  const updatedAt = Number(value.updatedAt);

  if (!isSnowflake(guildId) || !isSnowflake(roleId)) return null;
  if (!Number.isInteger(level) || level < MIN_LEVEL || level > MAX_LEVEL) return null;

  return {
    guildId,
    roleId,
    level,
    updatedAt: Number.isFinite(updatedAt) && updatedAt > 0 ? updatedAt : 0,
  };
}

async function readState() {
  try {
    const parsed = JSON.parse(await fs.readFile(levelRewardsFile(), 'utf8'));
    const values = Array.isArray(parsed) ? parsed : parsed?.rewards;
    if (!Array.isArray(values)) throw new Error('level reward file has an unexpected shape');

    const unique = new Map();
    for (const value of values) {
      const reward = normalizeReward(value);
      if (reward && !unique.has(reward.guildId)) unique.set(reward.guildId, reward);
    }

    return { version: 1, rewards: [...unique.values()] };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[levelRewards] Could not read ${levelRewardsFile()}: ${error.message}`);
    }
    return { version: 1, rewards: [] };
  }
}

async function replaceFile(temporary, file) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await fs.rename(temporary, file);
      return;
    } catch (error) {
      if (!RETRYABLE_RENAME_CODES.has(error.code) || attempt >= 4) throw error;
      await delay(25 * (attempt + 1));
    }
  }
}

async function writeState(state) {
  state.rewards = state.rewards
    .sort((a, b) => a.guildId.localeCompare(b.guildId))
    .slice(0, MAX_REWARDS);

  const file = levelRewardsFile();
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });

  try {
    await fs.writeFile(
      temporary,
      `${JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        rewards: state.rewards,
      }, null, 2)}\n`,
      'utf8',
    );
    await replaceFile(temporary, file);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

function withState(operation) {
  const run = stateQueue.then(async () => {
    const state = await readState();
    const result = await operation(state);
    await writeState(state);
    return result;
  });

  stateQueue = run.catch(() => {});
  return run;
}

function cloneReward(reward) {
  return reward ? { ...reward } : null;
}

async function getLevelReward(guildId) {
  const state = await readState();
  return cloneReward(state.rewards.find((reward) => reward.guildId === guildId) ?? null);
}

/**
 * Saves one role reward per server. Setting a new role or level replaces the
 * previous configuration for that server.
 *
 * @param {{guildId: string, roleId: string, level: number}} input
 * @returns {Promise<object>}
 */
async function setLevelReward({ guildId, roleId, level }) {
  const reward = normalizeReward({
    guildId,
    roleId,
    level,
    updatedAt: Date.now(),
  });

  if (!reward) {
    throw new Error('Choose a valid role and a level between 1 and 500.');
  }

  await withState((state) => {
    state.rewards = state.rewards.filter((item) => item.guildId !== reward.guildId);
    state.rewards.push(reward);
  });

  return cloneReward(reward);
}

async function clearLevelReward(guildId) {
  return withState((state) => {
    const index = state.rewards.findIndex((reward) => reward.guildId === guildId);
    if (index === -1) return null;

    const [removed] = state.rewards.splice(index, 1);
    return cloneReward(removed);
  });
}

/**
 * Assigns the configured reward role when a member reaches its level. The
 * function returns a reason instead of throwing so a failed role assignment
 * never interrupts the level-up announcement.
 *
 * @param {import('discord.js').GuildMember} member
 * @param {number} level
 * @returns {Promise<{assigned: boolean, reason: string, role?: object, reward?: object}>}
 */
async function applyLevelReward(member, level) {
  if (!member?.guild || !Number.isInteger(level)) {
    return { assigned: false, reason: 'invalid_member' };
  }

  const reward = await getLevelReward(member.guild.id);
  if (!reward) return { assigned: false, reason: 'not_configured' };
  if (level < reward.level) return { assigned: false, reason: 'below_level' };
  if (member.roles?.cache?.has?.(reward.roleId)) {
    return { assigned: false, reason: 'already_has' };
  }

  const me = member.guild.members?.me;
  if (!me?.permissions?.has?.(PermissionFlagsBits.ManageRoles)) {
    return { assigned: false, reason: 'missing_permission' };
  }

  let role = member.guild.roles?.cache?.get?.(reward.roleId) ?? null;
  if (!role && typeof member.guild.roles?.fetch === 'function') {
    role = await member.guild.roles.fetch(reward.roleId).catch(() => null);
  }

  if (!role) return { assigned: false, reason: 'missing_role' };
  if (role.managed) return { assigned: false, reason: 'managed_role' };

  const botPosition = me.roles?.highest?.position;
  if (Number.isFinite(botPosition) && Number.isFinite(role.position) && role.position >= botPosition) {
    return { assigned: false, reason: 'role_too_high' };
  }

  if (typeof member.roles?.add !== 'function') {
    return { assigned: false, reason: 'invalid_member' };
  }

  await member.roles.add(role, `Level ${level} reward`);
  return { assigned: true, reason: 'granted', role, reward };
}

module.exports = {
  MAX_LEVEL,
  MIN_LEVEL,
  applyLevelReward,
  clearLevelReward,
  getLevelReward,
  levelRewardsFile,
  setLevelReward,
};
