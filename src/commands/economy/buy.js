const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { CARD_THEMES } = require('../../lib/cardThemes');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { buyTheme } = require('../../lib/economy');

const PAID_THEMES = CARD_THEMES.filter((theme) => theme.price > 0);

function coins(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('en-US');
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
        content: 'The shop uses per-server coins. Run `/buy` in a server channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const themeId = interaction.options.getString('theme', true);

    try {
      const result = await buyTheme({
        guildId: interaction.guild.id,
        userId: interaction.user.id,
        themeId,
      });

      const embed = createEmbed(interaction.client, {
        section: 'Economy',
        title: 'Theme unlocked',
        description: `You bought **${result.theme.name}** and equipped it to your rank card.`,
        color: COLORS.success,
        fields: [
          { name: '💸 Price', value: `${coins(result.theme.price)} coins`, inline: true },
          { name: '💰 Balance', value: `${coins(result.balance)} coins`, inline: true },
          { name: '🎨 Theme', value: result.theme.name, inline: true },
        ],
        footer: 'See it with /rank  ·  change it with /rankcard',
      });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      if (error.code === 'already_owned') {
        await interaction.reply({
          content: 'You already own that theme. Equip it with `/rankcard`.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (error.code === 'insufficient') {
        await interaction.reply({
          content: `You have **${coins(error.balance)} coins**, but that theme costs **${coins(CARD_THEMES.find((theme) => theme.id === themeId)?.price)} coins**. Try \`/daily\` first.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (error.code === 'free_theme') {
        await interaction.reply({
          content: 'That theme is free and already available to everyone.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      console.error('[economy] /buy failed:', error);
      await interaction.reply({
        content: 'Could not complete that purchase right now. Please try again.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
