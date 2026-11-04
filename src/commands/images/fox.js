const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { fetchFoxImage } = require('../../lib/imageFeeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('fox')
    .setDescription('Fetch a random fox photo'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const image = await fetchFoxImage();
      const embed = createEmbed(interaction.client, {
        section: 'Images',
        title: 'Random fox',
        url: image.link,
        description: 'A fresh fox photo from **randomfox.ca**.',
        color: COLORS.fun,
        image: image.url,
        fields: [
          { name: '📷 Source', value: image.source, inline: true },
          { name: '🙋 Requested by', value: interaction.user.username, inline: true },
        ],
        footer: 'A new fox every time',
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[images] /fox failed:', error);
      await interaction.editReply({
        content: 'Could not fetch a fox right now. Please try again in a moment.',
      });
    }
  },
};
