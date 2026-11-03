const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  auditReason,
  moderationErrorMessage,
  sendModerationError,
  targetModerationError,
} = require('../../lib/moderation');
const { sendModerationLog } = require('../../lib/moderationLogs');
const { getInteractionLanguage, t } = require('../../lib/i18n');

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
        content: t('en', 'moderation.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const language = await getInteractionLanguage(interaction);
    const permission = t(language, 'moderation.permissions.moderateMembers');

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({
        content: t(language, 'moderation.permission', { permission, command: 'unmute' }),
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

    if (!member.isCommunicationDisabled?.()) {
      await sendModerationError(
        interaction,
        t(language, 'moderation.notMuted', { target: member.displayName }),
      );
      return;
    }

    const reason = interaction.options.getString('reason')?.trim() || t(language, 'moderation.noReason');
    await interaction.deferReply();

    try {
      await member.timeout(null, auditReason(interaction.member, reason));
    } catch (error) {
      console.error(`[moderation] /unmute failed for ${user.id}:`, error);
      await sendModerationError(interaction, moderationErrorMessage(error, language));
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
      section: t(language, 'moderation.section'),
      title: t(language, 'moderation.unmute.title'),
      description: t(language, 'moderation.unmute.description', { member: member.displayName }),
      color: COLORS.success,
      fields: [
        {
          name: `🔊 ${t(language, 'moderation.fields.timeout')}`,
          value: t(language, 'moderation.unmute.timeoutRemoved'),
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
