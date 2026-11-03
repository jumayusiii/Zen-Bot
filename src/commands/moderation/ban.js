const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  BAN_DURATIONS,
  DELETE_MESSAGE_CHOICES,
  auditReason,
  cancelScheduledUnban,
  deleteMessagesLabel,
  durationByValue,
  durationLabel,
  moderationErrorMessage,
  scheduleUnban,
  sendModerationError,
  targetModerationError,
} = require('../../lib/moderation');
const { sendModerationLog } = require('../../lib/moderationLogs');
const { getInteractionLanguage, t } = require('../../lib/i18n');

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
        content: t('en', 'moderation.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const language = await getInteractionLanguage(interaction);
    const permission = t(language, 'moderation.permissions.banMembers');

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
      await interaction.reply({
        content: t(language, 'moderation.permission', { permission, command: 'ban' }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
      await interaction.reply({
        content: t(language, 'moderation.botPermission', { permission }),
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
      await sendModerationError(interaction, t(language, 'moderation.chooseDuration'));
      return;
    }

    if (user.id === interaction.user.id) {
      await sendModerationError(interaction, t(language, 'moderation.self'));
      return;
    }

    if (user.id === interaction.client.user.id) {
      await sendModerationError(interaction, t(language, 'moderation.botSelf'));
      return;
    }

    if (user.id === guild.ownerId) {
      await sendModerationError(interaction, t(language, 'moderation.owner'));
      return;
    }

    const member = await guild.members.fetch(user.id).catch(() => null);

    if (member) {
      const targetError = targetModerationError({
        guild,
        member,
        moderator: interaction.member,
        language,
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
        t(language, 'moderation.alreadyBanned', { user: user.username }),
      );
      return;
    }

    const reason = interaction.options.getString('reason')?.trim() || t(language, 'moderation.noReason');
    const expiresAt = duration.ms > 0 ? Date.now() + duration.ms : null;

    await interaction.deferReply();

    try {
      await guild.bans.create(user.id, {
        reason: auditReason(interaction.member, reason),
        deleteMessageSeconds: deleteSeconds,
      });
    } catch (error) {
      console.error(`[moderation] /ban failed for ${user.id}:`, error);
      await sendModerationError(interaction, moderationErrorMessage(error, language));
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

    const deleteLabel = deleteMessagesLabel(deleteSeconds, language);
    const durationText = durationLabel(duration, language);
    const unbanLabel = !expiresAt
      ? t(language, 'moderation.ban.never')
      : scheduled
        ? `<t:${Math.floor(expiresAt / 1000)}:F> (<t:${Math.floor(expiresAt / 1000)}:R>)`
        : t(language, 'moderation.ban.scheduleFailed');

    await sendModerationLog(interaction.client, guild.id, {
      action: 'ban',
      targetId: user.id,
      targetName: user.username,
      moderatorId: interaction.user.id,
      reason,
      duration: durationText,
      expiresAt,
      extra: t(language, 'moderation.ban.messagesDeleted', { label: deleteLabel }),
    });

    const embed = createEmbed(interaction.client, {
      section: t(language, 'moderation.section'),
      title: t(language, expiresAt ? 'moderation.ban.tempTitle' : 'moderation.ban.title'),
      description: t(language, 'moderation.ban.description', {
        user: user.username,
        server: guild.name,
      }),
      color: COLORS.danger,
      fields: [
        { name: `⏳ ${t(language, 'moderation.fields.duration')}`, value: durationText, inline: true },
        { name: `🔓 ${t(language, 'moderation.fields.autoUnban')}`, value: unbanLabel, inline: true },
        { name: `🧹 ${t(language, 'moderation.fields.messages')}`, value: deleteLabel, inline: true },
        { name: `🆔 ${t(language, 'moderation.fields.user')}`, value: `\`${user.id}\``, inline: true },
        { name: `📝 ${t(language, 'moderation.fields.reason')}`, value: reason, inline: false },
      ],
      footer: t(language, 'common.actionBy', { user: interaction.user.username }),
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
