const { Events } = require('discord.js');
const { startBotListSync } = require('../lib/botLists');
const { applyPresence, loadCustomStatus, loadPresenceOverride, startPresence } = require('../lib/presence');
const { startModerationScheduler } = require('../lib/moderation');
const { startReminderScheduler } = require('../lib/reminders');
const { startSiteMonitor } = require('../lib/siteMonitor');

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

    startSiteMonitor(client);
    startReminderScheduler(client);
    startModerationScheduler(client);
    startBotListSync(client);

    const siteStatusCommand = client.commands.get('sitestatus');
    if (typeof siteStatusCommand?.resumeAutoRefresh === 'function') {
      siteStatusCommand.resumeAutoRefresh(client).catch((error) => {
        console.error('[sitestatus] Could not resume auto-refreshing reports:', error);
      });
    }
  },
};
