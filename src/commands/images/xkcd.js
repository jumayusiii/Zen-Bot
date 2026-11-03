const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { fetchXkcdComic } = require('../../lib/xkcd');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('xkcd')
    .setDescription('Post a random xkcd comic'),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const comic = await fetchXkcdComic();

      await interaction.editReply({
        embeds: [
          createEmbed(interaction.client, {
            section: 'Images',
            title: `#${comic.number} · ${comic.title}`,
            url: comic.page,
            description: comic.alt || 'A random comic from xkcd.',
            color: COLORS.info,
            image: comic.image,
            fields: [
              { name: '🖼️ Comic', value: `#${comic.number}`, inline: true },
              {
                name: '📅 Published',
                value: comic.published ?? 'Unknown',
                inline: true,
              },
              { name: '🙋 Requested by', value: interaction.user.username, inline: true },
            ],
            footer: 'Random comic from xkcd.com  ·  hover the image for the alt text',
          }),
        ],
      });
    } catch (error) {
      console.error('[images] /xkcd failed:', error);
      await interaction.editReply({
        content: 'Could not fetch an xkcd comic right now. Please try again in a moment.',
      });
    }
  },
};
