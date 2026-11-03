const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { getCardTheme } = require('../../lib/cardThemes');
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
    .setName('inventory')
    .setDescription('See the rank card themes you own'),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: t('en', 'economy.inventory.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const language = await getInteractionLanguage(interaction);

    try {
      const account = await getAccount(interaction.guild.id, interaction.user.id);
      const current = getCardTheme(account.theme);
      const owned = account.owned
        .map((id) => getCardTheme(id).name)
        .join('  ·  ');

      const embed = createEmbed(interaction.client, {
        section: t(language, 'help.tabs.economy'),
        title: t(language, 'economy.inventory.title'),
        description: t(
          language,
          account.owned.length === 1
            ? 'economy.inventory.descriptionOne'
            : 'economy.inventory.descriptionMany',
          { count: account.owned.length },
        ),
        color: COLORS.game,
        fields: [
          { name: `🎨 ${t(language, 'economy.inventory.equipped')}`, value: current.name, inline: true },
          {
            name: `💰 ${t(language, 'economy.balance')}`,
            value: `${coins(account.balance, language)} ${t(language, 'common.coins')}`,
            inline: true,
          },
          {
            name: `🖼️ ${t(language, 'economy.inventory.ownedThemes')}`,
            value: owned,
            inline: false,
          },
        ],
        footer: t(language, 'economy.inventory.footer'),
      });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error('[economy] /inventory failed:', error);
      await interaction.reply({
        content: t(language, 'economy.inventory.error'),
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
