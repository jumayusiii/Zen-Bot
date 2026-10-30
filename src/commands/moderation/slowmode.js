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
        content: 'This command only works in a server.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: 'You need the **Manage Channels** permission to use `/slowmode`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    if (!channel?.isTextBased?.() || channel.guildId !== guild.id) {
      await interaction.reply({
        content: 'Choose a text channel from this server.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const memberPermissions = channel.permissionsFor?.(interaction.member);
    if (!memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: `You need **Manage Channels** in ${channel} to change its slowmode.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const botPermissions = channel.permissionsFor?.(guild.members.me);
    if (!botPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: `I need **Manage Channels** in ${channel} to change its slowmode.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const seconds = interaction.options.getInteger('seconds', true);
    const reason = interaction.options.getString('reason')?.trim() || 'No reason provided';

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      await channel.setRateLimitPerUser(seconds, auditReason(interaction.member, reason));
    } catch (error) {
      console.error('[moderation] /slowmode failed:', error);
      await sendModerationError(interaction, moderationErrorMessage(error));
      return;
    }

    const label = formatSlowmode(seconds);

    await sendModerationLog(interaction.client, guild.id, {
      action: 'slowmode',
      targetId: null,
      targetName: `#${channel.name}`,
      moderatorId: interaction.user.id,
      reason,
      extra: `Slowmode set to ${label} in ${channel}.`,
    });

    const embed = createEmbed(interaction.client, {
      section: 'Moderation',
      title: seconds === 0 ? 'Slowmode disabled' : 'Slowmode updated',
      description: seconds === 0
        ? `Members can talk normally in ${channel} again.`
        : `Members must wait **${label}** between messages in ${channel}.`,
      color: seconds === 0 ? COLORS.success : COLORS.info,
      fields: [
        { name: '📁 Channel', value: `${channel}`, inline: true },
        { name: '⏱️ Slowmode', value: `**${label}**`, inline: true },
        { name: '📝 Reason', value: reason, inline: false },
      ],
      footer: `Action by ${interaction.user.username}`,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
