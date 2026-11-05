const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { adjustXp } = require('../../lib/levels');
const { sendModerationLog } = require('../../lib/moderationLogs');
const { getInteractionLanguage, t } = require('../../lib/i18n');

const MAX_ADJUST = 1_000_000;
const ACTIONS = ['add', 'remove', 'set', 'reset'];

function formatNumber(value, language = 'en') {
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString(locale);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leveladmin')
    .setDescription("Add, remove, set or reset a member's chat XP (admins only)")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) =>
      option
        .setName('member')
        .setDescription('The member whose XP should change')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('action')
        .setDescription('What to do with the XP')
        .setRequired(true)
        .addChoices(
          { name: 'Add XP', value: 'add' },
          { name: 'Remove XP', value: 'remove' },
          { name: 'Set XP', value: 'set' },
          { name: 'Reset to zero', value: 'reset' },
        ),
    )
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription(`XP to add, remove or set (0–${MAX_ADJUST})`)
        .setMinValue(0)
        .setMaxValue(MAX_ADJUST),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the XP is being changed')
        .setMaxLength(400),
    ),

  async execute(interaction) {
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: t('en', 'common.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const language = await getInteractionLanguage(interaction);
    const isOwner = interaction.user.id === guild.ownerId;
    const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

    if (!isOwner && !isAdmin) {
      await interaction.reply({
        content: t(language, 'moderation.permission', {
          permission: t(language, 'moderation.permissions.administrator'),
          command: 'leveladmin',
        }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const user = interaction.options.getUser('member', true);
    if (user.bot) {
      await interaction.reply({
        content: t(language, 'levels.admin.bot'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const action = interaction.options.getString('action', true);
    if (!ACTIONS.includes(action)) {
      await interaction.reply({
        content: t(language, 'levels.admin.invalid'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const amount = action === 'reset'
      ? 0
      : interaction.options.getInteger('amount');

    if (action !== 'reset' && amount === null) {
      await interaction.reply({
        content: t(language, 'levels.admin.invalid'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const reason = interaction.options.getString('reason')?.trim()
      || t(language, 'moderation.noReason');
    const targetName = user.globalName ?? user.username;

    try {
      const result = await adjustXp({
        guildId: guild.id,
        userId: user.id,
        username: user.username,
        action,
        amount,
      });

      if (result.applied === 0 && action !== 'reset') {
        await interaction.reply({
          content: t(language, 'levels.admin.unchanged', { target: targetName }),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await sendModerationLog(interaction.client, guild.id, {
        action: 'leveladmin',
        targetId: user.id,
        targetName: user.username,
        moderatorId: interaction.user.id,
        reason,
        extra: t(language, 'levels.admin.extra', {
          action: t(language, `levels.admin.actions.${action}`).toLowerCase(),
          amount: formatNumber(Math.abs(result.applied), language),
          before: formatNumber(result.beforeXp, language),
          after: formatNumber(result.afterXp, language),
        }),
      });

      const embed = createEmbed(interaction.client, {
        section: t(language, 'help.tabs.levels'),
        title: t(language, 'levels.admin.title'),
        description: t(language, 'levels.admin.description', {
          target: targetName,
          xp: formatNumber(result.afterXp, language),
          level: result.after.level,
        }),
        color: COLORS.success,
        thumbnail: user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }),
        fields: [
          {
            name: `🎯 ${t(language, 'levels.admin.fields.member')}`,
            value: `${targetName}\n\`${user.id}\``,
            inline: true,
          },
          {
            name: `📈 ${t(language, 'levels.admin.fields.action')}`,
            value: t(language, `levels.admin.actions.${action}`),
            inline: true,
          },
          {
            name: `↩️ ${t(language, 'levels.admin.fields.before')}`,
            value: `**${formatNumber(result.beforeXp, language)}** XP · ${t(language, 'levels.rank.level')} **${result.before.level}**`,
            inline: true,
          },
          {
            name: `↪️ ${t(language, 'levels.admin.fields.after')}`,
            value: `**${formatNumber(result.afterXp, language)}** XP · ${t(language, 'levels.rank.level')} **${result.after.level}**`,
            inline: true,
          },
          { name: `📝 ${t(language, 'moderation.fields.reason')}`, value: reason, inline: false },
        ],
        footer: t(language, 'levels.admin.footer', { user: interaction.user.username }),
      });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error('[levels] /leveladmin failed:', error);
      await interaction.reply({
        content: t(language, 'levels.admin.error'),
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
