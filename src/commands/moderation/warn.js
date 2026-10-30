const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { sendModerationError, targetModerationError } = require('../../lib/moderation');
const { sendModerationLog } = require('../../lib/moderationLogs');
const {
  MAX_REASON_LENGTH,
  addWarning,
  countWarnings,
} = require('../../lib/warnings');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Record a warning for a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName('member')
        .setDescription('The member to warn')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the member is being warned')
        .setRequired(true)
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

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({
        content: 'You need the **Moderate Members** permission to use `/warn`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const user = interaction.options.getUser('member', true);
    const member = await guild.members.fetch(user.id).catch(() => null);
    const targetError = targetModerationError({
      guild,
      member,
      moderator: interaction.member,
    });

    if (targetError) {
      await sendModerationError(interaction, targetError);
      return;
    }

    const reason = interaction.options.getString('reason', true).trim();
    const moderatorName = interaction.member?.displayName ?? interaction.user.username;

    try {
      await addWarning({
        guildId: guild.id,
        userId: user.id,
        username: user.username,
        moderatorId: interaction.user.id,
        moderatorName,
        reason,
      });
    } catch (error) {
      console.error(`[moderation] /warn failed for ${user.id}:`, error);
      await sendModerationError(interaction, 'Could not save that warning. Please try again.');
      return;
    }

    const total = await countWarnings(guild.id, user.id);
    const targetName = member?.displayName ?? user.globalName ?? user.username;

    await sendModerationLog(interaction.client, guild.id, {
      action: 'warn',
      targetId: user.id,
      targetName: user.username,
      moderatorId: interaction.user.id,
      reason,
      extra: `Warning #${total} for this member.`,
    });

    if (typeof user.send === 'function') {
      await user.send({
        embeds: [
          createEmbed(interaction.client, {
            section: 'Moderation',
            title: 'You received a warning',
            description: `A moderator warned you in **${guild.name}**.`,
            color: COLORS.warning,
            fields: [
              { name: '📝 Reason', value: reason, inline: false },
              { name: '🔢 Total warnings', value: `**${total}**`, inline: true },
              { name: '🛡️ Server', value: guild.name, inline: true },
            ],
            footer: 'Please review the server rules',
          }),
        ],
        allowedMentions: { parse: [] },
      }).catch(() => {});
    }

    const embed = createEmbed(interaction.client, {
      section: 'Moderation',
      title: 'Warning recorded',
      description: `**${targetName}** now has **${total}** warning${total === 1 ? '' : 's'} in this server.`,
      color: COLORS.warning,
      thumbnail: user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }),
      fields: [
        { name: '🎯 Member', value: `${targetName}\n\`${user.id}\``, inline: true },
        { name: '🔢 Total', value: `**${total}**`, inline: true },
        { name: '📝 Reason', value: reason, inline: false },
      ],
      footer: `Action by ${interaction.user.username}`,
    });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
