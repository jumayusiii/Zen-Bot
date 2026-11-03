const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { CARD_THEMES, getCardTheme } = require('../../lib/cardThemes');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { getAccount, setCardTheme } = require('../../lib/economy');
const { getInteractionLanguage, t } = require('../../lib/i18n');

function coins(value, language = 'en') {
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString(locale);
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('rankcard')
    .setDescription('Customize the wallpaper and colors of your rank card')
    .addStringOption((option) =>
      option
        .setName('theme')
        .setDescription('The card theme to equip')
        .addChoices(...CARD_THEMES.map((theme) => ({ name: theme.name, value: theme.id }))),
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: t('en', 'levels.card.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const language = await getInteractionLanguage(interaction);
    const themeId = interaction.options.getString('theme');

    try {
      const account = await getAccount(interaction.guild.id, interaction.user.id);

      if (!themeId) {
        const current = getCardTheme(account.theme);
        const owned = account.owned.map((id) => getCardTheme(id).name).join('  ·  ');
        const embed = createEmbed(interaction.client, {
          section: t(language, 'help.tabs.levels'),
          title: t(language, 'levels.card.styleTitle'),
          description: t(language, 'levels.card.styleDescription', { theme: current.name }),
          color: COLORS.brand,
          fields: [
            {
              name: `🎨 ${t(language, 'common.equipped')}`,
              value: current.name,
              inline: true,
            },
            {
              name: `💰 ${t(language, 'economy.balance')}`,
              value: `${coins(account.balance, language)} ${t(language, 'common.coins')}`,
              inline: true,
            },
            {
              name: `🖼️ ${t(language, 'levels.card.ownedThemes')}`,
              value: owned,
              inline: false,
            },
          ],
          footer: t(language, 'levels.card.styleFooter'),
        });

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
      }

      if (!account.owned.includes(themeId)) {
        const theme = getCardTheme(themeId);
        await interaction.reply({
          content: t(language, 'levels.card.notOwned', {
            theme: theme.name,
            price: coins(theme.price, language),
          }),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const result = await setCardTheme({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        themeId,
      });

      const embed = createEmbed(interaction.client, {
        section: t(language, 'help.tabs.levels'),
        title: t(language, 'levels.card.equippedTitle'),
        description: t(language, 'levels.card.equippedDescription', { theme: result.theme.name }),
        color: COLORS.success,
        fields: [
          { name: `🎨 ${t(language, 'economy.buy.theme')}`, value: result.theme.name, inline: true },
          {
            name: `💰 ${t(language, 'economy.balance')}`,
            value: `${coins(result.balance, language)} ${t(language, 'common.coins')}`,
            inline: true,
          },
        ],
        footer: t(language, 'levels.card.equippedFooter'),
      });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      if (error.code === 'not_owned') {
        const theme = getCardTheme(themeId);
        await interaction.reply({
          content: t(language, 'levels.card.notOwned', {
            theme: theme.name,
            price: coins(theme.price, language),
          }),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      console.error('[levels] /rankcard failed:', error);
      await interaction.reply({
        content: t(language, 'levels.card.error'),
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
