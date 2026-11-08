const { Events } = require('discord.js');
const { startBotListSync } = require('../lib/botLists');
const { applyPresence, loadCustomStatus, loadPresenceOverride, startPresence } = require('../lib/presence');
const { startModerationScheduler } = require('../lib/moderation');
const { startReminderScheduler } = require('../lib/reminders');

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(`[bot] Logged in as ${client.user.tag} (${client.user.id})`);
    console.log(`[bot] Connected to ${client.guilds.cache.size} server(s) with ${client.commands.size} command(s) loaded.`);

    // A saved developer override wins over PRESENCE_TEXT until it is cleared.
    await loadPresenceOverride();
    await loadCustomStatus();
    startPresence(client);
    client.on(Events.ShardResume, () => applyPresence(client));

    startReminderScheduler(client);
    startModerationScheduler(client);
    startBotListSync(client);
  },
};
