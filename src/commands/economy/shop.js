const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { CARD_THEMES } = require('../../lib/cardThemes');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { getAccount } = require('../../lib/economy');
const { getInteractionLanguage, t } = require('../../lib/i18n');

function coins(value, language = 'en') {
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString(locale);
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('shop')
    .setDescription('Browse rank card themes you can buy with coins'),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: t('en', 'economy.shop.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const language = await getInteractionLanguage(interaction);

    try {
      const account = await getAccount(interaction.guild.id, interaction.user.id);
      const fields = CARD_THEMES.map((theme) => {
        const owned = account.owned.includes(theme.id);
        const price = theme.price === 0
          ? t(language, 'common.free')
          : t(language, 'economy.shop.price', { coins: coins(theme.price, language) });
        const current = account.theme === theme.id ? `  ·  ${t(language, 'economy.shop.equipped')}` : '';
        return {
          name: `${theme.name}  ·  ${price}${owned ? `  ·  ${t(language, 'economy.shop.owned')}` : ''}${current}`,
          value: t(language, `economy.themes.${theme.id}`, {}, theme.description),
          inline: false,
        };
      });

      const embed = createEmbed(interaction.client, {
        section: t(language, 'help.tabs.economy'),
        title: t(language, 'economy.shop.title'),
        description: t(language, 'economy.shop.description', {
          coins: coins(account.balance, language),
        }),
        color: COLORS.game,
        fields,
        footer: t(language, 'economy.shop.footer'),
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[economy] /shop failed:', error);
      await interaction.reply({
        content: t(language, 'economy.shop.error'),
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
