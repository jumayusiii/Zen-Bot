const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_EVENTS_DIR = path.join(__dirname, '..', 'events');

/**
 * Loads event modules and binds them to the client.
 * An event module exports `name`, `execute` and optionally `once`.
 *
 * @param {import('discord.js').Client} client
 * @param {string} [eventsDir]
 */
function loadEvents(client, eventsDir = DEFAULT_EVENTS_DIR) {
  const files = fs.readdirSync(eventsDir).filter((file) => file.endsWith('.js'));

  for (const file of files) {
    const fullPath = path.join(eventsDir, file);
    delete require.cache[require.resolve(fullPath)];
    const event = require(fullPath);

    if (!event.name || typeof event.execute !== 'function') {
      console.warn(`[events] Skipped ${file}: missing "name" or "execute".`);
      continue;
    }

    const handler = (...args) => event.execute(...args);
    if (event.once) client.once(event.name, handler);
    else client.on(event.name, handler);

    console.log(`[events] Bound ${event.name}${event.once ? ' (once)' : ''}`);
  }
}

module.exports = { loadEvents };
