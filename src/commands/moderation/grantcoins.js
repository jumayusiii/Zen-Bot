const { MessageFlags, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { MAX_GRANT, grantCoins } = require('../../lib/economy');
const { sendModerationLog } = require('../../lib/moderationLogs');
const { getInteractionLanguage, t } = require('../../lib/i18n');

function coins(value, language = 'en') {
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString(locale);
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('grantcoins')
    .setDescription('Grant coins to a member from the server economy (admins only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((option) =>
      option
        .setName('member')
        .setDescription('The member who should receive the coins')
        .setRequired(true),
    )
    .addIntegerOption((option) =>
      option
        .setName('amount')
        .setDescription(`How many coins to grant (1–${MAX_GRANT})`)
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(MAX_GRANT),
    )
    .addStringOption((option) =>
      option
        .setName('reason')
        .setDescription('Why the coins are being granted')
        .setMaxLength(400),
    ),

  async execute(interaction) {
    const guild = interaction.guild;

    if (!guild) {
      await interaction.reply({
        content: t('en', 'moderation.grantcoins.guildOnly'),
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
          command: 'grantcoins',
        }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const user = interaction.options.getUser('member', true);
    if (user.bot) {
      await interaction.reply({
        content: t(language, 'moderation.grantcoins.bot'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const amount = interaction.options.getInteger('amount', true);
    const reason = interaction.options.getString('reason')?.trim() || t(language, 'moderation.noReason');

    try {
      const result = await grantCoins({
        guildId: guild.id,
        userId: user.id,
        amount,
      });
      const targetName = user.globalName ?? user.username;

      if (result.amount === 0) {
        await interaction.reply({
          content: t(language, 'moderation.grantcoins.max', {
            target: targetName,
            coins: coins(result.balance, language),
          }),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      await sendModerationLog(interaction.client, guild.id, {
        action: 'grantcoins',
        targetId: user.id,
        targetName: user.username,
        moderatorId: interaction.user.id,
        reason,
        extra: t(language, 'moderation.grantcoins.extra', {
          amount: coins(result.amount, language),
          balance: coins(result.balance, language),
        }),
      });

      const embed = createEmbed(interaction.client, {
        section: t(language, 'help.tabs.economy'),
        title: t(language, 'moderation.grantcoins.title'),
        description: result.capped
          ? t(language, 'moderation.grantcoins.capped', {
            added: coins(result.amount, language),
            requested: coins(result.requested, language),
          })
          : t(language, 'moderation.grantcoins.description', {
            target: targetName,
            coins: coins(result.amount, language),
          }),
        color: COLORS.game,
        thumbnail: user.displayAvatarURL({ extension: 'png', size: 256, forceStatic: true }),
        fields: [
          {
            name: `🎯 ${t(language, 'moderation.fields.member')}`,
            value: `${targetName}\n\`${user.id}\``,
            inline: true,
          },
          {
            name: `🪙 ${t(language, 'moderation.fields.granted')}`,
            value: `**${coins(result.amount, language)}** ${t(language, 'common.coins')}`,
            inline: true,
          },
          {
            name: `💰 ${t(language, 'moderation.fields.balance')}`,
            value: `**${coins(result.balance, language)}** ${t(language, 'common.coins')}`,
            inline: true,
          },
          { name: `📝 ${t(language, 'moderation.fields.reason')}`, value: reason, inline: false },
        ],
        footer: t(language, 'moderation.grantcoins.footer', {
          user: interaction.user.username,
        }),
      });

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    } catch (error) {
      console.error('[economy] /grantcoins failed:', error);
      await interaction.reply({
        content: t(language, 'moderation.grantcoins.error'),
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
