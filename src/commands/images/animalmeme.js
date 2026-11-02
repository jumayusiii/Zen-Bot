const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { ANIMAL_SUBREDDITS, fetchAnimalMeme } = require('../../lib/imageFeeds');

function truncate(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('animalmeme')
    .setDescription('Fetch a random animal meme')
    .addStringOption((option) =>
      option
        .setName('community')
        .setDescription('Pick one animal community (default: rotate through all)')
        .addChoices(
          ...ANIMAL_SUBREDDITS.map((name) => ({
            name: `r/${name}`,
            value: name,
          })),
        ),
    ),

  async execute(interaction) {
    const community = interaction.options.getString('community');
    const subreddits = community ? [community] : ANIMAL_SUBREDDITS;

    await interaction.deferReply();

    try {
      const meme = await fetchAnimalMeme({ subreddits });
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
        footer: `Animal memes from public Reddit feeds${community ? `  ·  r/${community}` : ''}`,
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
