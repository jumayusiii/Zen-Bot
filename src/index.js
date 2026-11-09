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

// The first canvas render initializes the native image stack and system fonts.
// On slower machines that can block for many seconds, so warm it before the
// gateway connects instead of letting it stall a live interaction.
async function warmCanvas() {
  const started = Date.now();

  try {
    const { renderRankCard } = require('./lib/rankCard');
    await renderRankCard({
      displayName: 'Zen',
      username: 'zen',
      level: 1,
      rank: 1,
      totalUsers: 1,
      xpIntoLevel: 10,
      xpNeeded: 100,
      totalXp: 10,
    });
    console.log(`[bot] Canvas warm-up finished in ${Date.now() - started} ms.`);
  } catch (error) {
    console.warn(`[bot] Canvas warm-up failed: ${error.message}`);
  }
}

async function start() {
  await warmCanvas();

  try {
    await client.login(token);
  } catch (error) {
    console.error(`[bot] Login failed: ${error.message}`);
    process.exit(1);
  }
}

start();

process.on('unhandledRejection', (error) => {
  console.error('[bot] Unhandled promise rejection:', error);
});
