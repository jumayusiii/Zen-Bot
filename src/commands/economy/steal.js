const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  STEAL_COOLDOWN_MS,
  STEAL_MAX,
  STEAL_MIN,
  STEAL_SUCCESS_CHANCE,
  attemptSteal,
} = require('../../lib/economy');

const COOLDOWN_MINUTES = Math.round(STEAL_COOLDOWN_MS / 60000);
const CHANCE_PERCENT = Math.round(STEAL_SUCCESS_CHANCE * 100);

function coins(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('en-US');
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('steal')
    .setDescription(`Try to lift ${STEAL_MIN}–${STEAL_MAX} coins from the vault every ${COOLDOWN_MINUTES} minutes`),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: 'Coins are tracked per server. Run `/steal` in a server channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const result = await attemptSteal({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
      });

      if (result.reason === 'cooldown') {
        await interaction.reply({
          embeds: [
            createEmbed(interaction.client, {
              section: 'Economy',
              title: 'Lay low for a while',
              description: `The vault is watching. You can try another heist <t:${Math.floor(result.nextAt / 1000)}:R>.`,
              color: COLORS.warning,
              fields: [
                { name: '👛 Balance', value: `**${coins(result.balance)}** coins`, inline: true },
                { name: '⏰ Cooldown', value: `${COOLDOWN_MINUTES} minutes`, inline: true },
              ],
              footer: 'Steal  ·  /work  ·  /daily',
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
            title: result.stole ? 'Heist successful' : 'Heist failed',
            description: result.stole
              ? `You slipped **${coins(result.amount)} coins** out of the vault and into your wallet.`
              : 'The vault guard spotted you. You got away empty-handed.',
            color: result.stole ? COLORS.success : COLORS.danger,
            fields: [
              {
                name: result.stole ? '💰 Stolen' : '💨 Getaway',
                value: result.stole ? `${coins(result.amount)} coins` : 'Nothing',
                inline: true,
              },
              { name: '👛 Balance', value: `**${coins(result.balance)}** coins`, inline: true },
              {
                name: '⏰ Next attempt',
                value: `<t:${Math.floor(result.nextAt / 1000)}:R>`,
                inline: true,
              },
            ],
            footer: `Heist by ${interaction.user.username}  ·  ${CHANCE_PERCENT}% success  ·  ${COOLDOWN_MINUTES}-minute cooldown`,
          }),
        ],
      });
    } catch (error) {
      console.error('[economy] /steal failed:', error);
      await interaction.reply({
        content: 'Could not rob the vault right now. Please try again.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
