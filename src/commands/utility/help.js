const { SlashCommandBuilder } = require('discord.js');
const { buildHelpPayload } = require('../../lib/help');
const { getGuildLanguage } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Browse every command by category'),

  async execute(interaction) {
    const language = interaction.guild
      ? await getGuildLanguage(interaction.guild.id)
      : 'en';

    await interaction.reply(
      buildHelpPayload(
        interaction.client,
        interaction.client.commands,
        'overview',
        interaction.user.username,
        language,
        interaction.user.id,
      ),
    );
  },

  async handleComponent(interaction) {
    const [, action, view] = interaction.customId.split(':');
    if (action !== 'view') return;

    const language = interaction.guild
      ? await getGuildLanguage(interaction.guild.id)
      : 'en';

    await interaction.update(
      buildHelpPayload(
        interaction.client,
        interaction.client.commands,
        view,
        interaction.user.username,
        language,
        interaction.user.id,
      ),
    );
  },
};
