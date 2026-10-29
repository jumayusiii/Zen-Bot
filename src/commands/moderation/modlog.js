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

const REQUIRED_CHANNEL_PERMISSIONS = [
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
];

async function statusEmbed(client, guild, requestedBy) {
  const channelId = await getModLogChannelId(guild.id);
  const channel = channelId ? guild.channels.cache.get(channelId) : null;

  return createEmbed(client, {
    section: 'Moderation',
    title: 'Audit log settings',
    description: channelId
      ? 'Every moderation action is posted to the configured channel.'
      : 'No audit log channel is configured yet. Choose one with `/modlog channel:#channel`.',
    color: channelId ? COLORS.success : COLORS.neutral,
    fields: [
      {
        name: '📁 Channel',
        value: channelId ? `<#${channelId}>` : 'Not configured',
        inline: true,
      },
      {
        name: '🛡️ Status',
        value: channelId ? (channel ? 'Enabled' : '⚠️ Channel missing') : 'Disabled',
        inline: true,
      },
      {
        name: '🧭 Configure',
        value: channelId ? '`/modlog channel:#channel` to change\n`/modlog disable:true` to turn off' : '`/modlog channel:#channel`',
        inline: true,
      },
    ],
    footer: `Requested by ${requestedBy}`,
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
        content: 'This command only works in a server.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await interaction.reply({
        content: 'You need the **Manage Server** permission to use `/modlog`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const channel = interaction.options.getChannel('channel');
    const disable = interaction.options.getBoolean('disable') ?? false;

    if (channel && disable) {
      await interaction.reply({
        content: 'Choose either a channel or `disable:true`, not both.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!channel && !disable) {
      await interaction.reply({
        embeds: [await statusEmbed(interaction.client, guild, interaction.user.username)],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (disable) {
      await clearModLogChannel(guild.id);
      await interaction.reply({
        embeds: [
          createEmbed(interaction.client, {
            section: 'Moderation',
            title: 'Audit log disabled',
            description: 'New moderation actions will not be posted to a log channel.',
            color: COLORS.neutral,
            footer: `Changed by ${interaction.user.username}`,
          }),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!channel.isTextBased?.() || channel.guildId !== guild.id) {
      await interaction.reply({
        content: 'Choose a text channel from this server.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const permissions = channel.permissionsFor(guild.members.me);
    if (!permissions?.has(REQUIRED_CHANNEL_PERMISSIONS)) {
      await interaction.reply({
        content: `I need **View Channel**, **Send Messages** and **Embed Links** in ${channel} to post audit logs.`,
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
        content: `I could not post in ${channel}. Check my permissions and try again.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.reply({
      embeds: [
        createEmbed(interaction.client, {
          section: 'Moderation',
          title: 'Audit log connected',
          description: `Moderation actions will be posted in ${channel}.`,
          color: COLORS.success,
          fields: [
            { name: '📁 Channel', value: `${channel}`, inline: true },
            { name: '🛡️ Status', value: 'Enabled', inline: true },
            { name: '🔔 Coverage', value: 'Mutes · Unmutes · Kicks · Bans · Unbans', inline: false },
          ],
          footer: `Configured by ${interaction.user.username}`,
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};
