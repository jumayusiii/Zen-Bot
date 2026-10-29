const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { getLeaderboard, getProfile } = require('../../lib/levels');

const MEDALS = ['🥇', '🥈', '🥉'];

function formatNumber(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('en-US');
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
        content: 'Levels are tracked per server. Run `/levels` in a server channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const [board, profile] = await Promise.all([
      getLeaderboard(interaction.guild.id, 10),
      getProfile(interaction.guild.id, interaction.user.id),
    ]);

    const fields = board.entries.map((entry) => ({
      name: `${rankLabel(entry.rank)}  ·  ${entry.username}`,
      value: `Level **${entry.progress.level}**  ·  **${formatNumber(entry.xp)}** XP`,
      inline: false,
    }));

    if (profile.rank && profile.rank > 10) {
      fields.push({
        name: 'Your rank',
        value: `**#${profile.rank}** of **${formatNumber(profile.totalUsers)}**  ·  Level **${profile.progress.level}**  ·  **${formatNumber(profile.progress.totalXp)}** XP`,
        inline: false,
      });
    }

    const embed = createEmbed(interaction.client, {
      section: 'Levels',
      title: `${interaction.guild.name} leaderboard`,
      description: board.totalUsers === 0
        ? 'No one has earned XP yet. Send a message in this server to start.'
        : `Top **${board.entries.length}** of **${formatNumber(board.totalUsers)}** ranked members.`,
      color: COLORS.brand,
      thumbnail: interaction.guild.iconURL({ extension: 'png', size: 128, forceStatic: true }),
      fields,
      footer: 'Chat XP  ·  +25–35 XP per message, once a minute  ·  top 10',
    });

    await interaction.reply({ embeds: [embed] });
  },
};
