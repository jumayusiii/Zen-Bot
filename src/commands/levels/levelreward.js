const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  clearLevelReward,
  getLevelReward,
  setLevelReward,
} = require('../../lib/levelRewards');

function errorReply(interaction, content) {
  return interaction.reply({ content, flags: MessageFlags.Ephemeral });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levelreward')
    .setDescription('Set a role reward for reaching a level')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addRoleOption((option) =>
      option
        .setName('role')
        .setDescription('The role to award'),
    )
    .addIntegerOption((option) =>
      option
        .setName('level')
        .setDescription('The level required to earn the role')
        .setMinValue(1)
        .setMaxValue(500),
    )
    .addBooleanOption((option) =>
      option
        .setName('clear')
        .setDescription('Remove the current reward configuration'),
    ),

  async execute(interaction) {
    const guild = interaction.guild;

    if (!guild) {
      await errorReply(interaction, 'This command only works in a server.');
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await errorReply(interaction, 'You need the **Manage Server** permission to configure level rewards.');
      return;
    }

    const role = interaction.options.getRole('role');
    const level = interaction.options.getInteger('level');
    const clear = interaction.options.getBoolean('clear') ?? false;

    if (clear) {
      const removed = await clearLevelReward(guild.id).catch((error) => {
        console.error('[levelRewards] Could not clear the reward:', error);
        return undefined;
      });

      if (removed === undefined) {
        await errorReply(interaction, 'I could not update the level reward. Try again.');
        return;
      }

      const embed = createEmbed(interaction.client, {
        section: 'Levels',
        title: 'Level reward removed',
        description: removed
          ? `The **${removed.level}**-level role reward is no longer active. Existing roles were not removed from members.`
          : 'No level reward was configured for this server.',
        color: COLORS.neutral,
        footer: `Action by ${interaction.user.username}`,
      });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (role && level) {
      if (role.id === guild.id) {
        await errorReply(interaction, 'The **@everyone** role cannot be used as a reward.');
        return;
      }

      if (role.managed) {
        await errorReply(interaction, 'That role is managed by an integration and cannot be assigned as a reward.');
        return;
      }

      const me = guild.members.me;
      if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
        await errorReply(interaction, 'I need the **Manage Roles** permission to assign reward roles.');
        return;
      }

      if (role.position >= me.roles.highest.position) {
        await errorReply(
          interaction,
          `I cannot assign **${role.name}** because it is above my highest role. Move my role above it and try again.`,
        );
        return;
      }

      try {
        await setLevelReward({
          guildId: guild.id,
          roleId: role.id,
          level,
        });
      } catch (error) {
        console.error('[levelRewards] Could not save the reward:', error);
        await errorReply(interaction, 'I could not save that level reward. Try again.');
        return;
      }

      const embed = createEmbed(interaction.client, {
        section: 'Levels',
        title: 'Level reward saved',
        description: `Members will earn **${role.name}** when they reach **level ${level}**.`,
        color: COLORS.success,
        fields: [
          { name: '🏅 Role', value: role.toString(), inline: true },
          { name: '⭐ Level', value: String(level), inline: true },
          { name: '🔄 Applied', value: 'On the next level-up', inline: true },
        ],
        footer: `Action by ${interaction.user.username}`,
      });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (role || level) {
      await errorReply(interaction, 'Provide both **role** and **level** to set a reward, or use **clear** to remove it.');
      return;
    }

    const reward = await getLevelReward(guild.id);
    const embed = createEmbed(interaction.client, {
      section: 'Levels',
      title: 'Level reward',
      description: reward
        ? `Members earn <@&${reward.roleId}> when they reach **level ${reward.level}**.`
        : 'No reward role is configured for this server. Set one with `/levelreward role:@Role level:5`.',
      color: reward ? COLORS.brand : COLORS.neutral,
      fields: reward
        ? [
            { name: '🏅 Role', value: `<@&${reward.roleId}>`, inline: true },
            { name: '⭐ Level', value: String(reward.level), inline: true },
          ]
        : [],
      footer: reward
        ? 'Use /levelreward clear to remove it'
        : 'Manage Server permission required',
    });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
