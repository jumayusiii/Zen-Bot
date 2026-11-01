const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { CARD_THEMES, getCardTheme } = require('../../lib/cardThemes');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { getAccount, setCardTheme } = require('../../lib/economy');

function coins(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('en-US');
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
        content: 'Rank cards are per server. Run `/rankcard` in a server channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const account = await getAccount(interaction.guild.id, interaction.user.id);
      const themeId = interaction.options.getString('theme');

      if (!themeId) {
        const current = getCardTheme(account.theme);
        const owned = account.owned.map((id) => getCardTheme(id).name).join('  ·  ');
        const embed = createEmbed(interaction.client, {
          section: 'Levels',
          title: 'Rank card style',
          description: `Your card currently uses **${current.name}**.\nChoose another owned theme with \`/rankcard theme:<name>\`.`,
          color: COLORS.brand,
          fields: [
            { name: '🎨 Equipped', value: current.name, inline: true },
            { name: '💰 Balance', value: `${coins(account.balance)} coins`, inline: true },
            { name: '🖼️ Owned themes', value: owned, inline: false },
          ],
          footer: 'Buy more themes in /shop  ·  Preview with /rank',
        });

        await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
        return;
      }

      if (!account.owned.includes(themeId)) {
        const theme = getCardTheme(themeId);
        await interaction.reply({
          content: `You do not own **${theme.name}** yet. Buy it in \`/shop\` for **${coins(theme.price)} coins**.`,
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
        section: 'Levels',
        title: 'Card theme equipped',
        description: `Your rank card now uses **${result.theme.name}**.\nOpen \`/rank\` to see it.`,
        color: COLORS.success,
        fields: [
          { name: '🎨 Theme', value: result.theme.name, inline: true },
          { name: '💰 Balance', value: `${coins(result.balance)} coins`, inline: true },
        ],
        footer: 'Change it again with /rankcard  ·  More in /shop',
      });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      if (error.code === 'not_owned') {
        await interaction.reply({
          content: error.message,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      console.error('[levels] /rankcard failed:', error);
      await interaction.reply({
        content: 'Could not update your rank card right now. Please try again.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
