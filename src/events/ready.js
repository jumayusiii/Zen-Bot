const { ActivityType, Events } = require('discord.js');
const { presenceText } = require('../lib/config');
const { startBotListSync } = require('../lib/botLists');
const { startModerationScheduler } = require('../lib/moderation');
const { startReminderScheduler } = require('../lib/reminders');
const { startSiteMonitor } = require('../lib/siteMonitor');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`[bot] Logged in as ${client.user.tag} (${client.user.id})`);
    console.log(`[bot] Connected to ${client.guilds.cache.size} server(s) with ${client.commands.size} command(s) loaded.`);

    const activity = presenceText();
    client.user.setPresence({
      status: 'online',
      activities: [
        {
          name: activity,
          type: ActivityType.Playing,
        },
      ],
    });
    console.log(`[bot] Rich presence set: Playing ${activity}`);

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
