const {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  clearModLogChannel,
  getModLogChannelId,
  sendModerationLog,
  setModLogChannel,
} = require('../../lib/moderationLogs');
const { getInteractionLanguage, t } = require('../../lib/i18n');

const REQUIRED_CHANNEL_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
];

async function statusEmbed(client, guild, requestedBy, language) {
  const channelId = await getModLogChannelId(guild.id);
  const channel = channelId ? guild.channels.cache.get(channelId) : null;

  return createEmbed(client, {
    section: t(language, 'moderation.section'),
    title: t(language, 'moderation.modlog.statusTitle'),
    description: channelId
      ? t(language, 'moderation.modlog.statusDescriptionEnabled')
      : t(language, 'moderation.modlog.statusDescriptionEmpty'),
    color: channelId ? COLORS.success : COLORS.neutral,
    fields: [
      {
        name: `📁 ${t(language, 'moderation.fields.channel')}`,
        value: channelId ? `<#${channelId}>` : t(language, 'moderation.modlog.notConfigured'),
        inline: true,
      },
      {
        name: `🛡️ ${t(language, 'moderation.fields.status')}`,
        value: channelId
          ? channel
            ? t(language, 'moderation.modlog.enabled')
            : t(language, 'moderation.modlog.channelMissing')
          : t(language, 'moderation.modlog.disabled'),
        inline: true,
      },
      {
        name: `🧭 ${t(language, 'moderation.fields.configure')}`,
        value: channelId
          ? t(language, 'moderation.modlog.configureValue')
          : t(language, 'moderation.modlog.configureValueEmpty'),
        inline: true,
      },
    ],
    footer: t(language, 'common.requestedBy', { user: requestedBy }),
  });
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('modlog')
    .setDescription('Choose the channel where moderation actions are recorded')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The text channel that should receive moderation logs')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .addBooleanOption((option) =>
      option
        .setName('disable')
        .setDescription('Turn the moderation audit log off'),
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
        content: t(language, 'moderation.permission', { permission, command: 'modlog' }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const channel = interaction.options.getChannel('channel');
    const disable = interaction.options.getBoolean('disable') ?? false;

    if (channel && disable) {
      await interaction.reply({
        content: t(language, 'moderation.modlog.chooseBoth'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!channel && !disable) {
      await interaction.reply({
        embeds: [
          await statusEmbed(interaction.client, guild, interaction.user.username, language),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (disable) {
      await clearModLogChannel(guild.id);
      await interaction.reply({
        embeds: [
          createEmbed(interaction.client, {
            section: t(language, 'moderation.section'),
            title: t(language, 'moderation.modlog.disabledTitle'),
            description: t(language, 'moderation.modlog.disabledDescription'),
            color: COLORS.neutral,
            footer: t(language, 'moderation.modlog.changedBy', {
              user: interaction.user.username,
            }),
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!channel.isTextBased?.() || channel.guildId !== guild.id) {
      await interaction.reply({
        content: t(language, 'moderation.channelOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const permissions = channel.permissionsFor(guild.members.me);
    if (!permissions?.has(REQUIRED_CHANNEL_PERMISSIONS)) {
      await interaction.reply({
        content: t(language, 'moderation.modlog.channelPermission', { channel }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await setModLogChannel(guild.id, channel.id, interaction.user.id);
    const test = await sendModerationLog(interaction.client, guild.id, {
      action: 'config',
      channelId: channel.id,
      moderatorId: interaction.user.id,
    });

    if (!test.sent) {
      await clearModLogChannel(guild.id);
      await interaction.reply({
        content: t(language, 'moderation.modlog.postFailed', { channel }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      embeds: [
        createEmbed(interaction.client, {
          section: t(language, 'moderation.section'),
          title: t(language, 'moderation.modlog.connectedTitle'),
          description: t(language, 'moderation.modlog.connectedDescription', { channel }),
          color: COLORS.success,
          fields: [
            {
              name: `📁 ${t(language, 'moderation.fields.channel')}`,
              value: `${channel}`,
              inline: true,
            },
            {
              name: `🛡️ ${t(language, 'moderation.fields.status')}`,
              value: t(language, 'moderation.modlog.enabled'),
              inline: true,
            },
            {
              name: `🔔 ${t(language, 'moderation.fields.coverage')}`,
              value: t(language, 'moderation.modlog.coverage'),
              inline: false,
            },
          ],
          footer: t(language, 'moderation.modlog.configuredBy', {
            user: interaction.user.username,
          }),
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};
