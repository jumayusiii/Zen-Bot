const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { sendModerationLog } = require('../../lib/moderationLogs');
const { MAX_REASON_LENGTH, clearWarnings, listWarnings } = require('../../lib/warnings');
const { getInteractionLanguage, t } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription("View or clear the warnings recorded for a member")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName('member')
        .setDescription('The member whose warnings you want to manage')
        .setRequired(true),
    )
    .addBooleanOption((option) =>
      option
        .setName('clear')
        .setDescription('Remove every warning instead of listing them'),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the warnings are being cleared')
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
    const user = interaction.options.getUser('member', true);
    const targetName = user.globalName ?? user.username;
    const clear = interaction.options.getBoolean('clear') ?? false;

    if (clear) {
      const permission = t(language, 'moderation.permissions.manageGuild');

      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
        await interaction.reply({
          content: t(language, 'moderation.permission', { permission, command: 'warnings' }),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const reason = interaction.options.getString('reason')?.trim()
        || t(language, 'moderation.noReason');
      const { removed } = await clearWarnings(guild.id, user.id);

      if (removed.length === 0) {
        await interaction.reply({
          content: t(language, 'moderation.clearwarnings.none', { target: targetName }),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await sendModerationLog(interaction.client, guild.id, {
        action: 'clearwarnings',
        targetId: user.id,
        targetName: user.username,
        moderatorId: interaction.user.id,
        reason,
        extra: t(
          language,
          removed.length === 1
            ? 'moderation.clearwarnings.extraOne'
            : 'moderation.clearwarnings.extraMany',
          { count: removed.length },
        ),
      });

      const embed = createEmbed(interaction.client, {
        section: t(language, 'moderation.section'),
        title: t(language, 'moderation.clearwarnings.title'),
        description: t(
          language,
          removed.length === 1
            ? 'moderation.clearwarnings.descriptionOne'
            : 'moderation.clearwarnings.descriptionMany',
          { count: removed.length, target: targetName },
        ),
        color: COLORS.success,
        thumbnail: user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }),
        fields: [
          {
            name: `🎯 ${t(language, 'moderation.fields.member')}`,
            value: `${targetName}\n\`${user.id}\``,
            inline: true,
          },
          {
            name: `🧹 ${t(language, 'moderation.fields.cleared')}`,
            value: `**${removed.length}**`,
            inline: true,
          },
          { name: `📝 ${t(language, 'moderation.fields.reason')}`, value: reason, inline: false },
        ],
        footer: t(language, 'common.actionBy', { user: interaction.user.username }),
      });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    const permission = t(language, 'moderation.permissions.moderateMembers');

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({
        content: t(language, 'moderation.permission', { permission, command: 'warnings' }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const warnings = await listWarnings(guild.id, user.id);

    const fields = warnings.slice(0, 10).map((warning, index) => ({
      name: `${index + 1}. <t:${Math.floor(warning.createdAt / 1000)}:d>  ·  ${
        warning.moderatorId ? `<@${warning.moderatorId}>` : warning.moderatorName
      }`,
      value: warning.reason,
      inline: false,
    }));

    if (warnings.length > 10) {
      const extra = warnings.length - 10;
      fields.push({
        name: t(language, 'moderation.warnings.more'),
        value: t(
          language,
          extra === 1 ? 'moderation.warnings.moreValueOne' : 'moderation.warnings.moreValueMany',
          { count: extra },
        ),
        inline: false,
      });
    }

    const embed = createEmbed(interaction.client, {
      section: t(language, 'moderation.section'),
      title: t(
        language,
        warnings.length > 0 ? 'moderation.warnings.title' : 'moderation.warnings.emptyTitle',
      ),
      description: warnings.length > 0
        ? t(
          language,
          warnings.length === 1
            ? 'moderation.warnings.descriptionOne'
            : 'moderation.warnings.descriptionMany',
          { target: targetName, count: warnings.length },
        )
        : t(language, 'moderation.warnings.emptyDescription', { target: targetName }),
      color: warnings.length > 0 ? COLORS.warning : COLORS.success,
      thumbnail: user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }),
      fields,
      footer: t(language, 'common.requestedBy', { user: interaction.user.username }),
    });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
