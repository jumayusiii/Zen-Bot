const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { sendModerationLog } = require('../../lib/moderationLogs');
const { MAX_REASON_LENGTH, clearWarnings } = require('../../lib/warnings');
const { getInteractionLanguage, t } = require('../../lib/i18n');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarnings')
    .setDescription("Clear a member's recorded warnings")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((option) =>
      option
        .setName('member')
        .setDescription('The member whose warnings should be cleared')
        .setRequired(true),
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
    const permission = t(language, 'moderation.permissions.manageGuild');

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: t(language, 'moderation.permission', {
          permission,
          command: 'clearwarnings',
        }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const user = interaction.options.getUser('member', true);
    const reason = interaction.options.getString('reason')?.trim() || t(language, 'moderation.noReason');
    const targetName = user.globalName ?? user.username;
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
  },
};
