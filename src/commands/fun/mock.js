const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { MAX_MOCK_CHARS, mockText } = require('../../lib/funAdditions');
const { getInteractionLanguage, t } = require('../../lib/i18n');

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('mock')
    .setDescription('Repeat text in mocking alternating case')
    .addStringOption((option) =>
      option
        .setName('text')
        .setDescription(`Text to mock (up to ${MAX_MOCK_CHARS} characters)`)
        .setRequired(true)
        .setMaxLength(MAX_MOCK_CHARS),
    ),

  async execute(interaction) {
    const language = await getInteractionLanguage(interaction);
    const text = (interaction.options.getString('text', true) ?? '').replace(/\s+/g, ' ').trim();

    if (!text) {
      await interaction.reply({
        content: t(language, 'fun.mock.empty'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const mocked = mockText(text).replace(/```/g, '``');

    const embed = createEmbed(interaction.client, {
      section: t(language, 'help.tabs.fun'),
      title: t(language, 'fun.mock.title'),
      description: ['```', mocked, '```', t(language, 'fun.mock.description')].join('\n'),
      color: COLORS.fun,
      footer: t(language, 'fun.mock.footer', { user: interaction.user.username }),
    });

    await interaction.reply({ embeds: [embed] });
  },
};
