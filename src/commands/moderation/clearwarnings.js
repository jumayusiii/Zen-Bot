const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { sendModerationLog } = require('../../lib/moderationLogs');
const { MAX_REASON_LENGTH, clearWarnings } = require('../../lib/warnings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('clearwarnings')
    .setDescription("Clear a member's recorded warnings")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((option) =>
      option
        .setName('member')
        .setDescription('The member whose warnings should be cleared')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the warnings are being cleared')
        .setMaxLength(MAX_REASON_LENGTH),
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
        content: 'You need the **Manage Server** permission to use `/clearwarnings`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const user = interaction.options.getUser('member', true);
    const reason = interaction.options.getString('reason')?.trim() || 'No reason provided';
    const targetName = user.globalName ?? user.username;
    const { removed } = await clearWarnings(guild.id, user.id);

    if (removed.length === 0) {
      await interaction.reply({
        content: `**${targetName}** has no recorded warnings to clear.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await sendModerationLog(interaction.client, guild.id, {
      action: 'clearwarnings',
      targetId: user.id,
      targetName: user.username,
      moderatorId: interaction.user.id,
      reason,
      extra: `${removed.length} warning${removed.length === 1 ? '' : 's'} cleared.`,
    });

    const embed = createEmbed(interaction.client, {
      section: 'Moderation',
      title: 'Warnings cleared',
      description: `Removed **${removed.length}** warning${removed.length === 1 ? '' : 's'} from **${targetName}**.`,
      color: COLORS.success,
      thumbnail: user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }),
      fields: [
        { name: '🎯 Member', value: `${targetName}\n\`${user.id}\``, inline: true },
        { name: '🧹 Cleared', value: `**${removed.length}**`, inline: true },
        { name: '📝 Reason', value: reason, inline: false },
      ],
      footer: `Action by ${interaction.user.username}`,
    });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
