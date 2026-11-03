const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { listWarnings } = require('../../lib/warnings');
const { getInteractionLanguage, t } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('View the warnings recorded for a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName('member')
        .setDescription('The member whose warnings you want to see')
        .setRequired(true),
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
        content: t(language, 'moderation.permission', { permission, command: 'warnings' }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const user = interaction.options.getUser('member', true);
    const warnings = await listWarnings(guild.id, user.id);
    const targetName = user.globalName ?? user.username;

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
