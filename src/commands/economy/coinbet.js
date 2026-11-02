const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { resolveCoinBet } = require('../../lib/economyGames');
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
    .setName('coinbet')
    .setDescription('Wager coins on a coin flip — win 1.9× your stake')
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription(`Coins to wager (1–${MAX_WAGER.toLocaleString('en-US')})`)
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(MAX_WAGER),
    )
    .addStringOption((option) =>
      option
        .setName('side')
        .setDescription('Call the side before the flip')
        .setRequired(true)
        .addChoices(
          { name: 'Heads', value: 'heads' },
          { name: 'Tails', value: 'tails' },
        ),
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: 'Coins are tracked per server. Run `/coinbet` in a server channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const wager = interaction.options.getInteger('amount', true);
    const side = interaction.options.getString('side', true);
    await interaction.deferReply();

    try {
      const game = resolveCoinBet({ side, wager });
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
            title: game.won ? 'The coin landed your way' : 'The coin landed against you',
            description: `The coin landed on **${game.result === 'heads' ? 'Heads' : 'Tails'}**.`,
            color: game.won ? COLORS.success : COLORS.danger,
            fields: [
              { name: '🎯 Your call', value: side === 'heads' ? 'Heads' : 'Tails', inline: true },
              { name: '🎲 Result', value: game.result === 'heads' ? 'Heads' : 'Tails', inline: true },
              { name: '💰 Wager', value: `${coins(settled.wager)} coins`, inline: true },
              { name: '🏆 Return', value: `${coins(settled.payout)} coins`, inline: true },
              { name: '📈 Net', value: `${signedCoins(settled.net)} coins`, inline: true },
              { name: '👛 Balance', value: `${coins(settled.balance)} coins`, inline: true },
            ],
            footer: `Wagered by ${interaction.user.username}  ·  1.9× on a win`,
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

      console.error('[economy] /coinbet failed:', error);
      await interaction.editReply({
        content: 'Could not settle that coin flip right now. Please try again.',
      });
    }
  },
};
