const { Events, MessageFlags } = require('discord.js');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isChatInputCommand()) {
      await handleCommand(interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
      return;
    }

    if (interaction.isStringSelectMenu() || interaction.isButton()) {
      await handleComponent(interaction);
    }
  },
};

async function handleCommand(interaction) {
  const command = interaction.client.commands.get(interaction.commandName);
  if (!command) {
    console.warn(`[interactions] Unknown command /${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`[commands] /${interaction.commandName} failed:`, error);
    await sendError(interaction, 'Something went wrong while running that command. Please try again.');
  }
}

async function handleComponent(interaction) {
  // Component custom ids are namespaced: "<command>:<action>[:<targetId>]"
  const [commandName] = interaction.customId.split(':');
  const command = interaction.client.commands.get(commandName);

  if (!command?.handleComponent) return;

  try {
    await command.handleComponent(interaction);
  } catch (error) {
    console.error(`[components] ${interaction.customId} failed:`, error);
    await sendError(interaction, 'That component is no longer usable. Run the command again.');
  }
}

async function handleModalSubmit(interaction) {
  const [commandName] = interaction.customId.split(':');
  const command = interaction.client.commands.get(commandName);

  if (!command?.handleModalSubmit) return;

  try {
    await command.handleModalSubmit(interaction);
  } catch (error) {
    console.error(`[modals] ${interaction.customId} failed:`, error);
    await sendError(interaction, 'That typing race could not be scored. Run the command again.');
  }
}

async function sendError(interaction, content) {
  const payload = { content, flags: MessageFlags.Ephemeral };

  try {
    if (interaction.replied || interaction.deferred) await interaction.followUp(payload);
    else await interaction.reply(payload);
  } catch (error) {
    console.error('[interactions] Could not deliver error message:', error);
  }
}
