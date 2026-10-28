const { SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');

function timestamp(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  return `<t:${seconds}:F> (<t:${seconds}:R>)`;
}

function formatRoles(member) {
  if (!member) return null;

  const roles = [...member.roles.cache.values()]
    .filter((role) => role.id !== member.guild.id)
    .sort((a, b) => b.position - a.position);

  if (roles.length === 0) return 'None';

  const shown = [];
  let length = 0;

  for (const role of roles) {
    const mention = role.toString();
    if (length + mention.length + 1 > 1000) break;
    shown.push(mention);
    length += mention.length + 1;
  }

  const hidden = roles.length - shown.length;
  return shown.join(' ') + (hidden > 0 ? ` … +${hidden} more` : '');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Show information about a user')
    .addUserOption((option) =>
      option.setName('user').setDescription('The user to inspect (defaults to you)'),
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const user = interaction.options.getUser('user') ?? interaction.user;
    const guild = interaction.guild;
    const member = guild ? await guild.members.fetch(user.id).catch(() => null) : null;

    const fields = [
      { name: '🆔 User ID', value: `\`${user.id}\``, inline: true },
      { name: '🤖 Account Type', value: user.bot ? 'Bot' : 'Human', inline: true },
      { name: '📅 Account Created', value: timestamp(user.createdTimestamp), inline: true },
    ];

    if (member) {
      fields.push(
        { name: '📥 Joined Server', value: timestamp(member.joinedTimestamp), inline: false },
        {
          name: '🎭 Top Role',
          value: member.roles.highest.id === member.guild.id ? 'None' : member.roles.highest.toString(),
          inline: true,
        },
        { name: '🏷️ Nickname', value: member.nickname || 'None', inline: true },
        { name: '📋 Roles', value: formatRoles(member), inline: false },
      );
    }

    const embed = createEmbed(interaction.client, {
      section: 'User Profile',
      title: user.displayName,
      color: member?.displayColor || user.accentColor || COLORS.info,
      thumbnail: user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }),
      description: `**@${user.username}**${user.bot ? ' · Bot account' : ''}`,
      footer: `Requested by ${interaction.user.username}`,
      fields,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
