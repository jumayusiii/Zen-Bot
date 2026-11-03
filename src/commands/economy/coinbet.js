const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { resolveCoinBet } = require('../../lib/economyGames');
const { MAX_WAGER, settleWager } = require('../../lib/economy');
const { getInteractionLanguage, t } = require('../../lib/i18n');

function localeFor(language) {
  return language === 'de' ? 'de-DE' : 'en-US';
}

function coins(value, language = 'en') {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString(localeFor(language));
}

function signedCoins(value, language = 'en') {
  const amount = Math.floor(Number(value) || 0);
  return `${amount >= 0 ? '+' : ''}${amount.toLocaleString(localeFor(language))}`;
}

function sideLabel(language, side) {
  return t(language, side === 'heads' ? 'economy.heads' : 'economy.tails');
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
        content: t('en', 'economy.coinbet.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const wager = interaction.options.getInteger('amount', true);
    const side = interaction.options.getString('side', true);
    await interaction.deferReply();

    const language = await getInteractionLanguage(interaction);

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
            section: t(language, 'help.tabs.economy'),
            title: t(language, game.won ? 'economy.coinbet.wonTitle' : 'economy.coinbet.lostTitle'),
            description: t(language, 'economy.coinbet.description', {
              side: sideLabel(language, game.result),
            }),
            color: game.won ? COLORS.success : COLORS.danger,
            fields: [
              { name: `🎯 ${t(language, 'economy.yourCall')}`, value: sideLabel(language, side), inline: true },
              { name: `🎲 ${t(language, 'economy.result')}`, value: sideLabel(language, game.result), inline: true },
              {
                name: `💰 ${t(language, 'economy.wager')}`,
                value: `${coins(settled.wager, language)} ${t(language, 'common.coins')}`,
                inline: true,
              },
              {
                name: `🏆 ${t(language, 'economy.return')}`,
                value: `${coins(settled.payout, language)} ${t(language, 'common.coins')}`,
                inline: true,
              },
              {
                name: `📈 ${t(language, 'economy.net')}`,
                value: `${signedCoins(settled.net, language)} ${t(language, 'common.coins')}`,
                inline: true,
              },
              {
                name: `👛 ${t(language, 'economy.balance')}`,
                value: `${coins(settled.balance, language)} ${t(language, 'common.coins')}`,
                inline: true,
              },
            ],
            footer: t(language, 'economy.coinbet.footer', { user: interaction.user.username }),
          }),
        ],
      });
    } catch (error) {
      if (error.code === 'insufficient') {
        await interaction.editReply({
          content: t(language, 'economy.coinbet.insufficient', {
            balance: coins(error.balance, language),
          }),
        });
        return;
      }

      if (error.code === 'invalid_wager') {
        await interaction.editReply({ content: t(language, 'economy.coinbet.invalidWager') });
        return;
      }

      if (error.code === 'wager_too_large') {
        await interaction.editReply({
          content: t(language, 'economy.coinbet.tooLarge', { max: coins(MAX_WAGER, language) }),
        });
        return;
      }

      console.error('[economy] /coinbet failed:', error);
      await interaction.editReply({
        content: t(language, 'economy.coinbet.error'),
      });
    }
  },
};
