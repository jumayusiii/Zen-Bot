require('dotenv').config();

const { Collection, REST, Routes } = require('discord.js');
const { loadCommands, getCommandData } = require('./handlers/commandHandler');

async function main() {
  const token = process.env.DISCORD_TOKEN?.trim();

  if (!token) {
    throw new Error('DISCORD_TOKEN is missing. Copy .env.example to .env and add your bot token.');
  }

  const commandRegistry = new Collection();
  const commandCount = loadCommands(commandRegistry);

  if (commandCount === 0) {
    throw new Error('No commands found to register.');
  }

  const rest = new REST().setToken(token);
  const clientId =
    process.env.CLIENT_ID?.trim() || (await rest.get(Routes.currentApplication())).id;
  const guildId = process.env.GUILD_ID?.trim();

  const global = process.argv.includes('--global');
  const route = !global && guildId
    ? Routes.applicationGuildCommands(clientId, guildId)
    : Routes.applicationCommands(clientId);

  const registered = await rest.put(route, { body: getCommandData(commandRegistry) });

  if (!global && guildId) {
    console.log(`[deploy] Registered ${registered.length} slash command(s) in guild ${guildId}. They are available immediately.`);
  } else {
    console.log(`[deploy] Registered ${registered.length} slash command(s) globally for every server. Discord can take up to an hour to show them.`);
  }
}

main().catch((error) => {
  console.error(`[deploy] Failed: ${error.message}`);
  process.exit(1);
});
