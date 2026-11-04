const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_COMMANDS_DIR = path.join(__dirname, '..', 'commands');

/**
 * Recursively loads every command module and registers it in the given collection.
 * A command module must export `data` (SlashCommandBuilder) and `execute`.
 *
 * @param {import('discord.js').Collection<string, object>} registry
 * @param {string} [commandsDir]
 * @returns {number} number of registered commands
 */
function loadCommands(registry, commandsDir = DEFAULT_COMMANDS_DIR) {
  const entries = fs.readdirSync(commandsDir, { withFileTypes: true });
  let loaded = 0;

  for (const entry of entries) {
    const fullPath = path.join(commandsDir, entry.name);

    if (entry.isDirectory()) {
      loaded += loadCommands(registry, fullPath);
      continue;
    }

    if (!entry.name.endsWith('.js')) continue;

    delete require.cache[require.resolve(fullPath)];
    const command = require(fullPath);

    if (!command.data || typeof command.data.toJSON !== 'function' || typeof command.execute !== 'function') {
      console.warn(`[commands] Skipped ${path.relative(DEFAULT_COMMANDS_DIR, fullPath)}: missing "data" or "execute".`);
      continue;
    }

    const { name } = command.data;
    if (registry.has(name)) {
      console.warn(`[commands] Skipped duplicate command "${name}" in ${entry.name}.`);
      continue;
    }

    command.category = path.basename(commandsDir);
    registry.set(name, command);
    loaded += 1;
    console.log(`[commands] Loaded /${name}`);
  }

  return loaded;
}

/**
 * Returns the JSON payload used to register the given commands with Discord.
 *
 * @param {Iterable<{ data: import('discord.js').SlashCommandBuilder }>} commands
 * @returns {object[]}
 */
function getCommandData(commands) {
  return [...commands].map((command) => command.data.toJSON());
}

/**
 * Splits developer-only commands from the public set. Discord caps global
 * commands at 100, so the owner controls are registered in one guild instead.
 *
 * @param {import('discord.js').Collection<string, object>} registry
 * @returns {{publicCommands: object[], developerCommands: object[]}}
 */
function splitDeveloperCommands(registry) {
  const publicCommands = [];
  const developerCommands = [];

  for (const command of registry.values()) {
    if (command.developerOnly) developerCommands.push(command);
    else publicCommands.push(command);
  }

  return { publicCommands, developerCommands };
}

module.exports = { loadCommands, getCommandData, splitDeveloperCommands };
