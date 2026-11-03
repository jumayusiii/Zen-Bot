const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { getEconomyLeaderboard } = require('../../lib/economy');

const MEDALS = ['🥇', '🥈', '🥉'];

function coins(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('en-US');
}

function rankLabel(rank) {
  return MEDALS[rank - 1] ? `${MEDALS[rank - 1]} #${rank}` : `#${rank}`;
}

function displayName(guild, userId) {
  return guild.members?.cache?.get(userId)?.displayName ?? `<@${userId}>`;
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('ecoleaderboard')
    .setDescription('Show the ten richest members in the server'),

  async execute(interaction) {
    if (!interaction.guild) {
      await interaction.reply({
        content: 'Coins are tracked per server. Run `/ecoleaderboard` in a server channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      const board = await getEconomyLeaderboard(
        interaction.guild.id,
        10,
        interaction.user.id,
      );

      const fields = board.entries.map((entry) => ({
        name: `${rankLabel(entry.rank)}  ·  ${displayName(interaction.guild, entry.userId)}`,
        value: `**${coins(entry.balance)}** coins`,
        inline: false,
      }));

      if (board.member && board.member.rank > board.entries.length) {
        fields.push({
          name: 'Your rank',
          value: `**#${board.member.rank}** of **${coins(board.totalUsers)}**  ·  **${coins(board.member.balance)}** coins`,
          inline: false,
        });
      }

      await interaction.reply({
        embeds: [
          createEmbed(interaction.client, {
            section: 'Economy',
            title: `${interaction.guild.name} leaderboard`,
            description: board.totalUsers === 0
              ? 'No one has coins yet. Earn some with `/daily`, `/work` or `/steal`.'
              : `Top **${board.entries.length}** of **${coins(board.totalUsers)}** funded wallets.`,
            color: COLORS.game,
            thumbnail: interaction.guild.iconURL({ extension: 'png', size: 128, forceStatic: true }),
            fields,
            footer: 'Per-server wallets  ·  /daily  ·  /work  ·  /steal  ·  top 10',
          }),
        ],
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      console.error('[economy] /ecoleaderboard failed:', error);
      await interaction.reply({
        content: 'Could not read the economy leaderboard right now. Please try again.',
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
