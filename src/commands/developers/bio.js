const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { isDeveloper } = require('../../lib/developers');

const DENIED = 'This command is restricted to the bot developer.';

module.exports = {
  developerOnly: true,

  data: new SlashCommandBuilder()
    .setName('devbio')
    .setDescription('Developer: change the bot’s About Me / bio in Discord')
    .addStringOption((option) =>
      option
        .setName('text')
        .setDescription('New bio, up to 400 characters')
        .setRequired(true)
        .setMaxLength(400),
    ),

  async execute(interaction) {
    if (!isDeveloper(interaction.user.id)) {
      await interaction.reply({ content: DENIED, flags: MessageFlags.Ephemeral });
      return;
    }

    const text = (interaction.options.getString('text', true) ?? '').replace(/\s+/g, ' ').trim();

    if (!text) {
      await interaction.reply({
        content: 'The bio cannot be empty.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await interaction.client.application.edit({ description: text });

      await interaction.editReply({
        embeds: [
          createEmbed(interaction.client, {
            section: 'Developers',
            title: 'Bot bio updated',
            description: [
              'The About Me section on the bot’s Discord profile now reads:',
              '',
              `>>> ${text}`,
              '-# Discord can cache the profile for a few minutes.',
            ].join('\n'),
            color: COLORS.danger,
            fields: [{ name: '📝 Bio', value: text.slice(0, 1024), inline: false }],
            footer: `Requested by ${interaction.user.username}`,
          }),
        ],
      });
    } catch (error) {
      await interaction.editReply({ content: `Could not update the bio: ${error.message}` });
    }
  },
};
