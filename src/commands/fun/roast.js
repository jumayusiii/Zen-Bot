const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { randomRoast } = require('../../lib/fun');

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('roast')
    .setDescription('Serve a playful, harmless roast')
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The member to roast (defaults to you)'),
    ),

  async execute(interaction) {
    const targetMember = interaction.options.getMember('user') ?? interaction.member;
    const targetUser = interaction.options.getUser('user') ?? interaction.user;
    const displayName = targetMember?.displayName ?? targetUser.displayName ?? targetUser.username;
    const roast = randomRoast();

    const embed = createEmbed(interaction.client, {
      section: 'Fun',
      title: 'Roast served',
      description: [`**${displayName}**`, '', roast.text].join('\n'),
      color: COLORS.fun,
      thumbnail: (targetMember ?? targetUser).displayAvatarURL({
        extension: 'png',
        size: 256,
        forceStatic: true,
      }),
      fields: [
        { name: '🎯 Target', value: displayName, inline: true },
        { name: '🔥 Heat', value: 'Playful', inline: true },
        { name: '🍿 Served by', value: interaction.user.username, inline: true },
      ],
      footer: `Requested by ${interaction.user.username}  ·  all in good fun`,
    });

    await interaction.reply({ embeds: [embed], allowedMentions: { parse: [] } });
  },
};
