const { Events } = require('discord.js');
const { awardLevelCoins } = require('../lib/economy');
const { COLORS, createEmbed } = require('../lib/embeds');
const { applyLevelReward } = require('../lib/levelRewards');
const { COOLDOWN_MS, awardMessageXp } = require('../lib/levels');

const lastAward = new Map();

function cooldownKey(guildId, userId) {
  return `${guildId}:${userId}`;
}

module.exports = {
  name: Events.MessageCreate,

  async execute(message) {
    if (!message.inGuild?.() || message.author?.bot || message.system) return;

    const now = Date.now();
    const key = cooldownKey(message.guildId, message.author.id);
    const previous = lastAward.get(key) ?? 0;

    // Avoid reading the level file for every message; the stored cooldown is
    // still enforced after a restart.
    if (now - previous < COOLDOWN_MS) return;

    if (lastAward.size > 10_000) lastAward.clear();

    try {
      const displayName =
        message.member?.displayName ??
        message.author.globalName ??
        message.author.username;

      const result = await awardMessageXp({
        guildId: message.guildId,
        userId: message.author.id,
        username: displayName,
        now,
      });

      if (!result.awarded) {
        // A restart clears the in-memory map. Reuse the stored timestamp so
        // the first message after a restart does not extend the cooldown.
        lastAward.set(
          key,
          Number.isFinite(result.entry?.lastXpAt) ? result.entry.lastXpAt : now,
        );
        return;
      }

      lastAward.set(key, now);
      console.log(
        `[levels] +${result.gain} XP for ${displayName} (${result.entry.xp} total, level ${result.level})`,
      );

      if (!result.leveledUp) return;

      let coinReward = null;
      try {
        coinReward = await awardLevelCoins({
          guildId: message.guildId,
          userId: message.author.id,
          fromLevel: result.previousLevel ?? result.level - 1,
          toLevel: result.level,
          now,
        });

        if (coinReward.awarded) {
          console.log(
            `[economy] +${coinReward.amount} coins for ${displayName} (level ${result.level}, balance ${coinReward.balance})`,
          );
        }
      } catch (error) {
        console.warn(`[levels] Could not award level coins: ${error.message}`);
      }

      let reward = null;
      try {
        reward = await applyLevelReward(message.member, result.level);
      } catch (error) {
        console.warn(`[levels] Could not assign the level reward: ${error.message}`);
      }

      if (
        reward &&
        !reward.assigned &&
        !['not_configured', 'below_level', 'already_has', 'invalid_member'].includes(reward.reason)
      ) {
        console.warn(`[levels] Level reward not assigned (${reward.reason}).`);
      }

      const rewardLine = reward?.assigned
        ? `\n\n🏅 You earned the **${reward.role.name}** role.`
        : '';
      const coinLine = coinReward?.awarded
        ? `\n\n🪙 **+${coinReward.amount} coins** — wallet balance **${coinReward.balance.toLocaleString('en-US')}**.`
        : '';

      const embed = createEmbed(message.client, {
        section: 'Levels',
        title: 'Level up',
        description: `🎉 **${displayName}** reached **level ${result.level}**!${rewardLine}${coinLine}`,
        color: COLORS.success,
        footer: 'Chat XP  ·  Level rewards',
      });

      await message.channel
        .send({
          embeds: [embed],
          allowedMentions: { parse: [] },
        })
        .catch((error) => {
          console.warn(`[levels] Could not announce a level up: ${error.message}`);
        });
    } catch (error) {
      lastAward.delete(key);
      console.error('[levels] Could not award message XP:', error.message);
    }
  },
};
