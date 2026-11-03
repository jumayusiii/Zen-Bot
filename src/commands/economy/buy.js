const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { CARD_THEMES } = require('../../lib/cardThemes');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { buyTheme } = require('../../lib/economy');
const { getInteractionLanguage, t } = require('../../lib/i18n');

const PAID_THEMES = CARD_THEMES.filter((theme) => theme.price > 0);

function coins(value, language = 'en') {
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString(locale);
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy a rank card theme with your coins')
    .addStringOption((option) =>
      option
        .setName('theme')
        .setDescription('The theme to buy')
        .setRequired(true)
        .addChoices(...PAID_THEMES.map((theme) => ({ name: theme.name, value: theme.id }))),
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: t('en', 'economy.buy.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const themeId = interaction.options.getString('theme', true);
    const language = await getInteractionLanguage(interaction);

    try {
      const result = await buyTheme({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        themeId,
      });

      const embed = createEmbed(interaction.client, {
        section: t(language, 'help.tabs.economy'),
        title: t(language, 'economy.buy.title'),
        description: t(language, 'economy.buy.description', { theme: result.theme.name }),
        color: COLORS.success,
        fields: [
          {
            name: `💸 ${t(language, 'economy.buy.price')}`,
            value: `${coins(result.theme.price, language)} ${t(language, 'common.coins')}`,
            inline: true,
          },
          {
            name: `💰 ${t(language, 'economy.balance')}`,
            value: `${coins(result.balance, language)} ${t(language, 'common.coins')}`,
            inline: true,
          },
          { name: `🎨 ${t(language, 'economy.buy.theme')}`, value: result.theme.name, inline: true },
        ],
        footer: t(language, 'economy.buy.footer'),
      });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      if (error.code === 'already_owned') {
        await interaction.reply({
          content: t(language, 'economy.buy.alreadyOwned'),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (error.code === 'insufficient') {
        await interaction.reply({
          content: t(language, 'economy.buy.insufficient', {
            balance: coins(error.balance, language),
            price: coins(CARD_THEMES.find((theme) => theme.id === themeId)?.price, language),
          }),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (error.code === 'free_theme') {
        await interaction.reply({
          content: t(language, 'economy.buy.freeTheme'),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      console.error('[economy] /buy failed:', error);
      await interaction.reply({
        content: t(language, 'economy.buy.error'),
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
