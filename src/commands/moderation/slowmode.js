const {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  auditReason,
  moderationErrorMessage,
  sendModerationError,
} = require('../../lib/moderation');
const { sendModerationLog } = require('../../lib/moderationLogs');
const { formatSlowmode } = require('../../lib/moderationTools');
const { getInteractionLanguage, t } = require('../../lib/i18n');

const MAX_SLOWMODE_SECONDS = 6 * 60 * 60;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set the message cooldown for a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption((option) =>
      option
        .setName('seconds')
        .setDescription('Seconds between messages; 0 turns slowmode off')
        .setRequired(true)
        .setMinValue(0)
        .setMaxValue(MAX_SLOWMODE_SECONDS),
    )
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The channel to update (defaults to this one)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the slowmode is changing')
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
    const permission = t(language, 'moderation.permissions.manageChannels');

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: t(language, 'moderation.permission', { permission, command: 'slowmode' }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    if (!channel?.isTextBased?.() || channel.guildId !== guild.id) {
      await interaction.reply({
        content: t(language, 'moderation.channelOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const memberPermissions = channel.permissionsFor?.(interaction.member);
    if (!memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: t(language, 'moderation.slowmode.memberPermission', { channel }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const botPermissions = channel.permissionsFor?.(guild.members.me);
    if (!botPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: t(language, 'moderation.slowmode.botPermission', { channel }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const seconds = interaction.options.getInteger('seconds', true);
    const reason = interaction.options.getString('reason')?.trim() || t(language, 'moderation.noReason');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await channel.setRateLimitPerUser(seconds, auditReason(interaction.member, reason));
    } catch (error) {
      console.error('[moderation] /slowmode failed:', error);
      await sendModerationError(interaction, moderationErrorMessage(error, language));
      return;
    }

    const label = formatSlowmode(seconds, language);

    await sendModerationLog(interaction.client, guild.id, {
      action: 'slowmode',
      targetId: null,
      targetName: `#${channel.name}`,
      moderatorId: interaction.user.id,
      reason,
      extra: t(language, 'moderation.slowmode.extra', { label, channel }),
    });

    const embed = createEmbed(interaction.client, {
      section: t(language, 'moderation.section'),
      title: t(
        language,
        seconds === 0 ? 'moderation.slowmode.disabledTitle' : 'moderation.slowmode.updatedTitle',
      ),
      description: seconds === 0
        ? t(language, 'moderation.slowmode.disabledDescription', { channel })
        : t(language, 'moderation.slowmode.updatedDescription', { label, channel }),
      color: seconds === 0 ? COLORS.success : COLORS.info,
      fields: [
        { name: `📁 ${t(language, 'moderation.fields.channel')}`, value: `${channel}`, inline: true },
        {
          name: `⏱️ ${t(language, 'moderation.fields.slowmode')}`,
          value: `**${label}**`,
          inline: true,
        },
        { name: `📝 ${t(language, 'moderation.fields.reason')}`, value: reason, inline: false },
      ],
      footer: t(language, 'common.actionBy', { user: interaction.user.username }),
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
