const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { MAX_EMOJIFY_CHARS, emojify } = require('../../lib/funAdditions');
const { getInteractionLanguage, t } = require('../../lib/i18n');

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('emojify')
    .setDescription('Turn text into big emoji letters')
    .addStringOption((option) =>
      option
        .setName('text')
        .setDescription(`Text to emojify (up to ${MAX_EMOJIFY_CHARS} characters)`)
        .setRequired(true)
        .setMaxLength(MAX_EMOJIFY_CHARS),
    ),

  async execute(interaction) {
    const language = await getInteractionLanguage(interaction);
    const text = (interaction.options.getString('text', true) ?? '').replace(/\s+/g, ' ').trim();

    if (!text) {
      await interaction.reply({
        content: t(language, 'fun.emojify.empty'),
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
