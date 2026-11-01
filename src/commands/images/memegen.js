const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  MAX_BACKGROUND_URL_LENGTH,
  MAX_MEME_TEXT_LENGTH,
  MEME_COLORS,
  MEME_FONTS,
  MEME_LAYOUTS,
  MEME_TEMPLATES,
  buildMemeUrl,
} = require('../../lib/imageFeeds');

function chosen(list, value) {
  return value ? list.find((entry) => entry.value === value)?.name : null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('memegen')
    .setDescription('Create an editable meme with your own text and style')
    .addStringOption((option) =>
      option
        .setName('template')
        .setDescription('The meme template to use')
        .setRequired(true)
        .addChoices(...MEME_TEMPLATES.map(({ name, value }) => ({ name, value }))),
    )
    .addStringOption((option) =>
      option
        .setName('top')
        .setDescription('The top line of the meme')
        .setRequired(true)
        .setMaxLength(MAX_MEME_TEXT_LENGTH),
    )
    .addStringOption((option) =>
      option
        .setName('bottom')
        .setDescription('The optional bottom line')
        .setMaxLength(MAX_MEME_TEXT_LENGTH),
    )
    .addStringOption((option) =>
      option
        .setName('font')
        .setDescription('The font used for the meme text')
        .addChoices(...MEME_FONTS.map(({ name, value }) => ({ name, value }))),
    )
    .addStringOption((option) =>
      option
        .setName('color')
        .setDescription('The meme text and outline colours')
        .addChoices(...MEME_COLORS.map(({ name, value }) => ({ name, value }))),
    )
    .addStringOption((option) =>
      option
        .setName('layout')
        .setDescription('Where the text is placed')
        .addChoices(...MEME_LAYOUTS.map(({ name, value }) => ({ name, value }))),
    )
    .addBooleanOption((option) =>
      option
        .setName('uppercase')
        .setDescription('Write the text in capitals'),
    )
    .addStringOption((option) =>
      option
        .setName('background')
        .setDescription('Optional HTTPS image URL to use behind the text')
        .setMaxLength(MAX_BACKGROUND_URL_LENGTH),
    ),

  async execute(interaction) {
    const templateId = interaction.options.getString('template', true);
    const top = interaction.options.getString('top', true).trim();
    const bottom = interaction.options.getString('bottom')?.trim() ?? '';
    const font = interaction.options.getString('font') ?? null;
    const color = interaction.options.getString('color') ?? null;
    const layout = interaction.options.getString('layout') ?? null;
    const uppercase = interaction.options.getBoolean('uppercase') ?? false;
    const background = interaction.options.getString('background')?.trim() ?? null;
    const template = MEME_TEMPLATES.find((entry) => entry.value === templateId);

    if (!template || !top) {
      await interaction.reply({
        content: 'Choose a template and write at least the top line.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let image;
    try {
      image = buildMemeUrl(templateId, top, bottom, {
        font,
        color,
        layout,
        uppercase,
        background,
      });
    } catch (error) {
      await interaction.reply({
        content: error.message,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const style = [
      chosen(MEME_FONTS, font),
      chosen(MEME_COLORS, color),
      chosen(MEME_LAYOUTS, layout),
      uppercase ? 'UPPERCASE' : null,
      background ? 'Custom background' : null,
    ]
      .filter(Boolean)
      .join(' · ') || 'Template default';

    const embed = createEmbed(interaction.client, {
      section: 'Images',
      title: `Meme · ${template.name}`,
      description: [top, bottom].filter(Boolean).join('\n'),
      color: COLORS.fun,
      image,
      fields: [
        { name: '🖼️ Template', value: template.name, inline: true },
        { name: '🎨 Style', value: style, inline: true },
        { name: '🙋 Requested by', value: interaction.user.username, inline: true },
      ],
      footer: 'Editable memes powered by memegen.link',
    });

    await interaction.reply({
      embeds: [embed],
      allowedMentions: { parse: [] },
    });
  },
};
