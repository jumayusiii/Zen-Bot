const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { sendModerationError, targetModerationError } = require('../../lib/moderation');
const { sendModerationLog } = require('../../lib/moderationLogs');
const { getInteractionLanguage, t } = require('../../lib/i18n');
const {
  MAX_REASON_LENGTH,
  addWarning,
  countWarnings,
} = require('../../lib/warnings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Record a warning for a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName('member')
        .setDescription('The member to warn')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the member is being warned')
        .setRequired(true)
        .setMaxLength(MAX_REASON_LENGTH),
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
        content: t(language, 'moderation.permission', { permission, command: 'warn' }),
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

    const reason = interaction.options.getString('reason', true).trim();
    const moderatorName = interaction.member?.displayName ?? interaction.user.username;

    try {
      await addWarning({
        guildId: guild.id,
        userId: user.id,
        username: user.username,
        moderatorId: interaction.user.id,
        moderatorName,
        reason,
      });
    } catch (error) {
      console.error(`[moderation] /warn failed for ${user.id}:`, error);
      await sendModerationError(interaction, t(language, 'moderation.saveWarningError'));
      return;
    }

    const total = await countWarnings(guild.id, user.id);
    const targetName = member?.displayName ?? user.globalName ?? user.username;

    await sendModerationLog(interaction.client, guild.id, {
      action: 'warn',
      targetId: user.id,
      targetName: user.username,
      moderatorId: interaction.user.id,
      reason,
      extra: t(language, 'moderation.warn.extra', { count: total }),
    });

    if (typeof user.send === 'function') {
      await user.send({
        embeds: [
          createEmbed(interaction.client, {
            section: t(language, 'moderation.section'),
            title: t(language, 'moderation.warn.dmTitle'),
            description: t(language, 'moderation.warn.dmDescription', { server: guild.name }),
            color: COLORS.warning,
            fields: [
              { name: `📝 ${t(language, 'moderation.fields.reason')}`, value: reason, inline: false },
              {
                name: `🔢 ${t(language, 'moderation.fields.warningCount')}`,
                value: `**${total}**`,
                inline: true,
              },
              { name: `🛡️ ${t(language, 'moderation.fields.server')}`, value: guild.name, inline: true },
            ],
            footer: t(language, 'moderation.warn.dmFooter'),
          }),
        ],
        allowedMentions: { parse: [] },
      }).catch(() => {});
    }

    const embed = createEmbed(interaction.client, {
      section: t(language, 'moderation.section'),
      title: t(language, 'moderation.warn.title'),
      description: t(
        language,
        total === 1 ? 'moderation.warn.descriptionOne' : 'moderation.warn.descriptionMany',
        { target: targetName, count: total },
      ),
      color: COLORS.warning,
      thumbnail: user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }),
      fields: [
        {
          name: `🎯 ${t(language, 'moderation.fields.member')}`,
          value: `${targetName}\n\`${user.id}\``,
          inline: true,
        },
        { name: `🔢 ${t(language, 'moderation.fields.total')}`, value: `**${total}**`, inline: true },
        { name: `📝 ${t(language, 'moderation.fields.reason')}`, value: reason, inline: false },
      ],
      footer: t(language, 'common.actionBy', { user: interaction.user.username }),
    });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
