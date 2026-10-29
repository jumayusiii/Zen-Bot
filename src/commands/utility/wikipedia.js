const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { WikipediaError, fetchWikipedia } = require('../../lib/wikipedia');

function updatedTimestamp(article) {
  const parsed = Date.parse(article.timestamp || '');
  return Number.isFinite(parsed) ? `<t:${Math.floor(parsed / 1000)}:R>` : 'Unknown';
}

function articleDescription(article) {
  const parts = [];
  if (article.description) parts.push(`*${article.description}*`);
  if (article.extract) parts.push(article.extract);

  return parts.join('\n\n') || 'No summary is available. Open the article to read more.';
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('wikipedia')
    .setDescription('Find a Wikipedia article and read its summary')
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('Topic to search for, for example Ada Lovelace or Jupiter')
        .setRequired(true)
        .setMaxLength(120),
    ),

  async execute(interaction) {
    const query = interaction.options.getString('query', true);

    await interaction.deferReply();

    try {
      const { article } = await fetchWikipedia(query);
      const embed = createEmbed(interaction.client, {
        section: 'Wikipedia',
        title: article.title,
        url: article.url,
        color: COLORS.info,
        description: articleDescription(article),
        thumbnail: article.thumbnail,
        fields: [
          {
            name: '📚 Article',
            value: article.type === 'disambiguation' ? 'Disambiguation page' : (article.description || 'Wikipedia article'),
            inline: true,
          },
          { name: '🕒 Updated', value: updatedTimestamp(article), inline: true },
        ],
        footer: `Requested by ${interaction.user.username}  ·  Wikipedia`,
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setLabel('Read on Wikipedia')
          .setEmoji('📖')
          .setStyle(ButtonStyle.Link)
          .setURL(article.url),
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } catch (error) {
      console.warn(`[wikipedia] Could not load ${query}: ${error.message}`);
      await interaction.editReply({
        content: error instanceof WikipediaError
          ? error.message
          : 'I could not search Wikipedia right now. Please try again in a moment.',
      });
    }
  },
};
