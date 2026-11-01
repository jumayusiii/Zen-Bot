const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { fetchAnimalMeme } = require('../../lib/imageFeeds');

function truncate(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('animalmeme')
    .setDescription('Fetch a random animal meme'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const meme = await fetchAnimalMeme();
      const details = [
        meme.source,
        meme.ups > 0 ? `⬆ ${meme.ups.toLocaleString('en-US')}` : null,
      ]
        .filter(Boolean)
        .join(' · ');

      const embed = createEmbed(interaction.client, {
        section: 'Images',
        title: truncate(meme.title, 256),
        url: meme.link,
        image: meme.url,
        color: COLORS.fun,
        description: `A fresh animal meme from **${details}**.`,
        fields: [
          { name: '🐾 Community', value: meme.source, inline: true },
          { name: '🙋 Requested by', value: interaction.user.username, inline: true },
        ],
        footer: 'Animal memes from public Reddit feeds',
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[images] /animalmeme failed:', error);
      await interaction.editReply({
        content: 'Could not fetch an animal meme right now. Please try again in a moment.',
      });
    }
  },
};
