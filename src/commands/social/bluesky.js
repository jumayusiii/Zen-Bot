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
  fetchBluesky,
  formatCount,
  parseBlueskyHandle,
} = require('../../lib/socialMedia');

function relativeTime(value) {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp) ? `<t:${Math.floor(timestamp / 1000)}:R>` : 'Unknown';
}

function buildDescription(profile, post, postUnavailable) {
  const parts = [];
  if (profile.description) parts.push(profile.description);

  if (post) {
    parts.push(`**Latest post**\n${post.text}`);
  } else if (postUnavailable) {
    parts.push('The latest post could not be loaded, but the profile is live.');
  } else {
    parts.push('No public posts are available yet.');
  }

  return parts.join('\n\n');
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('bluesky')
    .setDescription('Look up a Bluesky profile and its latest post')
    .addStringOption((option) =>
      option
        .setName('handle')
        .setDescription('Bluesky handle or profile URL, for example bsky.app')
        .setRequired(true)
        .setMaxLength(300),
    ),

  async execute(interaction) {
    const input = interaction.options.getString('handle', true);
    const handle = parseBlueskyHandle(input);

    if (!handle) {
      await interaction.reply({
        content: 'Enter a Bluesky handle like `bsky.app` or `@someone.bsky.social`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    try {
      const { profile, latestPost, postUnavailable } = await fetchBluesky(handle);
      const embed = createEmbed(interaction.client, {
        section: 'Bluesky',
        title: profile.displayName,
        url: profile.url,
        color: COLORS.info,
        description: buildDescription(profile, latestPost, postUnavailable),
        thumbnail: profile.avatar,
        image: latestPost?.image,
        fields: [
          { name: '👥 Followers', value: formatCount(profile.followers), inline: true },
          { name: '📝 Posts', value: formatCount(profile.posts), inline: true },
          { name: '👣 Following', value: formatCount(profile.following), inline: true },
        ],
        footer: `Requested by ${interaction.user.username}  ·  Bluesky`,
      });

      const buttons = [
        new ButtonBuilder()
          .setLabel('Open profile')
          .setEmoji('🦋')
          .setStyle(ButtonStyle.Link)
          .setURL(profile.url),
      ];

      if (latestPost?.url) {
        buttons.push(
          new ButtonBuilder()
            .setLabel('View latest post')
            .setStyle(ButtonStyle.Link)
            .setURL(latestPost.url),
        );
      }

      await interaction.editReply({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(buttons)],
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      console.warn(`[bluesky] Could not load ${handle}: ${error.message}`);
      await interaction.editReply({
        content: error instanceof SocialMediaError
          ? error.message
          : 'I could not reach Bluesky right now. Please try again in a moment.',
      });
    }
  },
};
