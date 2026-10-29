const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  auditReason,
  cancelScheduledUnban,
  isSnowflake,
  moderationErrorMessage,
  sendModerationError,
} = require('../../lib/moderation');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Lift a ban and cancel its scheduled auto-unban')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((option) =>
      option
        .setName('user_id')
        .setDescription('The ID of the banned user')
        .setRequired(true)
        .setMinLength(15)
        .setMaxLength(20),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the ban is being lifted')
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

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.BanMembers)) {
      await interaction.reply({
        content: 'You need the **Ban Members** permission to use `/unban`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!guild.members.me?.permissions.has(PermissionFlagsBits.BanMembers)) {
      await interaction.reply({
        content: 'I need the **Ban Members** permission to lift bans.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const userId = interaction.options.getString('user_id', true).trim();

    if (!isSnowflake(userId)) {
      await sendModerationError(
        interaction,
        'That does not look like a Discord user ID. Enable **Developer Mode**, right-click the user and choose **Copy User ID**.',
      );
      return;
    }

    let existing;

    try {
      existing = await guild.bans.fetch(userId);
    } catch (error) {
      if (Number(error?.code) !== 10026) {
        console.error(`[moderation] /unban lookup failed for ${userId}:`, error);
        await sendModerationError(interaction, moderationErrorMessage(error));
        return;
      }
      existing = null;
    }

    if (!existing) {
      await sendModerationError(
        interaction,
        `\`${userId}\` is not currently banned from this server.`,
      );
      return;
    }

    const reason = interaction.options.getString('reason')?.trim() || 'No reason provided';
    await interaction.deferReply();

    try {
      await guild.bans.remove(userId, auditReason(interaction.member, reason));
    } catch (error) {
      console.error(`[moderation] /unban failed for ${userId}:`, error);
      await sendModerationError(interaction, moderationErrorMessage(error));
      return;
    }

    await cancelScheduledUnban(guild.id, userId).catch((error) => {
      console.error(`[moderation] Could not clear the scheduled unban for ${userId}:`, error);
    });

    const username = existing.user?.username ?? userId;
    const embed = createEmbed(interaction.client, {
      section: 'Moderation',
      title: 'User unbanned',
      description: `**${username}** can join **${guild.name}** again.`,
      color: COLORS.success,
      fields: [
        { name: '🆔 User', value: `\`${userId}\``, inline: true },
        { name: '📝 Reason', value: reason, inline: false },
      ],
      footer: `Action by ${interaction.user.username}`,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
