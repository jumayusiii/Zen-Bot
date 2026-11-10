const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { getInteractionLanguage, t } = require('../../lib/i18n');
const { setLevelSystemEnabled } = require('../../lib/levelSettings');
const { sendModerationLog } = require('../../lib/moderationLogs');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levelsystem')
    .setDescription('Pause or resume the level system for this server (admins only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addBooleanOption((option) =>
      option
        .setName('enabled')
        .setDescription('Whether chat XP and level commands should be active')
        .setRequired(true),
    ),

  async execute(interaction) {
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: t('en', 'common.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const language = await getInteractionLanguage(interaction);
    const isOwner = interaction.user.id === guild.ownerId;
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

    if (!isOwner && !isAdmin) {
      await interaction.reply({
        content: t(language, 'moderation.permission', {
          permission: t(language, 'moderation.permissions.administrator'),
          command: 'levelsystem',
        }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const enabled = interaction.options.getBoolean('enabled', true);

    try {
      const result = await setLevelSystemEnabled(guild.id, enabled, interaction.user.id);

      if (!result.changed) {
        await interaction.reply({
          content: t(
            language,
            enabled
              ? 'moderation.levelsystem.alreadyEnabled'
              : 'moderation.levelsystem.alreadyDisabled',
          ),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const state = t(
        language,
        enabled
          ? 'moderation.levelsystem.enabled'
          : 'moderation.levelsystem.disabled',
      );

      await sendModerationLog(interaction.client, guild.id, {
        action: 'levelsystem',
        targetName: guild.name,
        moderatorId: interaction.user.id,
        reason: t(language, 'moderation.levelsystem.reason'),
        extra: t(
          language,
          enabled
            ? 'moderation.levelsystem.logEnabled'
            : 'moderation.levelsystem.logDisabled',
        ),
      });

      await interaction.reply({
        embeds: [
          createEmbed(interaction.client, {
            section: t(language, 'help.tabs.levels'),
            title: t(
              language,
              enabled
                ? 'moderation.levelsystem.titleEnabled'
                : 'moderation.levelsystem.titleDisabled',
            ),
            description: t(
              language,
              enabled
                ? 'moderation.levelsystem.descriptionEnabled'
                : 'moderation.levelsystem.descriptionDisabled',
            ),
            color: enabled ? COLORS.success : COLORS.warning,
            fields: [
              {
                name: `📈 ${t(language, 'moderation.levelsystem.status')}`,
                value: `**${state}**`,
                inline: true,
              },
            ],
            footer: t(language, 'moderation.levelsystem.changedBy', {
              user: interaction.user.username,
            }),
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error('[levels] /levelsystem failed:', error);
      await interaction.reply({
        content: t(language, 'moderation.levelsystem.error'),
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
