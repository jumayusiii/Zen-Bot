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
  MAX,
  MAX_ROUNDS,
  MIN,
  drawNext,
  drawStartingNumber,
  judgeGuess,
} = require('../../lib/higherlower');

const GAME_TTL_MS = 15 * 60 * 1000;
const games = new Map();

function pruneExpired(now = Date.now()) {
  for (const [gameId, game] of games) {
    if (now - game.updatedAt > GAME_TTL_MS) games.delete(gameId);
  }
}

function createGame(ownerId) {
  return {
    id: crypto.randomUUID(),
    ownerId,
    current: drawStartingNumber(),
    round: 1,
    streak: 0,
    over: false,
    result: null,
    updatedAt: Date.now(),
  };
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function buildPayload(client, game) {
  const shownRound = Math.min(game.round, MAX_ROUNDS);
  let title = 'Higher or Lower';
  let description;
  let color = COLORS.game;

  if (!game.over) {
    description = [
      `Is the next number **higher** or **lower** than **${game.current}**?`,
      '-# Guess right to keep the streak alive.',
    ].join('\n');
  } else if (game.result?.correct) {
    title = 'Higher or Lower · perfect run';
    color = COLORS.success;
    description = [
      `🏆 **Perfect run** — ${MAX_ROUNDS} correct guesses in a row!`,
      `-# Final streak: **${game.streak}**.`,
    ].join('\n');
  } else {
    title = 'Higher or Lower · game over';
    color = COLORS.danger;
    description = [
      `💥 **Game over** — the next number was **${game.result?.next ?? '—'}**.`,
      `Final streak: **${game.streak}** over ${plural(shownRound, 'round')}.`,
    ].join('\n');
  }

  const embed = createEmbed(client, {
    section: 'Minigames',
    title,
    description,
    color,
    fields: [
      { name: 'Streak', value: `**${game.streak}**`, inline: true },
      { name: 'Round', value: `**${shownRound}** / ${MAX_ROUNDS}`, inline: true },
      { name: 'Range', value: `${MIN}–${MAX}`, inline: true },
    ],
    footer: game.over ? 'Round finished' : `Up to ${MAX_ROUNDS} rounds`,
  });

  const guessButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`higherlower:guess:${game.id}:higher`)
      .setLabel('Higher')
      .setEmoji('⬆️')
      .setStyle(ButtonStyle.Success)
      .setDisabled(game.over),
    new ButtonBuilder()
      .setCustomId(`higherlower:guess:${game.id}:lower`)
      .setLabel('Lower')
      .setEmoji('⬇️')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(game.over),
  );

  const components = [guessButtons];

  if (game.over) {
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`higherlower:again:${game.id}`)
          .setLabel('Play again')
          .setEmoji('🔁')
          .setStyle(ButtonStyle.Primary),
      ),
    );
  }

  return { embeds: [embed], components };
}

async function replyExpired(interaction) {
  await interaction.reply({
    content: 'This round has expired. Run `/higherlower` to start a new one.',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  beta: true,
  MAX_ROUNDS,

  data: new SlashCommandBuilder()
    .setName('higherlower')
    .setDescription('Guess whether the next number is higher or lower'),

  async execute(interaction) {
    pruneExpired();

    const game = createGame(interaction.user.id);
    games.set(game.id, game);

    await interaction.reply(buildPayload(interaction.client, game));
  },

  async handleComponent(interaction) {
    const [, action, gameId, rawGuess] = interaction.customId.split(':');
    if (!gameId) return;

    pruneExpired();

    const game = games.get(gameId);
    if (!game) {
      await replyExpired(interaction);
      return;
    }

    if (game.ownerId !== interaction.user.id) {
      await interaction.reply({
        content: 'This round belongs to someone else. Run `/higherlower` to start your own.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action === 'again') {
      if (!game.over) {
        await interaction.reply({
          content: 'Finish this round before starting a new one.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      Object.assign(game, {
        current: drawStartingNumber(),
        round: 1,
        streak: 0,
        over: false,
        result: null,
        updatedAt: Date.now(),
      });

      await interaction.update(buildPayload(interaction.client, game));
      return;
    }

    if (action !== 'guess') return;

    if (game.over) {
      await interaction.reply({
        content: 'This round is over. Press **Play again** for a new round.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guess = rawGuess === 'higher' || rawGuess === 'lower' ? rawGuess : null;
    if (!guess) {
      await interaction.reply({
        content: 'That guess is not valid. Run `/higherlower` again.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const next = drawNext(game.current);
    const correct = judgeGuess(game.current, next, guess);
    game.result = { guess, next, correct };

    if (correct) {
      game.streak += 1;
      game.current = next;

      if (game.round >= MAX_ROUNDS) game.over = true;
      else game.round += 1;
    } else {
      game.over = true;
    }

    game.updatedAt = Date.now();

    await interaction.update(buildPayload(interaction.client, game));
  },
};
