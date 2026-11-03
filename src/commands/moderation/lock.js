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
const { getInteractionLanguage, t } = require('../../lib/i18n');

const LOCKABLE_TYPES = new Set([ChannelType.GuildText, ChannelType.GuildAnnouncement]);
const BOT_PERMISSIONS = [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles];

function sendMessagesState(overwrite) {
  if (!overwrite) return 'inherit';
  if (overwrite.deny?.has?.(PermissionFlagsBits.SendMessages)) return 'deny';
  if (overwrite.allow?.has?.(PermissionFlagsBits.SendMessages)) return 'allow';
  return 'inherit';
}

function stateLabel(state, language = 'en') {
  return t(language, `moderation.states.${state}`, {}, 'inherited');
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
        content: t('en', 'moderation.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const language = await getInteractionLanguage(interaction);
    const permission = t(language, 'moderation.permissions.manageChannels');

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: t(language, 'moderation.permission', { permission, command: 'lock' }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!guild.members.me?.permissions.has(BOT_PERMISSIONS)) {
      await interaction.reply({
        content: t(language, 'moderation.botPermissions', {
          permissions: [
            t(language, 'moderation.permissions.manageChannels'),
            t(language, 'moderation.permissions.manageRoles'),
          ].join(' + '),
        }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    if (!channel || !LOCKABLE_TYPES.has(channel.type) || channel.guildId !== guild.id) {
      await interaction.reply({
        content: t(language, 'moderation.channelOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const existing = await getChannelLock(guild.id, channel.id);
    if (existing) {
      await interaction.reply({
        content: t(language, 'moderation.lock.exists', { channel }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const overwrite = channel.permissionOverwrites.cache.get(guild.roles.everyone.id);
    const previous = sendMessagesState(overwrite);

    if (previous === 'deny') {
      await interaction.reply({
        content: t(language, 'moderation.lock.alreadyDenied', { channel }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const reason = interaction.options.getString('reason')?.trim() || t(language, 'moderation.noReason');

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
      await sendModerationError(interaction, t(language, 'moderation.lock.failed'));
      return;
    }

    await sendModerationLog(interaction.client, guild.id, {
      action: 'lock',
      targetId: null,
      targetName: `#${channel.name}`,
      moderatorId: interaction.user.id,
      reason,
      extra: t(language, 'moderation.lock.extra', {
        state: stateLabel(previous, language),
      }),
    });

    const embed = createEmbed(interaction.client, {
      section: t(language, 'moderation.section'),
      title: t(language, 'moderation.lock.title'),
      description: t(language, 'moderation.lock.description', { channel }),
      color: COLORS.warning,
      fields: [
        { name: `📁 ${t(language, 'moderation.fields.channel')}`, value: `${channel}`, inline: true },
        {
          name: `🔒 ${t(language, 'moderation.fields.previous')}`,
          value: stateLabel(previous, language),
          inline: true,
        },
        { name: `📝 ${t(language, 'moderation.fields.reason')}`, value: reason, inline: false },
      ],
      footer: t(language, 'common.actionBy', { user: interaction.user.username }),
    });

    await interaction.reply({ embeds: [embed] });
  },
};
