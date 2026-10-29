require('dotenv').config();

const { Client, Collection, GatewayIntentBits } = require('discord.js');
const { loadCommands } = require('./handlers/commandHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { buildPresence } = require('./lib/presence');

const token = process.env.DISCORD_TOKEN?.trim();

if (!token) {
  console.error('[bot] DISCORD_TOKEN is missing. Copy .env.example to .env and add your bot token.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
  ],
  // Send the Playing activity in the initial IDENTIFY payload as well as from
  // ClientReady, so a reconnect cannot leave the bot without a presence.
  presence: buildPresence(),
});
client.commands = new Collection();

loadCommands(client.commands);
loadEvents(client);

client.login(token).catch((error) => {
  console.error(`[bot] Login failed: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('[bot] Unhandled promise rejection:', error);
});
