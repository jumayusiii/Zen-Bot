const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { fetchCatImage } = require('../../lib/imageFeeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('cat')
    .setDescription('Fetch a random cat photo'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const image = await fetchCatImage();
      const embed = createEmbed(interaction.client, {
        section: 'Images',
        title: 'Random cat',
        description: 'A fresh cat photo from **The Cat API**.',
        color: COLORS.fun,
        image: image.url,
        fields: [
          { name: '📷 Source', value: image.source, inline: true },
          { name: '🙋 Requested by', value: interaction.user.username, inline: true },
        ],
        footer: 'A new cat every time',
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[images] /cat failed:', error);
      await interaction.editReply({
        content: 'Could not fetch a cat right now. Please try again in a moment.',
      });
    }
  },
};
