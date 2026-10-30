const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('./embeds');
const { SOCIAL_ACTIONS, socialLine } = require('./social');

/**
 * Builds a consistent /hug, /pat or /highfive command.
 *
 * @param {'hug'|'pat'|'highfive'} actionId
 * @returns {object}
 */
function createSocialCommand(actionId) {
  const action = SOCIAL_ACTIONS[actionId];
  if (!action) throw new Error(`Unknown social action: ${actionId}`);

  return {
    data: new SlashCommandBuilder()
      .setName(action.id)
      .setDescription(action.description)
      .addUserOption((option) =>
        option
          .setName('user')
          .setDescription(`The member to ${action.verb}`)
          .setRequired(true),
      ),

    async execute(interaction) {
      const targetUser = interaction.options.getUser('user', true);

      if (targetUser.id === interaction.user.id) {
        await interaction.reply({
          content: `You cannot ${action.verb} yourself — find a friend and share the vibe.`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const targetMember = interaction.options.getMember('user');
      const targetName =
        targetMember?.displayName ??
        targetUser.globalName ??
        targetUser.displayName ??
        targetUser.username;

      const embed = createEmbed(interaction.client, {
        section: 'Social',
        title: `${action.emoji} ${action.title}`,
        description: socialLine(action.id, interaction.user.username, targetName),
        color: COLORS.fun,
        thumbnail: targetUser.displayAvatarURL({
          extension: 'png',
          size: 256,
          forceStatic: true,
        }),
        fields: [
          { name: '🙋 From', value: interaction.user.username, inline: true },
          { name: '🎯 To', value: targetName, inline: true },
          { name: '✨ Mood', value: action.mood, inline: true },
        ],
        footer: `${action.footer}  ·  requested by ${interaction.user.username}`,
      });

      await interaction.reply({
        embeds: [embed],
        allowedMentions: { users: [targetUser.id] },
      });
    },
  };
}

module.exports = { createSocialCommand };
