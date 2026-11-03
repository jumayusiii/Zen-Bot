const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  DELETE_MESSAGE_CHOICES,
  auditReason,
  deleteMessagesLabel,
  moderationErrorMessage,
  sendModerationError,
  targetModerationError,
} = require('../../lib/moderation');
const { sendModerationLog } = require('../../lib/moderationLogs');
const { getInteractionLanguage, t } = require('../../lib/i18n');

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
        content: t('en', 'moderation.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const language = await getInteractionLanguage(interaction);
    const permission = t(language, 'moderation.permissions.banMembers');

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
      await interaction.reply({
        content: t(language, 'moderation.permission', { permission, command: 'softban' }),
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

    const user = interaction.options.getUser('member', true);

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

    const existing = await guild.bans.fetch(user.id).catch(() => null);
    if (existing) {
      await sendModerationError(
        interaction,
        t(language, 'moderation.alreadyBanned', { user: user.username }),
      );
      return;
    }

    const deletedSeconds = interaction.options.getInteger('delete_messages') ?? DEFAULT_DELETE_SECONDS;
    const reason = interaction.options.getString('reason')?.trim() || t(language, 'moderation.noReason');
    const deletedLabel = deleteMessagesLabel(deletedSeconds, language);

    await interaction.deferReply();

    try {
      await guild.bans.create(user.id, {
        reason: auditReason(interaction.member, reason),
        deleteMessageSeconds: deletedSeconds,
      });
    } catch (error) {
      console.error(`[moderation] /softban failed to ban ${user.id}:`, error);
      await sendModerationError(interaction, moderationErrorMessage(error, language));
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
      duration: t(language, 'moderation.softban.duration'),
      extra: t(language, 'moderation.softban.extra', {
        label: deletedLabel,
        lifted: lifted ? t(language, 'moderation.yes') : t(language, 'moderation.no'),
      }),
    });

    if (!lifted) {
      await sendModerationError(
        interaction,
        t(language, 'moderation.softban.liftFailed', { user: user.username }),
      );
      return;
    }

    const embed = createEmbed(interaction.client, {
      section: t(language, 'moderation.section'),
      title: t(language, 'moderation.softban.title'),
      description: t(language, 'moderation.softban.description', {
        member: member.displayName,
      }),
      color: COLORS.danger,
      thumbnail: user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }),
      fields: [
        {
          name: `🎯 ${t(language, 'moderation.fields.member')}`,
          value: `${member.displayName}\n\`${user.id}\``,
          inline: true,
        },
        { name: `🧹 ${t(language, 'moderation.fields.messages')}`, value: deletedLabel, inline: true },
        { name: `📝 ${t(language, 'moderation.fields.reason')}`, value: reason, inline: false },
      ],
      footer: t(language, 'common.actionBy', { user: interaction.user.username }),
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
