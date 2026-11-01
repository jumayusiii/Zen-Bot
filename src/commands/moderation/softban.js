const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  DELETE_MESSAGE_CHOICES,
  auditReason,
  moderationErrorMessage,
  sendModerationError,
  targetModerationError,
} = require('../../lib/moderation');
const { sendModerationLog } = require('../../lib/moderationLogs');

const DEFAULT_DELETE_SECONDS = 24 * 60 * 60;

function deleteChoices() {
  return DELETE_MESSAGE_CHOICES.map(({ label, value }) => ({ name: label, value }));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('softban')
    .setDescription('Ban and immediately unban a member to remove their recent messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option
        .setName('member')
        .setDescription('The member to softban')
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName('delete_messages')
        .setDescription('Delete recent messages from this member (defaults to 24 hours)')
        .addChoices(...deleteChoices()),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the member is being softbanned')
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

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
      await interaction.reply({
        content: 'You need the **Ban Members** permission to use `/softban`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
      await interaction.reply({
        content: 'I need the **Ban Members** permission to softban members.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const user = interaction.options.getUser('member', true);

    if (user.id === interaction.user.id) {
      await sendModerationError(interaction, 'You cannot softban yourself.');
      return;
    }

    if (user.id === interaction.client.user.id) {
      await sendModerationError(interaction, 'I cannot softban myself.');
      return;
    }

    if (user.id === guild.ownerId) {
      await sendModerationError(interaction, 'The server owner cannot be softbanned.');
      return;
    }

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

    const existing = await guild.bans.fetch(user.id).catch(() => null);
    if (existing) {
      await sendModerationError(
        interaction,
        `**${user.username}** is already banned. Use \`/unban\` first if you want to change the ban.`,
      );
      return;
    }

    const deletedSeconds = interaction.options.getInteger('delete_messages') ?? DEFAULT_DELETE_SECONDS;
    const reason = interaction.options.getString('reason')?.trim() || 'No reason provided';
    const deletedLabel = DELETE_MESSAGE_CHOICES.find(
      (choice) => choice.value === deletedSeconds,
    )?.label ?? 'Do not delete any';

    await interaction.deferReply();

    try {
      await guild.bans.create(user.id, {
        reason: auditReason(interaction.member, reason),
        deleteMessageSeconds: deletedSeconds,
      });
    } catch (error) {
      console.error(`[moderation] /softban failed to ban ${user.id}:`, error);
      await sendModerationError(interaction, moderationErrorMessage(error));
      return;
    }

    let lifted = false;

    try {
      await guild.bans.remove(user.id, auditReason(interaction.member, reason));
      lifted = true;
    } catch (error) {
      console.error(`[moderation] /softban could not lift the ban for ${user.id}:`, error);
    }

    await sendModerationLog(interaction.client, guild.id, {
      action: 'softban',
      targetId: user.id,
      targetName: user.username,
      moderatorId: interaction.user.id,
      reason,
      duration: 'Immediate cleanup',
      extra: `Messages: ${deletedLabel}. Ban lifted: ${lifted ? 'yes' : 'no — use /unban'}.`,
    });

    if (!lifted) {
      await sendModerationError(
        interaction,
        `**${user.username}** was banned and their messages were cleaned, but I could not lift the ban. Use \`/unban\` to finish the softban.`,
      );
      return;
    }

    const embed = createEmbed(interaction.client, {
      section: 'Moderation',
      title: 'Member softbanned',
      description: `**${member.displayName}** was removed and their recent messages were cleaned up. They can rejoin with a new invite.`,
      color: COLORS.danger,
      thumbnail: user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }),
      fields: [
        { name: '🎯 Member', value: `${member.displayName}\n\`${user.id}\``, inline: true },
        { name: '🧹 Messages', value: deletedLabel, inline: true },
        { name: '📝 Reason', value: reason, inline: false },
      ],
      footer: `Action by ${interaction.user.username}`,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
