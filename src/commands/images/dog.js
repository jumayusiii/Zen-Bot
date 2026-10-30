const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { fetchDogImage } = require('../../lib/imageFeeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('dog')
    .setDescription('Fetch a random dog photo'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const image = await fetchDogImage();
      const breed = image.breed
        ? image.breed.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
        : null;
      const embed = createEmbed(interaction.client, {
        section: 'Images',
        title: 'Random dog',
        description: 'A fresh dog photo from **Dog CEO**.',
        color: COLORS.fun,
        image: image.url,
        fields: [
          { name: '🐾 Breed', value: breed ?? 'Unknown', inline: true },
          { name: '📷 Source', value: image.source, inline: true },
          { name: '🙋 Requested by', value: interaction.user.username, inline: true },
        ],
        footer: 'A new dog every time',
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[images] /dog failed:', error);
      await interaction.editReply({
        content: 'Could not fetch a dog right now. Please try again in a moment.',
      });
    }
  },
};
