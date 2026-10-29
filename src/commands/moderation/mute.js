const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  MUTE_DURATIONS,
  auditReason,
  durationByValue,
  moderationErrorMessage,
  sendModerationError,
  targetModerationError,
} = require('../../lib/moderation');

function durationChoices() {
  return MUTE_DURATIONS.map(({ label, value }) => ({ name: label, value }));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Time out a member so they cannot send messages or join voice')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName('member')
        .setDescription('The member to mute')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('duration')
        .setDescription('How long the timeout should last')
        .setRequired(true)
        .addChoices(...durationChoices()),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the member is being muted')
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

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({
        content: 'You need the **Moderate Members** permission to use `/mute`.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!guild.members.me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
      await interaction.reply({
        content: 'I need the **Moderate Members** permission to mute members.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const user = interaction.options.getUser('member', true);
    const duration = durationByValue(
      MUTE_DURATIONS,
      interaction.options.getString('duration', true),
    );

    if (!duration) {
      await sendModerationError(interaction, 'Choose one of the available mute durations.');
      return;
    }

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

    if (member.isCommunicationDisabled?.()) {
      const until = member.communicationDisabledUntilTimestamp;
      const suffix = Number.isFinite(until)
        ? ` until <t:${Math.floor(until / 1000)}:R>`
        : '';
      await sendModerationError(
        interaction,
        `**${member.displayName}** is already muted${suffix}. Use \`/unmute\` first.`,
      );
      return;
    }

    const reason = interaction.options.getString('reason')?.trim() || 'No reason provided';
    const expiresAt = Date.now() + duration.ms;

    await interaction.deferReply();

    try {
      await member.timeout(duration.ms, auditReason(interaction.member, reason));
    } catch (error) {
      console.error(`[moderation] /mute failed for ${user.id}:`, error);
      await sendModerationError(interaction, moderationErrorMessage(error));
      return;
    }

    const unix = Math.floor(expiresAt / 1000);
    const embed = createEmbed(interaction.client, {
      section: 'Moderation',
      title: 'Member muted',
      description: `**${member.displayName}** cannot send messages, react or join voice channels until the timeout ends.`,
      color: COLORS.warning,
      fields: [
        { name: '⏳ Duration', value: duration.label, inline: true },
        { name: '🔇 Expires', value: `<t:${unix}:F> (<t:${unix}:R>)`, inline: true },
        { name: '🆔 Member', value: `\`${user.id}\``, inline: true },
        { name: '📝 Reason', value: reason, inline: false },
      ],
      footer: `Action by ${interaction.user.username}`,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
