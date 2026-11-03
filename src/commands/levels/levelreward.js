const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  clearLevelReward,
  getLevelReward,
  setLevelReward,
} = require('../../lib/levelRewards');
const { getInteractionLanguage, t } = require('../../lib/i18n');

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
      await errorReply(interaction, t('en', 'common.guildOnly'));
      return;
    }

    const language = await getInteractionLanguage(interaction);

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      await errorReply(interaction, t(language, 'levels.reward.errors.permission'));
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
        await errorReply(interaction, t(language, 'levels.reward.errors.update'));
        return;
      }

      const embed = createEmbed(interaction.client, {
        section: t(language, 'help.tabs.levels'),
        title: t(language, 'levels.reward.removedTitle'),
        description: removed
          ? t(language, 'levels.reward.removedDescription', { level: removed.level })
          : t(language, 'levels.reward.noneRemoved'),
        color: COLORS.neutral,
        footer: t(language, 'common.actionBy', { user: interaction.user.username }),
      });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (role && level) {
      if (role.id === guild.id) {
        await errorReply(interaction, t(language, 'levels.reward.errors.everyone'));
        return;
      }

      if (role.managed) {
        await errorReply(interaction, t(language, 'levels.reward.errors.managed'));
        return;
      }

      const me = guild.members.me;
      if (!me?.permissions.has(PermissionFlagsBits.ManageRoles)) {
        await errorReply(interaction, t(language, 'levels.reward.errors.manageRoles'));
        return;
      }

      if (role.position >= me.roles.highest.position) {
        await errorReply(
          interaction,
          t(language, 'levels.reward.errors.roleOrder', { role: role.name }),
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
        await errorReply(interaction, t(language, 'levels.reward.errors.save'));
        return;
      }

      const embed = createEmbed(interaction.client, {
        section: t(language, 'help.tabs.levels'),
        title: t(language, 'levels.reward.savedTitle'),
        description: t(language, 'levels.reward.savedDescription', {
          role: role.name,
          level,
        }),
        color: COLORS.success,
        fields: [
          { name: `🏅 ${t(language, 'levels.reward.fields.role')}`, value: role.toString(), inline: true },
          { name: `⭐ ${t(language, 'levels.reward.fields.level')}`, value: String(level), inline: true },
          {
            name: `🔄 ${t(language, 'levels.reward.fields.applied')}`,
            value: t(language, 'levels.reward.appliedValue'),
            inline: true,
          },
        ],
        footer: t(language, 'common.actionBy', { user: interaction.user.username }),
      });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      return;
    }

    if (role || level) {
      await errorReply(interaction, t(language, 'levels.reward.errors.both'));
      return;
    }

    const reward = await getLevelReward(guild.id);
    const embed = createEmbed(interaction.client, {
      section: t(language, 'help.tabs.levels'),
      title: t(language, 'levels.reward.title'),
      description: reward
        ? t(language, 'levels.reward.currentDescription', {
          roleId: reward.roleId,
          level: reward.level,
        })
        : t(language, 'levels.reward.noRewardDescription'),
      color: reward ? COLORS.brand : COLORS.neutral,
      fields: reward
        ? [
            {
              name: `🏅 ${t(language, 'levels.reward.fields.role')}`,
              value: `<@&${reward.roleId}>`,
              inline: true,
            },
            {
              name: `⭐ ${t(language, 'levels.reward.fields.level')}`,
              value: String(reward.level),
              inline: true,
            },
          ]
        : [],
      footer: reward
        ? t(language, 'levels.reward.currentFooter')
        : t(language, 'levels.reward.manageFooter'),
    });

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
