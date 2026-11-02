const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { claimWork } = require('../../lib/economy');

function coins(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('en-US');
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('work')
    .setDescription('Work a short shift for coins every 45 minutes'),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: 'Coins are tracked per server. Run `/work` in a server channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const result = await claimWork({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
      });

      if (!result.worked) {
        await interaction.reply({
          embeds: [
            createEmbed(interaction.client, {
              section: 'Economy',
              title: 'You are already clocked in',
              description: `Your next shift is available <t:${Math.floor(result.nextAt / 1000)}:R>.`,
              color: COLORS.warning,
              fields: [
                { name: '💰 Balance', value: `**${coins(result.balance)}** coins`, inline: true },
              ],
              footer: 'Work  ·  /daily  ·  /coinbet  ·  /slotsbet',
            }),
          ],
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await interaction.reply({
        embeds: [
          createEmbed(interaction.client, {
            section: 'Economy',
            title: 'Shift complete',
            description: `You earned **${coins(result.amount)} coins** for a short shift.`,
            color: COLORS.success,
            fields: [
              { name: '💰 Balance', value: `**${coins(result.balance)}** coins`, inline: true },
              {
                name: '⏰ Next shift',
                value: `<t:${Math.floor(result.nextAt / 1000)}:R>`,
                inline: true,
              },
            ],
            footer: `Worked by ${interaction.user.username}  ·  spend it in /shop`,
          }),
        ],
      });
    } catch (error) {
      console.error('[economy] /work failed:', error);
      await interaction.reply({
        content: 'Could not clock you in right now. Please try again.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
