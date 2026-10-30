const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { listWarnings } = require('../../lib/warnings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View the warnings recorded for a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName('member')
        .setDescription('The member whose warnings you want to see')
        .setRequired(true),
    ),

  async execute(interaction) {
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: 'This command only works in a server.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({
        content: 'You need the **Moderate Members** permission to use `/warnings`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const user = interaction.options.getUser('member', true);
    const warnings = await listWarnings(guild.id, user.id);
    const targetName = user.globalName ?? user.username;

    const fields = warnings.slice(0, 10).map((warning, index) => ({
      name: `${index + 1}. <t:${Math.floor(warning.createdAt / 1000)}:d>  ·  ${
        warning.moderatorId ? `<@${warning.moderatorId}>` : warning.moderatorName
      }`,
      value: warning.reason,
      inline: false,
    }));

    if (warnings.length > 10) {
      fields.push({
        name: '…and more',
        value: `**${warnings.length - 10}** more warning${warnings.length - 10 === 1 ? '' : 's'} are recorded.`,
        inline: false,
      });
    }

    const embed = createEmbed(interaction.client, {
      section: 'Moderation',
      title: warnings.length > 0 ? 'Recorded warnings' : 'No warnings recorded',
      description: warnings.length > 0
        ? `**${targetName}** has **${warnings.length}** warning${warnings.length === 1 ? '' : 's'} in this server.`
        : `**${targetName}** has no warnings in this server.`,
      color: warnings.length > 0 ? COLORS.warning : COLORS.success,
      thumbnail: user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }),
      fields,
      footer: `Requested by ${interaction.user.username}`,
    });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
