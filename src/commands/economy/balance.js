const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { getCardTheme } = require('../../lib/cardThemes');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { getAccount, getEconomyLeaderboard } = require('../../lib/economy');
const { getGuildLanguage, t } = require('../../lib/i18n');

function coins(value, language = 'en') {
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString(locale);
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription("Check a member's coin balance, server rank and daily streak")
    .addUserOption((option) =>
      option
        .setName('user')
        .setDescription('The member to check (defaults to you)'),
    ),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: t('en', 'balance.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const target = interaction.options.getUser('user') ?? interaction.user;
    const language = await getGuildLanguage(interaction.guild.id);

    try {
      const [account, board] = await Promise.all([
        getAccount(interaction.guild.id, target.id),
        getEconomyLeaderboard(interaction.guild.id, 10, target.id),
      ]);
      const theme = getCardTheme(account.theme);
      const rank = board.member && board.member.balance > 0
        ? t(language, 'balance.rankOf', {
          rank: board.member.rank,
          total: coins(board.totalUsers, language),
        })
        : t(language, 'balance.unranked');
      const streakKey = account.dailyStreak === 1 ? 'balance.day' : 'balance.days';
      const embed = createEmbed(interaction.client, {
        section: t(language, 'help.tabs.economy'),
        title: t(language, 'balance.title', { user: target.username }),
        description: account.balance > 0
          ? t(language, 'balance.description', {
            user: target.username,
            coins: coins(account.balance, language),
          })
          : t(language, 'balance.empty', { user: target.username }),
        color: COLORS.game,
        thumbnail: target.displayAvatarURL({ extension: 'png', size: 128, forceStatic: true }),
        fields: [
          {
            name: `💰 ${t(language, 'balance.balance')}`,
            value: `**${coins(account.balance, language)}** ${t(language, 'balance.coins')}`,
            inline: true,
          },
          { name: `📊 ${t(language, 'balance.rank')}`, value: rank, inline: true },
          {
            name: `🔥 ${t(language, 'balance.streak')}`,
            value: t(language, streakKey, { count: account.dailyStreak }),
            inline: true,
          },
          { name: `🎨 ${t(language, 'balance.theme')}`, value: theme.name, inline: false },
        ],
        footer: t(language, 'balance.footer'),
      });

      await interaction.reply({ embeds: [embed] });
    } catch (error) {
      console.error('[economy] /balance failed:', error);
      await interaction.reply({
        content: t(language, 'balance.error'),
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
