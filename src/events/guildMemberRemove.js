const { Events } = require('discord.js');
const { sendGreeting } = require('../lib/greetings');

module.exports = {
  name: Events.GuildMemberRemove,

  async execute(member) {
    await sendGreeting(member.client, member, 'leave');
  },
};
