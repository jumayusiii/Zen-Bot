require('dotenv').config();

const { Collection, REST, Routes } = require('discord.js');
const {
  getCommandData,
  loadCommands,
  splitDeveloperCommands,
} = require('./handlers/commandHandler');

const API = 'https://discord.com/api/v10';

async function listGuildIds(token) {
  const signal =
    typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(15000) : undefined;
  const response = await fetch(`${API}/users/@me/guilds`, {
    headers: { Authorization: `Bot ${token}` },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Could not list the bot's servers (HTTP ${response.status}).`);
  }

  const guilds = await response.json();
  if (!Array.isArray(guilds)) {
    throw new Error('Discord returned an unreadable server list.');
  }

  return guilds.map((guild) => guild.id).filter(Boolean);
}

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
  const guildOnly = process.argv.includes('--guild');
  const globalOnly = process.argv.includes('--global');

  if (guildOnly && globalOnly) {
    throw new Error('Choose either --guild or --global, not both.');
  }

  if (guildOnly) {
    const guildId = process.env.GUILD_ID?.trim();

    if (!guildId) {
      throw new Error('GUILD_ID is required for a guild-only deployment.');
    }

    // Discord shows guild and global commands together. Clear the global set
    // first so this developer scope can never produce a duplicate command menu.
    await rest.put(Routes.applicationCommands(clientId), { body: [] });

    const registered = await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: getCommandData(commandRegistry.values()),
    });

    console.log(
      `[deploy] Registered ${registered.length} slash command(s) in guild ${guildId}. Global copies were cleared.`,
    );
    return;
  }

  const { publicCommands, developerCommands } = splitDeveloperCommands(commandRegistry);
  const developerGuildId = process.env.GUILD_ID?.trim();

  if (developerCommands.length > 0 && !developerGuildId) {
    throw new Error(
      'GUILD_ID is required: developer-only commands cannot be registered globally because Discord caps global commands at 100.',
    );
  }

  // Production uses one global command set for the public commands. Remove the
  // guild-scoped copies from every server first; otherwise each command is
  // listed twice in the guild command picker.
  const guildIds = await listGuildIds(token);
  for (const guildId of guildIds) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: [] });
  }

  const registered = await rest.put(Routes.applicationCommands(clientId), {
    body: getCommandData(publicCommands),
  });

  console.log(
    `[deploy] Registered ${registered.length} public slash command(s) globally. Cleared ${guildIds.length} guild command set(s).`,
  );

  if (developerCommands.length > 0) {
    const developerRegistered = await rest.put(
      Routes.applicationGuildCommands(clientId, developerGuildId),
      { body: getCommandData(developerCommands) },
    );

    console.log(
      `[deploy] Registered ${developerRegistered.length} developer command(s) in guild ${developerGuildId} only.`,
    );
  }

  console.log('[deploy] Global commands can take up to an hour to appear in every server.');
}

main().catch((error) => {
  console.error(`[deploy] Failed: ${error.message}`);
  process.exit(1);
});
