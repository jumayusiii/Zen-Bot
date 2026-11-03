const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { getLeaderboard, getProfile } = require('../../lib/levels');
const { getInteractionLanguage, t } = require('../../lib/i18n');

const MEDALS = ['🥇', '🥈', '🥉'];

function formatNumber(value, language = 'en') {
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString(locale);
}

function rankLabel(rank) {
  return MEDALS[rank - 1] ? `${MEDALS[rank - 1]} #${rank}` : `#${rank}`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('levels')
    .setDescription('Show the top ten members by chat XP'),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: t('en', 'levels.leaderboard.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const language = await getInteractionLanguage(interaction);
    const [board, profile] = await Promise.all([
      getLeaderboard(interaction.guild.id, 10),
      getProfile(interaction.guild.id, interaction.user.id),
    ]);

    const fields = board.entries.map((entry) => ({
      name: `${rankLabel(entry.rank)}  ·  ${entry.username}`,
      value: `${t(language, 'levels.rank.level')} **${entry.progress.level}**  ·  **${formatNumber(entry.xp, language)}** XP`,
      inline: false,
    }));

    if (profile.rank && profile.rank > 10) {
      fields.push({
        name: t(language, 'levels.leaderboard.yourRank'),
        value: t(language, 'levels.leaderboard.yourRankValue', {
          rank: profile.rank,
          total: formatNumber(profile.totalUsers, language),
          level: profile.progress.level,
          xp: formatNumber(profile.progress.totalXp, language),
        }),
        inline: false,
      });
    }

    const embed = createEmbed(interaction.client, {
      section: t(language, 'help.tabs.levels'),
      title: t(language, 'levels.leaderboard.title', { server: interaction.guild.name }),
      description: board.totalUsers === 0
        ? t(language, 'levels.leaderboard.empty')
        : t(language, 'levels.leaderboard.summary', {
          shown: board.entries.length,
          total: formatNumber(board.totalUsers, language),
        }),
      color: COLORS.brand,
      thumbnail: interaction.guild.iconURL({ extension: 'png', size: 128, forceStatic: true }),
      fields,
      footer: t(language, 'levels.leaderboard.footer'),
    });

    await interaction.reply({ embeds: [embed] });
  },
};
