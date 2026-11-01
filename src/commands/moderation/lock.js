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
  saveChannelLock,
} = require('../../lib/channelLocks');
const {
  auditReason,
  sendModerationError,
} = require('../../lib/moderation');
const { sendModerationLog } = require('../../lib/moderationLogs');

const LOCKABLE_TYPES = new Set([ChannelType.GuildText, ChannelType.GuildAnnouncement]);
const BOT_PERMISSIONS = [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles];

function sendMessagesState(overwrite) {
  if (!overwrite) return 'inherit';
  if (overwrite.deny?.has?.(PermissionFlagsBits.SendMessages)) return 'deny';
  if (overwrite.allow?.has?.(PermissionFlagsBits.SendMessages)) return 'allow';
  return 'inherit';
}

function stateLabel(state) {
  if (state === 'allow') return 'allowed';
  if (state === 'deny') return 'denied';
  return 'inherited';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel so members cannot send messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The text channel to lock (defaults to this one)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the channel is being locked')
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
        content: 'You need the **Manage Channels** permission to use `/lock`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!guild.members.me?.permissions.has(BOT_PERMISSIONS)) {
      await interaction.reply({
        content: 'I need **Manage Channels** and **Manage Roles** to lock channels.',
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

    const existing = await getChannelLock(guild.id, channel.id);
    if (existing) {
      await interaction.reply({
        content: `${channel} is already locked by Zen. Use \`/unlock\` to restore it.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const overwrite = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
    const previous = sendMessagesState(overwrite);

    if (previous === 'deny') {
      await interaction.reply({
        content: `${channel} already blocks **@everyone** from sending messages. No change was made.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const reason = interaction.options.getString('reason')?.trim() || 'No reason provided';

    try {
      await saveChannelLock({
        guildId: guild.id,
        channelId: channel.id,
        previous,
        moderatorId: interaction.user.id,
        reason,
      });

      await channel.permissionOverwrites.edit(
        guild.roles.everyone,
        { SendMessages: false },
        { reason: auditReason(interaction.member, reason) },
      );
    } catch (error) {
      await clearChannelLock(guild.id, channel.id).catch(() => {});
      console.error(`[moderation] /lock failed for ${channel.id}:`, error);
      await sendModerationError(
        interaction,
        'Could not lock that channel. Check my **Manage Channels** and **Manage Roles** permissions and try again.',
      );
      return;
    }

    await sendModerationLog(interaction.client, guild.id, {
      action: 'lock',
      targetId: null,
      targetName: `#${channel.name}`,
      moderatorId: interaction.user.id,
      reason,
      extra: `Previous @everyone SendMessages setting: ${stateLabel(previous)}.`,
    });

    const embed = createEmbed(interaction.client, {
      section: 'Moderation',
      title: 'Channel locked',
      description: `**${channel}** is now read-only for members.\nUse \`/unlock\` to restore the previous permission.`,
      color: COLORS.warning,
      fields: [
        { name: '📁 Channel', value: `${channel}`, inline: true },
        { name: '🔒 Previous', value: stateLabel(previous), inline: true },
        { name: '📝 Reason', value: reason, inline: false },
      ],
      footer: `Action by ${interaction.user.username}`,
    });

    await interaction.reply({ embeds: [embed] });
  },
};
