const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { formatDuration } = require('../../lib/typerace');
const { getLeaderboard, getStanding } = require('../../lib/typeraceLeaderboard');

const MEDALS = ['🥇', '🥈', '🥉'];

function rankingLine(entry, index) {
  const marker = MEDALS[index] ?? `**${index + 1}.**`;
  return `${marker} **${entry.username}** · \`${formatDuration(entry.bestMs)}\` · ${entry.wpm} WPM`;
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('typeraceleaderboard')
    .setDescription('Show the fastest Type Race time for each member'),

  async execute(interaction) {
    if (!interaction.guildId) {
      await interaction.reply({
        content: 'The Type Race leaderboard is per server. Run this command in a server.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const [board, standing] = await Promise.all([
      getLeaderboard(interaction.guildId, 10),
      getStanding(interaction.guildId, interaction.user.id),
    ]);

    const list = board.entries.length > 0
      ? board.entries.map((entry, index) => rankingLine(entry, index)).join('\n')
      : 'No completed races yet. Run `/typerace` and set the first time.';

    const personalBest = standing.entry
      ? `**${formatDuration(standing.entry.bestMs)}**\n-# Rank #${standing.rank} of ${standing.totalUsers}`
      : 'No time yet\n-# Run `/typerace` to enter';

    const embed = createEmbed(interaction.client, {
      section: 'Minigames',
      title: 'Type Race · fastest times',
      description: [
        `The shortest exact run per member in **${interaction.guild.name}**.`,
        '-# Only correct submissions count.',
      ].join('\n'),
      color: COLORS.game,
      fields: [
        { name: '🏁 Leaderboard', value: list, inline: false },
        { name: '🏅 Your best', value: personalBest, inline: true },
        { name: '👥 Racers', value: `**${board.totalUsers}**`, inline: true },
      ],
      footer: 'Shorter is better  ·  /typerace to set a time',
    });

    await interaction.reply({ embeds: [embed] });
  },
};
