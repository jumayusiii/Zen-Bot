const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { fetchShibaImage } = require('../../lib/imageFeeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('shiba')
    .setDescription('Fetch a random Shiba Inu photo'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const image = await fetchShibaImage();
      const embed = createEmbed(interaction.client, {
        section: 'Images',
        title: 'Random Shiba Inu',
        url: image.link,
        description: 'A fresh Shiba Inu photo from **shibe.online**.',
        color: COLORS.fun,
        image: image.url,
        fields: [
          { name: '📷 Source', value: image.source, inline: true },
          { name: '🙋 Requested by', value: interaction.user.username, inline: true },
        ],
        footer: 'A new shiba every time',
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[images] /shiba failed:', error);
      await interaction.editReply({
        content: 'Could not fetch a shiba right now. Please try again in a moment.',
      });
    }
  },
};
