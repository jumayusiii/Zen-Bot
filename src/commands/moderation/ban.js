const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  BAN_DURATIONS,
  DELETE_MESSAGE_CHOICES,
  auditReason,
  cancelScheduledUnban,
  durationByValue,
  moderationErrorMessage,
  scheduleUnban,
  sendModerationError,
  targetModerationError,
} = require('../../lib/moderation');
const { sendModerationLog } = require('../../lib/moderationLogs');

function durationChoices() {
  return BAN_DURATIONS.map(({ label, value }) => ({ name: label, value }));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a user, optionally for a set time')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The user to ban')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('duration')
        .setDescription('How long the ban should last')
        .setRequired(true)
        .addChoices(...durationChoices()),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the user is being banned')
        .setMaxLength(400),
    )
    .addIntegerOption((option) =>
      option
        .setName('delete_messages')
        .setDescription('Optionally delete recent messages from this user')
        .addChoices(
          ...DELETE_MESSAGE_CHOICES.map(({ label, value }) => ({ name: label, value })),
        ),
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
        content: 'You need the **Ban Members** permission to use `/ban`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
      await interaction.reply({
        content: 'I need the **Ban Members** permission to ban users.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const user = interaction.options.getUser('user', true);
    const duration = durationByValue(
      BAN_DURATIONS,
      interaction.options.getString('duration', true),
    );
    const deleteSeconds = interaction.options.getInteger('delete_messages') ?? 0;

    if (!duration) {
      await sendModerationError(interaction, 'Choose one of the available ban durations.');
      return;
    }

    if (user.id === interaction.user.id) {
      await sendModerationError(interaction, 'You cannot ban yourself.');
      return;
    }

    if (user.id === interaction.client.user.id) {
      await sendModerationError(interaction, 'I cannot ban myself.');
      return;
    }

    if (user.id === guild.ownerId) {
      await sendModerationError(interaction, 'The server owner cannot be banned.');
      return;
    }

    const member = await guild.members.fetch(user.id).catch(() => null);

    if (member) {
      const targetError = targetModerationError({
        guild,
        member,
        moderator: interaction.member,
      });

      if (targetError) {
        await sendModerationError(interaction, targetError);
        return;
      }
    }

    const existing = await guild.bans.fetch(user.id).catch(() => null);

    if (existing) {
      await sendModerationError(
        interaction,
        `**${user.username}** is already banned. Use \`/unban\` first if you want to change the ban.`,
      );
      return;
    }

    const reason = interaction.options.getString('reason')?.trim() || 'No reason provided';
    const expiresAt = duration.ms > 0 ? Date.now() + duration.ms : null;

    await interaction.deferReply();

    try {
      await guild.bans.create(user.id, {
        reason: auditReason(interaction.member, reason),
        deleteMessageSeconds: deleteSeconds,
      });
    } catch (error) {
      console.error(`[moderation] /ban failed for ${user.id}:`, error);
      await sendModerationError(interaction, moderationErrorMessage(error));
      return;
    }

    let scheduled = false;

    if (expiresAt) {
      try {
        await scheduleUnban({
          guildId: guild.id,
          userId: user.id,
          username: user.username,
          moderatorId: interaction.user.id,
          reason,
          dueAt: expiresAt,
        });
        scheduled = true;
      } catch (error) {
        console.error(`[moderation] Could not schedule unban for ${user.id}:`, error);
      }
    } else {
      await cancelScheduledUnban(guild.id, user.id).catch((error) => {
        console.error(`[moderation] Could not clear a stale unban for ${user.id}:`, error);
      });
    }

    const deleteLabel =
      DELETE_MESSAGE_CHOICES.find((choice) => choice.value === deleteSeconds)?.label ??
      'Do not delete any';
    const unbanLabel = !expiresAt
      ? 'Never — permanent ban'
      : scheduled
        ? `<t:${Math.floor(expiresAt / 1000)}:F> (<t:${Math.floor(expiresAt / 1000)}:R>)`
        : '⚠️ Could not schedule the auto-unban — use `/unban` manually.';

    await sendModerationLog(interaction.client, guild.id, {
      action: 'ban',
      targetId: user.id,
      targetName: user.username,
      moderatorId: interaction.user.id,
      reason,
      duration: duration.label,
      expiresAt,
      extra: `Messages deleted: ${deleteLabel}`,
    });

    const embed = createEmbed(interaction.client, {
      section: 'Moderation',
      title: expiresAt ? 'User banned temporarily' : 'User banned',
      description: `**${user.username}** was banned from **${guild.name}**.`,
      color: COLORS.danger,
      fields: [
        { name: '⏳ Duration', value: duration.label, inline: true },
        { name: '🔓 Auto-unban', value: unbanLabel, inline: true },
        { name: '🧹 Messages', value: deleteLabel, inline: true },
        { name: '🆔 User', value: `\`${user.id}\``, inline: true },
        { name: '📝 Reason', value: reason, inline: false },
      ],
      footer: `Action by ${interaction.user.username}`,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
