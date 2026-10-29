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
    .setName('unmute')
    .setDescription("Remove a member's timeout and restore their access")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName('member')
        .setDescription('The member to unmute')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the timeout is being removed')
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

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({
        content: 'You need the **Moderate Members** permission to use `/unmute`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({
        content: 'I need the **Moderate Members** permission to unmute members.',
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

    if (!member.isCommunicationDisabled?.()) {
      await sendModerationError(
        interaction,
        `**${member.displayName}** is not currently muted.`,
      );
      return;
    }

    const reason = interaction.options.getString('reason')?.trim() || 'No reason provided';
    await interaction.deferReply();

    try {
      await member.timeout(null, auditReason(interaction.member, reason));
    } catch (error) {
      console.error(`[moderation] /unmute failed for ${user.id}:`, error);
      await sendModerationError(interaction, moderationErrorMessage(error));
      return;
    }

    await sendModerationLog(interaction.client, guild.id, {
      action: 'unmute',
      targetId: user.id,
      targetName: member.displayName,
      moderatorId: interaction.user.id,
      reason,
    });

    const embed = createEmbed(interaction.client, {
      section: 'Moderation',
      title: 'Member unmuted',
      description: `**${member.displayName}** can send messages and join voice channels again.`,
      color: COLORS.success,
      fields: [
        { name: '🔊 Timeout', value: 'Removed', inline: true },
        { name: '🆔 Member', value: `\`${user.id}\``, inline: true },
        { name: '📝 Reason', value: reason, inline: false },
      ],
      footer: `Action by ${interaction.user.username}`,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
