const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { formatDuration } = require('../../lib/typerace');
const { getLeaderboard, getStanding } = require('../../lib/typeraceLeaderboard');
const { getInteractionLanguage, t } = require('../../lib/i18n');

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
    const language = await getInteractionLanguage(interaction);

    if (!interaction.guildId) {
      await interaction.reply({
        content: t(language, 'minigames.typeraceleaderboard.guildOnly'),
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
      : t(language, 'minigames.typeraceleaderboard.empty');

    const personalBest = standing.entry
      ? t(language, 'minigames.typeraceleaderboard.personal', {
          time: formatDuration(standing.entry.bestMs),
          rank: standing.rank,
          total: standing.totalUsers,
        })
      : t(language, 'minigames.typeraceleaderboard.noTime');

    const embed = createEmbed(interaction.client, {
      section: t(language, 'help.tabs.minigames'),
      title: t(language, 'minigames.typeraceleaderboard.title'),
      description: [
        t(language, 'minigames.typeraceleaderboard.description', { server: interaction.guild.name }),
        t(language, 'minigames.typeraceleaderboard.onlyCorrect'),
      ].join('\n'),
      color: COLORS.game,
      fields: [
        { name: t(language, 'minigames.typeraceleaderboard.leaderboard'), value: list, inline: false },
        { name: t(language, 'minigames.typeraceleaderboard.yourBest'), value: personalBest, inline: true },
        { name: t(language, 'minigames.typeraceleaderboard.racers'), value: `**${board.totalUsers}**`, inline: true },
      ],
      footer: t(language, 'minigames.typeraceleaderboard.footer'),
    });

    await interaction.reply({ embeds: [embed] });
  },
};
