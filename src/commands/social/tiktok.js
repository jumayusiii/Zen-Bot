const {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  MAX_VIDEO_BYTES,
  TikTokError,
  downloadTikTokVideo,
  fetchTikTokInfo,
  formatBytes,
  formatCount,
  parseTikTokUrl,
} = require('../../lib/tiktok');

function creatorValue(info) {
  const { nickname, username } = info.author;
  return username ? `**${nickname}**\n@${username}` : `**${nickname}**`;
}

function actionRow(info) {
  const buttons = [
    new ButtonBuilder()
      .setLabel('Open on TikTok')
      .setEmoji('🎵')
      .setStyle(ButtonStyle.Link)
      .setURL(info.sourceUrl),
  ];

  if (info.author.url) {
    buttons.push(
      new ButtonBuilder()
        .setLabel(`@${info.author.username}`.slice(0, 80))
        .setStyle(ButtonStyle.Link)
        .setURL(info.author.url),
    );
  }

  return new ActionRowBuilder().addComponents(buttons);
}

function buildEmbed(client, info, { attached, note, requestedBy }) {
  const lines = [];

  if (info.kind === 'images') {
    lines.push(`🖼️ **Photo post** · ${info.images.length} image${info.images.length === 1 ? '' : 's'}`);
  }

  if (attached) {
    lines.push('▶️ **Video attached — press play below.**');
  }

  if (note) lines.push(note);
  if (info.music) lines.push(`🎵 ${info.music}`);

  return createEmbed(client, {
    section: 'TikTok',
    title: info.title || 'TikTok video',
    url: info.sourceUrl,
    color: COLORS.fun,
    description: lines.join('\n\n') || undefined,
    image: attached ? null : (info.kind === 'images' ? info.images[0] : info.cover),
    fields: [
      { name: '👤 Creator', value: creatorValue(info), inline: true },
      {
        name: '⏱️ Duration',
        value: info.durationSeconds ? `${info.durationSeconds}s` : '—',
        inline: true,
      },
      { name: '👀 Views', value: formatCount(info.stats.views), inline: true },
      { name: '❤️ Likes', value: formatCount(info.stats.likes), inline: true },
      { name: '💬 Comments', value: formatCount(info.stats.comments), inline: true },
      { name: '🔁 Shares', value: formatCount(info.stats.shares), inline: true },
    ],
    footer: `Requested by ${requestedBy}  ·  Beta`,
  });
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('tiktok')
    .setDescription('Watch a TikTok video right in Discord')
    .addStringOption((option) =>
      option
        .setName('url')
        .setDescription('A TikTok video link, including short vm.tiktok.com links')
        .setRequired(true)
        .setMaxLength(2048),
    ),

  async execute(interaction) {
    const raw = interaction.options.getString('url', true);
    const parsed = parseTikTokUrl(raw);

    if (!parsed) {
      await interaction.reply({
        content: 'That does not look like a TikTok video link. Paste one from the app, for example `https://www.tiktok.com/@user/video/123…`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    let info;
    try {
      info = await fetchTikTokInfo(parsed);
    } catch (error) {
      console.warn(`[tiktok] Could not read ${parsed.href}: ${error.message}`);
      await interaction.editReply({
        content: error instanceof TikTokError
          ? error.message
          : 'I could not read that TikTok right now. Please try again in a moment.',
      });
      return;
    }

    let attachment = null;
    let note = null;

    if (info.kind === 'video' && info.videoUrl) {
      if (info.sizeBytes && info.sizeBytes > MAX_VIDEO_BYTES) {
        note = `⚠️ This video is **${formatBytes(info.sizeBytes)}**, above the **${formatBytes(MAX_VIDEO_BYTES)}** upload limit. Open it on TikTok to watch.`;
      } else {
        try {
          const { buffer } = await downloadTikTokVideo(info.videoUrl);
          attachment = new AttachmentBuilder(buffer, {
            name: `tiktok-${info.id ?? Date.now()}.mp4`,
            description: info.title ?? 'TikTok video',
          });
        } catch (error) {
          console.warn(`[tiktok] Could not attach ${info.id ?? parsed.href}: ${error.message}`);
          note = error instanceof TikTokError && error.code === 'too_large'
            ? `⚠️ ${error.message} Open it on TikTok to watch.`
            : '⚠️ The video could not be attached. Open it on TikTok to watch.';
        }
      }
    }

    const embed = buildEmbed(interaction.client, info, {
      attached: Boolean(attachment),
      note,
      requestedBy: interaction.user.username,
    });

    await interaction.editReply({
      embeds: [embed],
      components: [actionRow(info)],
      files: attachment ? [attachment] : [],
    });
  },
};
