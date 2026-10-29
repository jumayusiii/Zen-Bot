const { Events } = require('discord.js');
const { sendGreeting } = require('../lib/greetings');

module.exports = {
  name: Events.GuildMemberAdd,

  async execute(member) {
    await sendGreeting(member.client, member, 'welcome');
  },
};
