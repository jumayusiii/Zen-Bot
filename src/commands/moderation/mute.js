const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  MUTE_DURATIONS,
  auditReason,
  durationByValue,
  durationLabel,
  moderationErrorMessage,
  sendModerationError,
  targetModerationError,
} = require('../../lib/moderation');
const { sendModerationLog } = require('../../lib/moderationLogs');
const { getInteractionLanguage, t } = require('../../lib/i18n');

function durationChoices() {
  return MUTE_DURATIONS.map(({ label, value }) => ({ name: label, value }));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Time out a member so they cannot send messages or join voice')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName('member')
        .setDescription('The member to mute')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('duration')
        .setDescription('How long the timeout should last')
        .setRequired(true)
        .addChoices(...durationChoices()),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the member is being muted')
        .setMaxLength(400),
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
    const permission = t(language, 'moderation.permissions.moderateMembers');

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({
        content: t(language, 'moderation.permission', { permission, command: 'mute' }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({
        content: t(language, 'moderation.botPermission', { permission }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const user = interaction.options.getUser('member', true);
    const duration = durationByValue(
      MUTE_DURATIONS,
      interaction.options.getString('duration', true),
    );

    if (!duration) {
      await sendModerationError(interaction, t(language, 'moderation.chooseDuration'));
      return;
    }

    const member = await guild.members.fetch(user.id).catch(() => null);
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

    if (member.isCommunicationDisabled?.()) {
      const until = member.communicationDisabledUntilTimestamp;
      const suffix = Number.isFinite(until)
        ? ` ${t(language, 'moderation.until')} <t:${Math.floor(until / 1000)}:R>`
        : '';
      await sendModerationError(
        interaction,
        t(language, 'moderation.alreadyMuted', { target: member.displayName, until: suffix }),
      );
      return;
    }

    const reason = interaction.options.getString('reason')?.trim() || t(language, 'moderation.noReason');
    const expiresAt = Date.now() + duration.ms;

    await interaction.deferReply();

    try {
      await member.timeout(duration.ms, auditReason(interaction.member, reason));
    } catch (error) {
      console.error(`[moderation] /mute failed for ${user.id}:`, error);
      await sendModerationError(interaction, moderationErrorMessage(error, language));
      return;
    }

    await sendModerationLog(interaction.client, guild.id, {
      action: 'mute',
      targetId: user.id,
      targetName: member.displayName,
      moderatorId: interaction.user.id,
      reason,
      duration: durationLabel(duration, language),
      expiresAt,
    });

    const unix = Math.floor(expiresAt / 1000);
    const embed = createEmbed(interaction.client, {
      section: t(language, 'moderation.section'),
      title: t(language, 'moderation.mute.title'),
      description: t(language, 'moderation.mute.description', { member: member.displayName }),
      color: COLORS.warning,
      fields: [
        {
          name: `⏳ ${t(language, 'moderation.fields.duration')}`,
          value: durationLabel(duration, language),
          inline: true,
        },
        {
          name: `🔇 ${t(language, 'moderation.fields.expires')}`,
          value: `<t:${unix}:F> (<t:${unix}:R>)`,
          inline: true,
        },
        { name: `🆔 ${t(language, 'moderation.fields.member')}`, value: `\`${user.id}\``, inline: true },
        { name: `📝 ${t(language, 'moderation.fields.reason')}`, value: reason, inline: false },
      ],
      footer: t(language, 'common.actionBy', { user: interaction.user.username }),
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
