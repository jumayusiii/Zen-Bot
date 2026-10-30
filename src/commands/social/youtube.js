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
  fetchYouTube,
  parseYouTubeUrl,
} = require('../../lib/socialMedia');

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('youtube')
    .setDescription('Look up a YouTube video and post its live details')
    .addStringOption((option) =>
      option
        .setName('url')
        .setDescription('YouTube video, Shorts or youtu.be link, or an 11-character video ID')
        .setRequired(true)
        .setMaxLength(2048),
    ),

  async execute(interaction) {
    const input = interaction.options.getString('url', true);
    const parsed = parseYouTubeUrl(input);

    if (!parsed) {
      await interaction.reply({
        content: 'Paste a YouTube video link, Shorts link or 11-character video ID.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    try {
      const video = await fetchYouTube(parsed);
      const embed = createEmbed(interaction.client, {
        section: 'YouTube',
        title: video.title,
        url: video.url,
        color: COLORS.danger,
        description: `By **${video.author}**`,
        image: video.thumbnail,
        fields: [
          {
            name: '📺 Channel',
            value: video.authorUrl ? `[${video.author}](${video.authorUrl})` : video.author,
            inline: true,
          },
          { name: '🎬 Video ID', value: `\`${video.id}\``, inline: true },
          { name: '▶️ Source', value: 'YouTube', inline: true },
        ],
        footer: `Requested by ${interaction.user.username}  ·  YouTube`,
      });

      const buttons = [
        new ButtonBuilder()
          .setLabel('Watch on YouTube')
          .setEmoji('▶️')
          .setStyle(ButtonStyle.Link)
          .setURL(video.url),
      ];

      if (video.authorUrl) {
        buttons.push(
          new ButtonBuilder()
            .setLabel('Open channel')
            .setStyle(ButtonStyle.Link)
            .setURL(video.authorUrl),
        );
      }

      await interaction.editReply({
        embeds: [embed],
        components: [new ActionRowBuilder().addComponents(buttons)],
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      console.warn(`[youtube] Could not load ${parsed.id}: ${error.message}`);
      await interaction.editReply({
        content: error instanceof SocialMediaError
          ? error.message
          : 'I could not reach YouTube right now. Please try again in a moment.',
      });
    }
  },
};
