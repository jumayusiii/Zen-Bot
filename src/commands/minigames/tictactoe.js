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
const { getInteractionLanguage, t } = require('../../lib/i18n');

const GAME_TTL_MS = 20 * 60 * 1000;
const games = new Map();

function pruneExpired(now = Date.now()) {
  for (const [gameId, game] of games) {
    if (now - game.updatedAt > GAME_TTL_MS) games.delete(gameId);
  }
}

function statusText(game, language) {
  if (game.status === PLAYER) return t(language, 'minigames.tictactoe.win');
  if (game.status === BOT) return t(language, 'minigames.tictactoe.lose');
  if (game.status === 'draw') return t(language, 'minigames.tictactoe.draw');
  return t(language, 'minigames.tictactoe.yourMove');
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

function buildPayload(client, game, language) {
  const color =
    game.status === PLAYER
      ? COLORS.success
      : game.status === BOT
        ? COLORS.danger
        : game.status === 'draw'
          ? COLORS.warning
          : COLORS.game;

  const embed = createEmbed(client, {
    section: t(language, 'help.tabs.minigames'),
    title: t(language, 'minigames.tictactoe.title'),
    description: statusText(game, language),
    color,
    fields: [
      { name: t(language, 'minigames.tictactoe.you'), value: 'X', inline: true },
      { name: t(language, 'minigames.tictactoe.bot'), value: 'O', inline: true },
      {
        name: t(language, 'minigames.tictactoe.status'),
        value: t(
          language,
          game.status === 'playing'
            ? 'minigames.tictactoe.inProgress'
            : 'minigames.tictactoe.gameOver',
        ),
        inline: true,
      },
    ],
    footer: t(
      language,
      game.status === 'playing'
        ? 'minigames.tictactoe.footerActive'
        : 'minigames.tictactoe.footerDone',
    ),
  });

  return { embeds: [embed], components: buildButtons(game) };
}

async function replyExpired(interaction, language) {
  await interaction.reply({
    content: t(language, 'minigames.tictactoe.expired'),
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
    const language = await getInteractionLanguage(interaction);

    const game = {
      id: crypto.randomUUID(),
      ownerId: interaction.user.id,
      board: createBoard(),
      status: 'playing',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    games.set(game.id, game);
    await interaction.reply(buildPayload(interaction.client, game, language));
  },

  async handleComponent(interaction) {
    const [, action, gameId, rawIndex] = interaction.customId.split(':');
    if (action !== 'move' || !gameId) return;

    pruneExpired();
    const language = await getInteractionLanguage(interaction);
    const game = games.get(gameId);

    if (!game) {
      await replyExpired(interaction, language);
      return;
    }

    if (game.ownerId !== interaction.user.id) {
      await interaction.reply({
        content: t(language, 'minigames.tictactoe.owner'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (game.status !== 'playing') {
      await interaction.reply({
        content: t(language, 'minigames.tictactoe.alreadyOver'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const index = Number.parseInt(rawIndex, 10);
    const board = applyMove(game.board, index, PLAYER);

    if (!board) {
      await interaction.reply({
        content: t(language, 'minigames.tictactoe.taken'),
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

    const payload = buildPayload(interaction.client, game, language);
    if (game.status !== 'playing') games.delete(gameId);

    await interaction.update(payload);
  },
};
