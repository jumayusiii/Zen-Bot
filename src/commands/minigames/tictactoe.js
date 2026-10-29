const crypto = require('node:crypto');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  BOT,
  PLAYER,
  applyMove,
  chooseBotMove,
  createBoard,
  winnerOf,
} = require('../../lib/tictactoe');

const GAME_TTL_MS = 20 * 60 * 1000;
const games = new Map();

function pruneExpired(now = Date.now()) {
  for (const [gameId, game] of games) {
    if (now - game.updatedAt > GAME_TTL_MS) games.delete(gameId);
  }
}

function statusText(game) {
  if (game.status === PLAYER) return '🏆 **You win!** Well played.';
  if (game.status === BOT) return '🤖 **The bot wins.** Try again!';
  if (game.status === 'draw') return '🤝 **It is a draw.**';
  return 'Your move. You are **X**, the bot is **O**.';
}

function buildButtons(game) {
  const finished = game.status !== 'playing';

  return [0, 1, 2].map((row) =>
    new ActionRowBuilder().addComponents(
      [0, 1, 2].map((column) => {
        const index = row * 3 + column;
        const mark = game.board[index];

        return new ButtonBuilder()
          .setCustomId(`tictactoe:move:${game.id}:${index}`)
          .setLabel(mark ?? '\u200b')
          .setStyle(
            mark === PLAYER
              ? ButtonStyle.Primary
              : mark === BOT
                ? ButtonStyle.Danger
                : ButtonStyle.Secondary,
          )
          .setDisabled(finished || mark !== null);
      }),
    ),
  );
}

function buildPayload(client, game) {
  const color =
    game.status === PLAYER
      ? COLORS.success
      : game.status === BOT
        ? COLORS.danger
        : game.status === 'draw'
          ? COLORS.warning
          : COLORS.game;

  const embed = createEmbed(client, {
    section: 'Minigames',
    title: 'Tic-Tac-Toe',
    description: statusText(game),
    color,
    fields: [
      { name: '❌ You', value: 'X', inline: true },
      { name: '⭕ Bot', value: 'O', inline: true },
      {
        name: '📌 Status',
        value: game.status === 'playing' ? 'In progress' : 'Game over',
        inline: true,
      },
    ],
    footer: game.status === 'playing'
      ? 'Only the player who started this game can move'
      : 'Run /tictactoe for another round',
  });

  return { embeds: [embed], components: buildButtons(game) };
}

async function replyExpired(interaction) {
  await interaction.reply({
    content: 'This game has expired. Run `/tictactoe` to start a new one.',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('tictactoe')
    .setDescription('Play tic-tac-toe against the bot'),

  async execute(interaction) {
    pruneExpired();

    const game = {
      id: crypto.randomUUID(),
      ownerId: interaction.user.id,
      board: createBoard(),
      status: 'playing',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    games.set(game.id, game);
    await interaction.reply(buildPayload(interaction.client, game));
  },

  async handleComponent(interaction) {
    const [, action, gameId, rawIndex] = interaction.customId.split(':');
    if (action !== 'move' || !gameId) return;

    pruneExpired();
    const game = games.get(gameId);

    if (!game) {
      await replyExpired(interaction);
      return;
    }

    if (game.ownerId !== interaction.user.id) {
      await interaction.reply({
        content: 'This board belongs to someone else. Run `/tictactoe` to start your own game.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (game.status !== 'playing') {
      await interaction.reply({
        content: 'This game is already over. Run `/tictactoe` for a new one.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const index = Number.parseInt(rawIndex, 10);
    const board = applyMove(game.board, index, PLAYER);

    if (!board) {
      await interaction.reply({
        content: 'That square is already taken. Choose an empty one.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    game.board = board;
    let status = winnerOf(game.board);

    if (!status) {
      const botMove = chooseBotMove(game.board);
      const botBoard = applyMove(game.board, botMove, BOT);
      if (botBoard) game.board = botBoard;
      status = winnerOf(game.board);
    }

    game.status = status ?? 'playing';
    game.updatedAt = Date.now();

    const payload = buildPayload(interaction.client, game);
    if (game.status !== 'playing') games.delete(gameId);

    await interaction.update(payload);
  },
};
