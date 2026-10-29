const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  auditReason,
  moderationErrorMessage,
  sendModerationError,
  targetModerationError,
} = require('../../lib/moderation');
const { sendModerationLog } = require('../../lib/moderationLogs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Remove a member from this server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) =>
      option
        .setName('member')
        .setDescription('The member to kick')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the member is being kicked')
        .setMaxLength(400),
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

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
      await interaction.reply({
        content: 'You need the **Kick Members** permission to use `/kick`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!guild.members.me?.permissions.has(PermissionFlagsBits.KickMembers)) {
      await interaction.reply({
        content: 'I need the **Kick Members** permission to kick members.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const user = interaction.options.getUser('member', true);
    const member = await guild.members.fetch(user.id).catch(() => null);
    const targetError = targetModerationError({
      guild,
      member,
      moderator: interaction.member,
    });

    if (targetError) {
      await sendModerationError(interaction, targetError);
      return;
    }

    const reason = interaction.options.getString('reason')?.trim() || 'No reason provided';
    await interaction.deferReply();

    try {
      await member.kick(auditReason(interaction.member, reason));
    } catch (error) {
      console.error(`[moderation] /kick failed for ${user.id}:`, error);
      await sendModerationError(interaction, moderationErrorMessage(error));
      return;
    }

    await sendModerationLog(interaction.client, guild.id, {
      action: 'kick',
      targetId: user.id,
      targetName: member.displayName,
      moderatorId: interaction.user.id,
      reason,
    });

    const embed = createEmbed(interaction.client, {
      section: 'Moderation',
      title: 'Member kicked',
      description: `**${member.displayName}** was removed from **${guild.name}**.`,
      color: COLORS.danger,
      fields: [
        { name: '🆔 User', value: `\`${user.id}\``, inline: true },
        { name: '📝 Reason', value: reason, inline: false },
      ],
      footer: `Action by ${interaction.user.username}`,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
