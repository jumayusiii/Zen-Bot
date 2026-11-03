const {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { sendModerationLog } = require('../../lib/moderationLogs');
const { getInteractionLanguage, t } = require('../../lib/i18n');
const {
  MAX_PURGE,
  deletePurgeable,
  selectPurgeable,
} = require('../../lib/moderationTools');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Delete recent messages from a channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription('How many recent messages to scan (1–100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(MAX_PURGE),
    )
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('Only delete messages from this member'),
    )
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('The channel to clean (defaults to this one)')
        .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the messages are being removed')
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
    const permission = t(language, 'moderation.permissions.manageMessages');

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({
        content: t(language, 'moderation.permission', { permission, command: 'purge' }),
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
    if (!memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({
        content: t(language, 'moderation.purge.memberPermission', { channel }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const botPermissions = channel.permissionsFor?.(guild.members.me);
    const requiredBotPermissions = [
      PermissionFlagsBits.ViewChannel,
      PermissionFlagsBits.ManageMessages,
      PermissionFlagsBits.ReadMessageHistory,
    ];
    if (!botPermissions?.has(requiredBotPermissions)) {
      await interaction.reply({
        content: t(language, 'moderation.purge.botPermission', {
          channel,
          permissions: [
            t(language, 'moderation.permissions.viewChannel'),
            t(language, 'moderation.permissions.manageMessages'),
            t(language, 'moderation.permissions.readMessageHistory'),
          ].join(', '),
        }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const amount = interaction.options.getInteger('amount', true);
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason')?.trim() || t(language, 'moderation.noReason');

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const fetched = await channel.messages.fetch({ limit: amount });
      const messages = selectPurgeable(fetched, { userId: user?.id ?? null });

      if (messages.length === 0) {
        await interaction.editReply({
          content: t(language, 'moderation.purge.noMatches'),
        });
        return;
      }

      const deleted = await deletePurgeable(channel, messages);

      await sendModerationLog(interaction.client, guild.id, {
        action: 'purge',
        targetId: user?.id ?? null,
        targetName: user?.username ?? `#${channel.name}`,
        moderatorId: interaction.user.id,
        reason,
        extra: t(
          language,
          deleted === 1 ? 'moderation.purge.extraOne' : 'moderation.purge.extraMany',
          { count: deleted, channel },
        ),
      });

      const embed = createEmbed(interaction.client, {
        section: t(language, 'moderation.section'),
        title: t(language, 'moderation.purge.title'),
        description: t(
          language,
          deleted === 1 ? 'moderation.purge.descriptionOne' : 'moderation.purge.descriptionMany',
          { count: deleted, channel },
        ),
        color: COLORS.neutral,
        fields: [
          { name: `📁 ${t(language, 'moderation.fields.channel')}`, value: `${channel}`, inline: true },
          {
            name: `🔎 ${t(language, 'moderation.fields.scanned')}`,
            value: t(language, 'moderation.purge.scanned', { count: amount }),
            inline: true,
          },
          {
            name: `👤 ${t(language, 'moderation.fields.filter')}`,
            value: user
              ? `${user.username}\n\`${user.id}\``
              : t(language, 'moderation.purge.allMembers'),
            inline: true,
          },
          { name: `📝 ${t(language, 'moderation.fields.reason')}`, value: reason, inline: false },
        ],
        footer: t(language, 'common.actionBy', { user: interaction.user.username }),
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[moderation] /purge failed:', error);
      await interaction.editReply({
        content: t(language, 'moderation.purge.failed'),
      });
    }
  },
};
