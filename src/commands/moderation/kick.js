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
        content: t('en', 'moderation.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const language = await getInteractionLanguage(interaction);
    const permission = t(language, 'moderation.permissions.kickMembers');

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.KickMembers)) {
      await interaction.reply({
        content: t(language, 'moderation.permission', { permission, command: 'kick' }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!guild.members.me?.permissions.has(PermissionFlagsBits.KickMembers)) {
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

    const reason = interaction.options.getString('reason')?.trim() || t(language, 'moderation.noReason');
    await interaction.deferReply();

    try {
      await member.kick(auditReason(interaction.member, reason));
    } catch (error) {
      console.error(`[moderation] /kick failed for ${user.id}:`, error);
      await sendModerationError(interaction, moderationErrorMessage(error, language));
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
      section: t(language, 'moderation.section'),
      title: t(language, 'moderation.kick.title'),
      description: t(language, 'moderation.kick.description', {
        member: member.displayName,
        server: guild.name,
      }),
      color: COLORS.danger,
      fields: [
        { name: `🆔 ${t(language, 'moderation.fields.user')}`, value: `\`${user.id}\``, inline: true },
        { name: `📝 ${t(language, 'moderation.fields.reason')}`, value: reason, inline: false },
      ],
      footer: t(language, 'common.actionBy', { user: interaction.user.username }),
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
