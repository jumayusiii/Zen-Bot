const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { guildFailureMessage, resolveGuild } = require('../../lib/guilds');

function timestamp(milliseconds) {
  const seconds = Math.floor(milliseconds / 1000);
  return `<t:${seconds}:F> (<t:${seconds}:R>)`;
}

function formatPermission(name) {
  return name.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function permissionSummary(role, limit = 12) {
  if (role.permissions.has('Administrator')) {
    return 'Administrator — this role has every permission.';
  }

  const permissions = role.permissions.toArray();
  if (permissions.length === 0) return 'None';

  const shown = permissions.slice(0, limit).map(formatPermission);
  const hidden = permissions.length - shown.length;
  return shown.join(', ') + (hidden > 0 ? ` …and **${hidden}** more` : '');
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Show details and permissions for a server role')
    .addRoleOption((option) =>
      option
        .setName('role')
        .setDescription('The role to inspect')
        .setRequired(true),
    ),

  async execute(interaction) {
    const resolution = await resolveGuild(interaction);

    if (!resolution.guild) {
      await interaction.reply({
        content: guildFailureMessage(resolution.source),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const role = interaction.options.getRole('role', true);
    const guild = resolution.guild;

    if (!role) {
      await interaction.reply({
        content: 'That role could not be found. It may have been deleted.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const everyone = role.id === guild.id;

    const embed = createEmbed(interaction.client, {
      section: 'Server Roles',
      title: everyone ? '@everyone' : role.name,
      description: everyone
        ? `The base role that applies to all **${guild.memberCount.toLocaleString('en-US')}** members of this server.`
        : `A server role in **${guild.name}**.`,
      color: role.color || COLORS.brand,
      thumbnail: role.iconURL({ extension: 'png', size: 256, forceStatic: true }) ?? undefined,
      fields: [
        { name: '🆔 Role ID', value: `\`${role.id}\``, inline: true },
        { name: '📅 Created', value: timestamp(role.createdTimestamp), inline: true },
        { name: '🎨 Color', value: role.hexColor === '#000000' ? 'None' : `\`${role.hexColor}\``, inline: true },
        { name: '📈 Position', value: String(role.position), inline: true },
        { name: '🔔 Mentionable', value: role.mentionable ? 'Yes' : 'No', inline: true },
        { name: '📌 Hoisted', value: role.hoist ? 'Yes' : 'No', inline: true },
        { name: '🤖 Managed', value: role.managed ? 'Yes' : 'No', inline: true },
        {
          name: '🛡️ Permissions',
          value: permissionSummary(role).slice(0, 1024),
          inline: false,
        },
      ],
      footer: `Requested by ${interaction.user.username}`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
