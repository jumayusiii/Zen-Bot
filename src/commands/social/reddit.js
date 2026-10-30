const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  SocialMediaError,
  fetchReddit,
  parseSubreddit,
} = require('../../lib/socialMedia');

function relativeTime(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? `<t:${Math.floor(timestamp / 1000)}:R>` : 'Unknown';
}

function buildDescription(feed, entry) {
  const parts = [`**${entry.title}**`];
  if (feed.description) parts.push(feed.description);
  return parts.join('\n\n');
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('reddit')
    .setDescription('Browse a live public SFW Reddit feed')
    .addStringOption((option) =>
      option
        .setName('subreddit')
        .setDescription('SFW community such as aww, science or popular (default: popular)')
        .setRequired(false)
        .setMaxLength(100),
    ),

  async execute(interaction) {
    const input = interaction.options.getString('subreddit') || 'popular';
    const subreddit = parseSubreddit(input);

    if (!subreddit) {
      await interaction.reply({
        content: 'Enter a subreddit like `aww`, `r/aww` or `popular`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    try {
      const feed = await fetchReddit(subreddit);
      const { entry } = feed;
      const embed = createEmbed(interaction.client, {
        section: 'Reddit',
        title: `r/${feed.subreddit}`,
        url: feed.url,
        color: COLORS.fun,
        description: buildDescription(feed, entry),
        thumbnail: feed.icon,
        image: entry.image,
        fields: [
          { name: '👤 Posted by', value: `u/${entry.author}`, inline: true },
          { name: '🕒 Posted', value: relativeTime(entry.published), inline: true },
          { name: '🔥 Feed', value: 'Hot', inline: true },
        ],
        footer: `Requested by ${interaction.user.username}  ·  Reddit public feed`,
      });

      const buttons = [
        new ButtonBuilder()
          .setLabel(`Open r/${feed.subreddit}`)
          .setEmoji('👽')
          .setStyle(ButtonStyle.Link)
          .setURL(feed.url),
        new ButtonBuilder()
          .setLabel('Open post')
          .setStyle(ButtonStyle.Link)
          .setURL(entry.url),
      ];

      await interaction.editReply({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(buttons)],
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      console.warn(`[reddit] Could not load r/${subreddit}: ${error.message}`);
      await interaction.editReply({
        content: error instanceof SocialMediaError
          ? error.message
          : 'I could not reach Reddit right now. Please try again in a moment.',
      });
    }
  },
};
