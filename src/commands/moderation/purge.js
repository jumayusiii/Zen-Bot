const {
  ChannelType,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { sendModerationLog } = require('../../lib/moderationLogs');
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
        content: 'This command only works in a server.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({
        content: 'You need the **Manage Messages** permission to use `/purge`.',
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
    if (!memberPermissions?.has(PermissionFlagsBits.ManageMessages)) {
      await interaction.reply({
        content: `You need **Manage Messages** in ${channel} to purge messages there.`,
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
        content: `I need **View Channel**, **Manage Messages** and **Read Message History** in ${channel}.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const amount = interaction.options.getInteger('amount', true);
    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason')?.trim() || 'No reason provided';

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const fetched = await channel.messages.fetch({ limit: amount });
      const messages = selectPurgeable(fetched, { userId: user?.id ?? null });

      if (messages.length === 0) {
        await interaction.editReply({
          content: 'No messages from the last 14 days matched those filters.',
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
        extra: `Deleted ${deleted} message${deleted === 1 ? '' : 's'} in ${channel}.`,
      });

      const embed = createEmbed(interaction.client, {
        section: 'Moderation',
        title: 'Messages purged',
        description: `Deleted **${deleted}** message${deleted === 1 ? '' : 's'} from ${channel}.`,
        color: COLORS.neutral,
        fields: [
          { name: '📁 Channel', value: `${channel}`, inline: true },
          { name: '🔎 Scanned', value: `**${amount}** recent messages`, inline: true },
          {
            name: '👤 Filter',
            value: user ? `${user.username}\n\`${user.id}\`` : 'All members',
            inline: true,
          },
          { name: '📝 Reason', value: reason, inline: false },
        ],
        footer: `Action by ${interaction.user.username}`,
      });

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error('[moderation] /purge failed:', error);
      await interaction.editReply({
        content: 'Could not delete those messages. Check my permissions and try again.',
      });
    }
  },
};
