const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { fetchDuckImage } = require('../../lib/imageFeeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('duck')
    .setDescription('Fetch a random duck photo or GIF'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const image = await fetchDuckImage();
      const embed = createEmbed(interaction.client, {
        section: 'Images',
        title: 'Random duck',
        url: image.link,
        description: 'A fresh duck photo from **random-d.uk**.',
        color: COLORS.fun,
        image: image.url,
        fields: [
          { name: '📷 Source', value: image.source, inline: true },
          { name: '🙋 Requested by', value: interaction.user.username, inline: true },
        ],
        footer: 'A new duck every time',
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[images] /duck failed:', error);
      await interaction.editReply({
        content: 'Could not fetch a duck right now. Please try again in a moment.',
      });
    }
  },
};
