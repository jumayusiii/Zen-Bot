const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { getEconomyLeaderboard } = require('../../lib/economy');
const { getGuildLanguage, t } = require('../../lib/i18n');

const MEDALS = ['🥇', '🥈', '🥉'];

function coins(value, language = 'en') {
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString(locale);
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
        content: t('en', 'leaderboard.guildOnly'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const language = await getGuildLanguage(interaction.guild.id);

    try {
      const board = await getEconomyLeaderboard(
        interaction.guild.id,
        10,
        interaction.user.id,
      );

      const fields = board.entries.map((entry) => ({
        name: `${rankLabel(entry.rank)}  ·  ${displayName(interaction.guild, entry.userId)}`,
        value: `**${coins(entry.balance, language)}** ${t(language, 'balance.coins')}`,
        inline: false,
      }));

      if (board.member && board.member.rank > board.entries.length) {
        fields.push({
          name: t(language, 'leaderboard.rank'),
          value: t(language, 'leaderboard.rankValue', {
            rank: board.member.rank,
            total: coins(board.totalUsers, language),
            coins: coins(board.member.balance, language),
          }),
          inline: false,
        });
      }

      await interaction.reply({
        embeds: [
          createEmbed(interaction.client, {
            section: t(language, 'help.tabs.economy', {}, 'Economy'),
            title: t(language, 'leaderboard.title', { server: interaction.guild.name }),
            description: board.totalUsers === 0
              ? t(language, 'leaderboard.empty')
              : t(language, 'leaderboard.summary', {
                shown: board.entries.length,
                total: coins(board.totalUsers, language),
              }),
            color: COLORS.game,
            thumbnail: interaction.guild.iconURL({ extension: 'png', size: 128, forceStatic: true }),
            fields,
            footer: t(language, 'leaderboard.footer'),
          }),
        ],
        allowedMentions: { parse: [] },
      });
    } catch (error) {
      console.error('[economy] /ecoleaderboard failed:', error);
      await interaction.reply({
        content: t(language, 'leaderboard.error'),
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
