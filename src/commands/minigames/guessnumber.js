const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  MAX,
  MAX_ATTEMPTS,
  MIN,
  createGame,
  judgeGuess,
} = require('../../lib/guessNumber');

const GAME_TTL_MS = 15 * 60 * 1000;
const games = new Map();

function gameKey(interaction) {
  return `${interaction.guildId ?? 'dm'}:${interaction.user.id}`;
}

function pruneExpired(now = Date.now()) {
  for (const [key, game] of games) {
    if (now - game.updatedAt > GAME_TTL_MS) games.delete(key);
  }
}

function gameFields(game, attempts) {
  return [
    { name: 'Range', value: `${MIN}–${MAX}`, inline: true },
    { name: 'Attempts', value: `**${attempts}** / ${MAX_ATTEMPTS}`, inline: true },
    { name: 'Remaining', value: `**${Math.max(0, MAX_ATTEMPTS - attempts)}**`, inline: true },
  ];
}

function startEmbed(client) {
  return createEmbed(client, {
    section: 'Minigames',
    title: 'Guess the number',
    description: [
      `I picked a number between **${MIN}** and **${MAX}**.`,
      `Make your first guess with \`/guessnumber guess:50\`.`,
      `-# You have **${MAX_ATTEMPTS}** attempts.`,
    ].join('\n'),
    color: COLORS.game,
    fields: gameFields({}, 0),
    footer: `${MIN}–${MAX}  ·  ${MAX_ATTEMPTS} attempts`,
  });
}

function statusEmbed(client, game) {
  return createEmbed(client, {
    section: 'Minigames',
    title: 'Round in progress',
    description: `You have **${MAX_ATTEMPTS - game.attempts}** attempts left. Guess with \`/guessnumber guess:...\`.`,
    color: COLORS.game,
    fields: gameFields(game, game.attempts),
    footer: `${MIN}–${MAX}  ·  ${MAX_ATTEMPTS} attempts`,
  });
}

function resultEmbed(client, game, outcome, guess) {
  const attempts = outcome.attempts;

  if (outcome.result === 'correct') {
    return createEmbed(client, {
      section: 'Minigames',
      title: 'You got it!',
      description: `The number was **${game.target}**. You found it in **${attempts}** attempt${attempts === 1 ? '' : 's'}.`,
      color: COLORS.success,
      fields: gameFields(game, attempts),
      footer: 'Run /guessnumber to play again',
    });
  }

  if (outcome.result === 'lost') {
    return createEmbed(client, {
      section: 'Minigames',
      title: 'Out of attempts',
      description: `The number was **${game.target}**. Better luck next round.`,
      color: COLORS.danger,
      fields: gameFields(game, attempts),
      footer: 'Run /guessnumber to play again',
    });
  }

  const direction = outcome.result === 'higher' ? 'Too low — aim higher.' : 'Too high — aim lower.';

  return createEmbed(client, {
    section: 'Minigames',
    title: 'Not quite',
    description: `Your guess **${guess}** was not the number. ${direction}`,
    color: COLORS.warning,
    fields: gameFields(game, attempts),
    footer: `${MIN}–${MAX}  ·  ${MAX_ATTEMPTS} attempts`,
  });
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('guessnumber')
    .setDescription('Guess the bot’s number between 1 and 100')
    .addIntegerOption((option) =>
      option
        .setName('guess')
        .setDescription('Your guess, or leave this out to see the round status')
        .setMinValue(MIN)
        .setMaxValue(MAX),
    ),

  async execute(interaction) {
    pruneExpired();

    const key = gameKey(interaction);
    const guess = interaction.options.getInteger('guess');
    let game = games.get(key) ?? null;

    if (game && Date.now() - game.updatedAt > GAME_TTL_MS) {
      games.delete(key);
      game = null;
    }

    if (!game) {
      game = { ...createGame(), updatedAt: Date.now() };
      games.set(key, game);

      if (guess === null) {
        await interaction.reply({ embeds: [startEmbed(interaction.client)] });
        return;
      }
    }

    if (guess === null) {
      await interaction.reply({ embeds: [statusEmbed(interaction.client, game)] });
      return;
    }

    const outcome = judgeGuess(game, guess);

    if (!outcome.valid) {
      await interaction.reply({
        content: `Choose a whole number between **${MIN}** and **${MAX}**.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    game.attempts = outcome.attempts;
    game.updatedAt = Date.now();

    if (outcome.result === 'correct' || outcome.result === 'lost') {
      games.delete(key);
    }

    await interaction.reply({
      embeds: [resultEmbed(interaction.client, game, outcome, guess)],
      allowedMentions: { parse: [] },
    });
  },
};
