const { Events } = require('discord.js');
const { COLORS, createEmbed } = require('../lib/embeds');
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
    lastAward.set(key, now);

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

      if (!result.awarded || !result.leveledUp) return;

      const embed = createEmbed(message.client, {
        section: 'Levels',
        title: 'Level up',
        description: `🎉 **${displayName}** reached **level ${result.level}**!`,
        color: COLORS.success,
        footer: 'Chat XP',
      });

      await message.channel
        .send({
          content: `<@${message.author.id}>`,
          embeds: [embed],
          allowedMentions: { users: [message.author.id] },
        })
        .catch((error) => {
          console.warn(`[levels] Could not announce a level up: ${error.message}`);
        });
    } catch (error) {
      console.error('[levels] Could not award message XP:', error.message);
    }
  },
};
