const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { resolveSlotsBet } = require('../../lib/economyGames');
const { MAX_WAGER, settleWager } = require('../../lib/economy');

function coins(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('en-US');
}

function signedCoins(value) {
  const amount = Math.floor(Number(value) || 0);
  return `${amount >= 0 ? '+' : ''}${amount.toLocaleString('en-US')}`;
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('slotsbet')
    .setDescription('Wager coins on the slot machine — pairs pay 1.5×, triples up to 30×')
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription(`Coins to wager (1–${MAX_WAGER.toLocaleString('en-US')})`)
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(MAX_WAGER),
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: 'Coins are tracked per server. Run `/slotsbet` in a server channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const wager = interaction.options.getInteger('amount', true);
    await interaction.deferReply();

    try {
      const game = resolveSlotsBet({ wager });
      const settled = await settleWager({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        wager,
        payout: game.payout,
      });

      await interaction.editReply({
        embeds: [
          createEmbed(interaction.client, {
            section: 'Economy',
            title: game.outcome.label,
            description: `## ${game.reels.map((symbol) => symbol.emoji).join('  │  ')}\n${game.outcome.detail}`,
            color: game.payout > game.wager ? COLORS.success : COLORS.danger,
            fields: [
              { name: '🎰 Symbols', value: game.reels.map((symbol) => symbol.name).join(' · '), inline: true },
              { name: '✖️ Multiplier', value: `${game.multiplier}×`, inline: true },
              { name: '💰 Wager', value: `${coins(settled.wager)} coins`, inline: true },
              { name: '🏆 Return', value: `${coins(settled.payout)} coins`, inline: true },
              { name: '📈 Net', value: `${signedCoins(settled.net)} coins`, inline: true },
              { name: '👛 Balance', value: `${coins(settled.balance)} coins`, inline: true },
            ],
            footer: `Spun by ${interaction.user.username}  ·  pair 1.5×  ·  triples 3×–30×`,
          }),
        ],
      });
    } catch (error) {
      if (error.code === 'insufficient') {
        await interaction.editReply({
          content: `You only have **${coins(error.balance)} coins**. Choose a smaller wager or earn more with \`/work\` or \`/daily\`.`,
        });
        return;
      }

      if (error.code === 'invalid_wager' || error.code === 'wager_too_large') {
        await interaction.editReply({ content: error.message });
        return;
      }

      console.error('[economy] /slotsbet failed:', error);
      await interaction.editReply({
        content: 'Could not settle that spin right now. Please try again.',
      });
    }
  },
};
