const {
  AttachmentBuilder,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const {
  CAPTION_COLORS,
  CAPTION_SIZES,
  CAPTION_STYLES,
  MAX_CAPTION_TEXT_LENGTH,
  MAX_IMAGE_BYTES,
  renderCaptionImage,
} = require('../../lib/caption');
const { COLORS, createEmbed } = require('../../lib/embeds');

const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif)$/i;

async function downloadAttachment(attachment) {
  if (attachment.size > MAX_IMAGE_BYTES) {
    throw new Error('That image is larger than the 8 MB caption limit.');
  }

  if (attachment.contentType && !attachment.contentType.startsWith('image/')) {
    throw new Error('Upload a PNG, JPEG, WebP or GIF image.');
  }

  if (!attachment.contentType && !IMAGE_EXTENSIONS.test(attachment.name || '')) {
    throw new Error('Upload a PNG, JPEG, WebP or GIF image.');
  }

  const response = await fetch(attachment.url, {
    signal: AbortSignal.timeout(12000),
  });

  if (!response.ok) throw new Error('Discord could not return that attachment.');

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error('That image is larger than the 8 MB caption limit.');
  }

  return buffer;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('caption')
    .setDescription('Add custom top and bottom text to an image')
    .addAttachmentOption((option) =>
      option
        .setName('image')
        .setDescription('The PNG, JPEG, WebP or GIF to caption')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('top')
        .setDescription('Text at the top of the image')
        .setMaxLength(MAX_CAPTION_TEXT_LENGTH),
    )
    .addStringOption((option) =>
      option
        .setName('bottom')
        .setDescription('Text at the bottom of the image')
        .setMaxLength(MAX_CAPTION_TEXT_LENGTH),
    )
    .addStringOption((option) =>
      option
        .setName('style')
        .setDescription('How the caption is drawn')
        .addChoices(...CAPTION_STYLES.map(({ name, value }) => ({ name, value }))),
    )
    .addStringOption((option) =>
      option
        .setName('color')
        .setDescription('The caption text colour')
        .addChoices(...CAPTION_COLORS.map(({ name, value }) => ({ name, value }))),
    )
    .addStringOption((option) =>
      option
        .setName('size')
        .setDescription('How large the caption should be')
        .addChoices(...CAPTION_SIZES.map(({ name, value }) => ({ name, value }))),
    )
    .addBooleanOption((option) =>
      option
        .setName('uppercase')
        .setDescription('Write the caption in capitals (default: true)'),
    ),

  async execute(interaction) {
    const image = interaction.options.getAttachment('image', true);
    const top = interaction.options.getString('top')?.trim() ?? '';
    const bottom = interaction.options.getString('bottom')?.trim() ?? '';
    const style = interaction.options.getString('style') ?? 'classic';
    const color = interaction.options.getString('color') ?? 'white';
    const size = interaction.options.getString('size') ?? 'medium';
    const uppercase = interaction.options.getBoolean('uppercase') ?? true;

    if (!top && !bottom) {
      await interaction.reply({
        content: 'Add a `top` line, a `bottom` line, or both.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    try {
      const source = await downloadAttachment(image);
      const rendered = await renderCaptionImage({
        image: source,
        top,
        bottom,
        style,
        color,
        size,
        uppercase,
      });
      const file = new AttachmentBuilder(rendered, { name: 'captioned.png' });
      const styleLabel = CAPTION_STYLES.find((entry) => entry.value === style)?.name ?? style;
      const colorLabel = CAPTION_COLORS.find((entry) => entry.value === color)?.name ?? color;
      const sizeLabel = CAPTION_SIZES.find((entry) => entry.value === size)?.name ?? size;

      const embed = createEmbed(interaction.client, {
        section: 'Images',
        title: 'Your caption',
        description: [top, bottom].filter(Boolean).map((line) => `**${line}**`).join('\n'),
        color: COLORS.fun,
        image: 'attachment://captioned.png',
        fields: [
          { name: '🎨 Style', value: styleLabel, inline: true },
          { name: '🖍️ Colour', value: colorLabel, inline: true },
          { name: '🔠 Size', value: sizeLabel, inline: true },
        ],
        footer: `Captioned by ${interaction.user.username}  ·  ${uppercase ? 'uppercase' : 'original case'}`,
      });

      await interaction.editReply({ embeds: [embed], files: [file] });
    } catch (error) {
      console.warn(`[images] /caption failed: ${error.message}`);
      await interaction.editReply({
        content: error.message || 'I could not caption that image. Please try another one.',
      });
    }
  },
};
