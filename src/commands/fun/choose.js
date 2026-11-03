const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { parseChoices, pickChoice } = require('../../lib/choices');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { getInteractionLanguage, t } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('choose')
    .setDescription('Pick one option from a list')
    .addStringOption((option) =>
      option
        .setName('options')
        .setDescription('2–10 choices separated by | or commas')
        .setRequired(true)
        .setMaxLength(1024),
    )
    .addStringOption((option) =>
      option
        .setName('question')
        .setDescription('What are you deciding? (optional)')
        .setMaxLength(200),
    ),

  async execute(interaction) {
    const language = await getInteractionLanguage(interaction);
    const question = interaction.options.getString('question')?.trim();
    const choices = parseChoices(interaction.options.getString('options', true));

    if (choices.length < 2) {
      await interaction.reply({
        content: t(language, 'fun.choose.error'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const choice = pickChoice(choices);

    const embed = createEmbed(interaction.client, {
      section: t(language, 'help.tabs.fun'),
      title: question || t(language, 'fun.choose.title'),
      description: [
        t(language, 'fun.choose.picked', { choice }),
        t(language, 'fun.choose.pickedFrom', { count: choices.length }),
      ].join('\n'),
      color: COLORS.fun,
      fields: [
        {
          name: t(language, 'fun.choose.options'),
          value: choices.map((entry, index) => `**${index + 1}.** ${entry}`).join('\n'),
          inline: false,
        },
      ],
      footer: t(language, 'fun.choose.footer', { user: interaction.user.username }),
    });

    await interaction.reply({ embeds: [embed] });
  },
};
