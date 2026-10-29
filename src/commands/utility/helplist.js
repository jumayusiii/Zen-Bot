const { SlashCommandBuilder } = require('discord.js');
const { buildHelpPayload } = require('../../lib/help');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('helplist')
    .setDescription('Browse every command by category'),

  async execute(interaction) {
    await interaction.reply(
      buildHelpPayload(
        interaction.client,
        interaction.client.commands,
        'overview',
        interaction.user.username,
      ),
    );
  },

  async handleComponent(interaction) {
    const [, action, view] = interaction.customId.split(':');
    if (action !== 'view') return;

    await interaction.update(
      buildHelpPayload(
        interaction.client,
        interaction.client.commands,
        view,
        interaction.user.username,
      ),
    );
  },
};
