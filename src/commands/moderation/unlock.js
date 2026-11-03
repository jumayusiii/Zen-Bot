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
const { getInteractionLanguage, t } = require('../../lib/i18n');

const LOCKABLE_TYPES = new Set([ChannelType.GuildText, ChannelType.GuildAnnouncement]);
const BOT_PERMISSIONS = [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles];

function restoreValue(state) {
  if (state === 'allow') return true;
  if (state === 'deny') return false;
  return null;
}

function restoredLabel(state, language = 'en') {
  return t(language, `moderation.restored.${state}`, {}, 'The channel now inherits @everyone permissions again.');
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
        content: t('en', 'moderation.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const language = await getInteractionLanguage(interaction);
    const permission = t(language, 'moderation.permissions.manageChannels');

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        content: t(language, 'moderation.permission', { permission, command: 'unlock' }),
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

    const lock = await getChannelLock(guild.id, channel.id);
    if (!lock) {
      await interaction.reply({
        content: t(language, 'moderation.unlock.noLock', { channel }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const reason = interaction.options.getString('reason')?.trim() || t(language, 'moderation.noReason');

    try {
      await channel.permissionOverwrites.edit(
        guild.roles.everyone,
        { SendMessages: restoreValue(lock.previous) },
        { reason: auditReason(interaction.member, reason) },
      );
      await clearChannelLock(guild.id, channel.id);
    } catch (error) {
      console.error(`[moderation] /unlock failed for ${channel.id}:`, error);
      await sendModerationError(interaction, t(language, 'moderation.unlock.failed'));
      return;
    }

    await sendModerationLog(interaction.client, guild.id, {
      action: 'unlock',
      targetId: null,
      targetName: `#${channel.name}`,
      moderatorId: interaction.user.id,
      reason,
      extra: t(language, 'moderation.unlock.extra', { state: lock.previous }),
    });

    const embed = createEmbed(interaction.client, {
      section: t(language, 'moderation.section'),
      title: t(language, 'moderation.unlock.title'),
      description: t(language, 'moderation.unlock.description', {
        channel,
        state: restoredLabel(lock.previous, language),
      }),
      color: COLORS.success,
      fields: [
        { name: `📁 ${t(language, 'moderation.fields.channel')}`, value: `${channel}`, inline: true },
        {
          name: `🔓 ${t(language, 'moderation.fields.restored')}`,
          value: t(language, `moderation.states.${lock.previous}`, {}, lock.previous),
          inline: true,
        },
        { name: `📝 ${t(language, 'moderation.fields.reason')}`, value: reason, inline: false },
      ],
      footer: t(language, 'common.actionBy', { user: interaction.user.username }),
    });

    await interaction.reply({ embeds: [embed] });
  },
};
