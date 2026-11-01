const {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  clearChannelLock,
  getChannelLock,
} = require('../../lib/channelLocks');
const {
  auditReason,
  sendModerationError,
} = require('../../lib/moderation');
const { sendModerationLog } = require('../../lib/moderationLogs');

const LOCKABLE_TYPES = new Set([ChannelType.GuildText, ChannelType.GuildAnnouncement]);
const BOT_PERMISSIONS = [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles];

function restoreValue(state) {
  if (state === 'allow') return true;
  if (state === 'deny') return false;
  return null;
}

function restoredLabel(state) {
  if (state === 'allow') return 'Members can send messages again.';
  if (state === 'deny') return 'The channel keeps its previous read-only @everyone setting.';
  return 'The channel now inherits @everyone permissions again.';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Restore a channel that Zen locked')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The locked text channel to restore (defaults to this one)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the channel is being unlocked')
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
        content: 'You need the **Manage Channels** permission to use `/unlock`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!guild.members.me?.permissions.has(BOT_PERMISSIONS)) {
      await interaction.reply({
        content: 'I need **Manage Channels** and **Manage Roles** to unlock channels.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    if (!channel || !LOCKABLE_TYPES.has(channel.type) || channel.guildId !== guild.id) {
      await interaction.reply({
        content: 'Choose a text or announcement channel from this server.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const lock = await getChannelLock(guild.id, channel.id);
    if (!lock) {
      await interaction.reply({
        content: `No Zen lock is recorded for ${channel}. If it is read-only, change its permissions in the channel settings so an intentional setup is not overwritten.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const reason = interaction.options.getString('reason')?.trim() || 'No reason provided';

    try {
      await channel.permissionOverwrites.edit(
        guild.roles.everyone,
        { SendMessages: restoreValue(lock.previous) },
        { reason: auditReason(interaction.member, reason) },
      );
      await clearChannelLock(guild.id, channel.id);
    } catch (error) {
      console.error(`[moderation] /unlock failed for ${channel.id}:`, error);
      await sendModerationError(
        interaction,
        'Could not restore that channel. Check my **Manage Channels** and **Manage Roles** permissions and try again.',
      );
      return;
    }

    await sendModerationLog(interaction.client, guild.id, {
      action: 'unlock',
      targetId: null,
      targetName: `#${channel.name}`,
      moderatorId: interaction.user.id,
      reason,
      extra: `Restored previous @everyone SendMessages setting: ${lock.previous}.`,
    });

    const embed = createEmbed(interaction.client, {
      section: 'Moderation',
      title: 'Channel unlocked',
      description: `${channel} has been restored.\n${restoredLabel(lock.previous)}`,
      color: COLORS.success,
      fields: [
        { name: '📁 Channel', value: `${channel}`, inline: true },
        { name: '🔓 Restored', value: lock.previous, inline: true },
        { name: '📝 Reason', value: reason, inline: false },
      ],
      footer: `Action by ${interaction.user.username}`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
