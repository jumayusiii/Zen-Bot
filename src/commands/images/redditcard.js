const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  CARD_THEMES,
  fetchRedditThread,
  renderRedditCard,
} = require('../../lib/redditCard');
const { SocialMediaError } = require('../../lib/socialMedia');

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('redditcard')
    .setDescription('Turn a Reddit thread and its comments into an image card')
    .addStringOption((option) =>
      option
        .setName('url')
        .setDescription('A full reddit.com thread link')
        .setRequired(true)
        .setMaxLength(500),
    )
    .addIntegerOption((option) =>
      option
        .setName('comments')
        .setDescription('How many comments to include (1–4, default: 3)')
        .setMinValue(1)
        .setMaxValue(4),
    )
    .addStringOption((option) =>
      option
        .setName('theme')
        .setDescription('The card colour theme')
        .addChoices(...CARD_THEMES.map(({ name, value }) => ({ name, value }))),
    ),

  async execute(interaction) {
    const url = interaction.options.getString('url', true);
    const maxComments = interaction.options.getInteger('comments') ?? 3;
    const theme = interaction.options.getString('theme') ?? 'dark';

    await interaction.deferReply();

    try {
      const thread = await fetchRedditThread(url);
      const image = await renderRedditCard({
        thread,
        comments: thread.comments,
        theme,
        maxComments,
      });
      const file = new AttachmentBuilder(image, { name: 'reddit-thread.png' });
      const themeLabel = CARD_THEMES.find((entry) => entry.value === theme)?.name ?? theme;

      const embed = createEmbed(interaction.client, {
        section: 'Images',
        title: `r/${thread.subreddit}`,
        url: thread.url,
        description: `**${thread.title}**`,
        color: COLORS.fun,
        image: 'attachment://reddit-thread.png',
        fields: [
          { name: '👤 Posted by', value: `u/${thread.author}`, inline: true },
          {
            name: '💬 Comments',
            value: `${thread.comments.length} public comment${thread.comments.length === 1 ? '' : 's'}`,
            inline: true,
          },
          { name: '🎨 Theme', value: themeLabel, inline: true },
        ],
        footer: `Reddit card requested by ${interaction.user.username}`,
      });

      const payload = {
        embeds: [embed],
        files: [file],
        allowedMentions: { parse: [] },
      };

      if (thread.url) {
        payload.components = [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setLabel('Open thread')
              .setEmoji('👽')
              .setStyle(ButtonStyle.Link)
              .setURL(thread.url),
          ),
        ];
      }

      await interaction.editReply(payload);
    } catch (error) {
      console.warn(`[images] /redditcard failed: ${error.message}`);
      await interaction.editReply({
        content: error instanceof SocialMediaError
          ? error.message
          : 'I could not build that Reddit card. Please try again in a moment.',
      });
    }
  },
};
