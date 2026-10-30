const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  MAX_MEME_TEXT_LENGTH,
  MEME_TEMPLATES,
  buildMemeUrl,
} = require('../../lib/imageFeeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('memegen')
    .setDescription('Create an editable meme with your own text')
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
    ),

  async execute(interaction) {
    const templateId = interaction.options.getString('template', true);
    const top = interaction.options.getString('top', true).trim();
    const bottom = interaction.options.getString('bottom')?.trim() ?? '';
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
      image = buildMemeUrl(templateId, top, bottom);
    } catch (error) {
      await interaction.reply({
        content: error.message,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = createEmbed(interaction.client, {
      section: 'Images',
      title: `Meme · ${template.name}`,
      description: [top, bottom].filter(Boolean).join('\n'),
      color: COLORS.fun,
      image,
      fields: [
        { name: '🖼️ Template', value: template.name, inline: true },
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
