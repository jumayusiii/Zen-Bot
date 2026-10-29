const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { parseChoices, pickChoice } = require('../../lib/choices');
const { COLORS, createEmbed } = require('../../lib/embeds');

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
    const question = interaction.options.getString('question')?.trim();
    const choices = parseChoices(interaction.options.getString('options', true));

    if (choices.length < 2) {
      await interaction.reply({
        content: 'Give me at least two different choices, separated by `|` or commas.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const choice = pickChoice(choices);

    const embed = createEmbed(interaction.client, {
      section: 'Decisions',
      title: question || 'Decision made',
      description: [
        `🎯 **${choice}**`,
        `-# Picked from ${choices.length} option${choices.length === 1 ? '' : 's'}.`,
      ].join('\n'),
      color: COLORS.fun,
      fields: [
        {
          name: 'Options',
          value: choices.map((entry, index) => `**${index + 1}.** ${entry}`).join('\n'),
          inline: false,
        },
      ],
      footer: `Requested by ${interaction.user.username}`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
