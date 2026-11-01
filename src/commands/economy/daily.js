const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { claimDaily } = require('../../lib/economy');

function coins(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('en-US');
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily coins and build a streak'),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: 'Coins are tracked per server. Run `/daily` in a server channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const result = await claimDaily({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
      });

      if (!result.claimed) {
        const embed = createEmbed(interaction.client, {
          section: 'Economy',
          title: 'Daily reward',
          description: `You already collected today. The next reward is available <t:${Math.floor(result.nextAt / 1000)}:R>.`,
          color: COLORS.warning,
          fields: [
            { name: '🔥 Streak', value: `**${result.streak}** day${result.streak === 1 ? '' : 's'}`, inline: true },
            { name: '💰 Balance', value: `**${coins(result.balance)}** coins`, inline: true },
          ],
          footer: `Requested by ${interaction.user.username}`,
        });

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
      }

      const embed = createEmbed(interaction.client, {
        section: 'Economy',
        title: 'Daily reward claimed',
        description: `You collected **${coins(result.amount)} coins**. Come back tomorrow to keep the streak alive.`,
        color: COLORS.success,
        fields: [
          { name: '💰 Balance', value: `**${coins(result.balance)}** coins`, inline: true },
          { name: '🔥 Streak', value: `**${result.streak}** day${result.streak === 1 ? '' : 's'}`, inline: true },
          { name: '⏰ Next reward', value: `<t:${Math.floor(result.nextAt / 1000)}:R>`, inline: true },
        ],
        footer: 'Daily coins  ·  /shop to spend them',
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[economy] /daily failed:', error);
      await interaction.reply({
        content: 'Could not claim the daily reward right now. Please try again.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
