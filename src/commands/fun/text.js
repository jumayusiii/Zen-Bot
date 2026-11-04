const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { MAX_EMOJIFY_CHARS, MAX_MOCK_CHARS, emojify, mockText } = require('../../lib/funAdditions');
const { getInteractionLanguage, t } = require('../../lib/i18n');

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('text')
    .setDescription('Turn text into emoji letters or mocking case')
    .addStringOption((option) =>
      option
        .setName('text')
        .setDescription(`Text to transform (up to ${MAX_MOCK_CHARS} characters)`)
        .setRequired(true)
        .setMaxLength(MAX_MOCK_CHARS),
    )
    .addStringOption((option) =>
      option
        .setName('style')
        .setDescription('How to transform the text (default: emoji letters)')
        .addChoices(
          { name: 'Emoji letters', value: 'emoji' },
          { name: 'Mocking case', value: 'mock' },
        ),
    ),

  async execute(interaction) {
    const language = await getInteractionLanguage(interaction);
    const text = (interaction.options.getString('text', true) ?? '').replace(/\s+/g, ' ').trim();
    const style = interaction.options.getString('style') ?? 'emoji';

    if (!text) {
      await interaction.reply({
        content: t(language, style === 'mock' ? 'fun.mock.empty' : 'fun.emojify.empty'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (style === 'mock') {
      const embed = createEmbed(interaction.client, {
        section: t(language, 'help.tabs.fun'),
        title: t(language, 'fun.mock.title'),
        description: ['```', mockText(text).replace(/```/g, '``'), '```', t(language, 'fun.mock.description')].join('\n'),
        color: COLORS.fun,
        footer: t(language, 'fun.mock.footer', { user: interaction.user.username }),
      });

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (text.length > MAX_EMOJIFY_CHARS) {
      await interaction.reply({
        content: t(language, 'fun.emojify.tooLong', { max: MAX_EMOJIFY_CHARS }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const embed = createEmbed(interaction.client, {
      section: t(language, 'help.tabs.fun'),
      title: t(language, 'fun.emojify.title'),
      description: emojify(text),
      color: COLORS.fun,
      footer: t(language, 'fun.emojify.footer', { user: interaction.user.username }),
    });

    await interaction.reply({ embeds: [embed] });
  },
};
