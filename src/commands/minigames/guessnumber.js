const { MessageFlags, SlashCommandBuilder } = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  MAX,
  MAX_ATTEMPTS,
  MIN,
  createGame,
  judgeGuess,
} = require('../../lib/guessNumber');
const { getInteractionLanguage, t } = require('../../lib/i18n');

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

function gameFields(language, game, attempts) {
  return [
    { name: t(language, 'minigames.guessnumber.range'), value: `${MIN}–${MAX}`, inline: true },
    { name: t(language, 'minigames.guessnumber.attempts'), value: `**${attempts}** / ${MAX_ATTEMPTS}`, inline: true },
    { name: t(language, 'minigames.guessnumber.remaining'), value: `**${Math.max(0, MAX_ATTEMPTS - attempts)}**`, inline: true },
  ];
}

function startEmbed(client, language) {
  return createEmbed(client, {
    section: t(language, 'help.tabs.minigames'),
    title: t(language, 'minigames.guessnumber.title'),
    description: t(language, 'minigames.guessnumber.start', {
      min: MIN,
      max: MAX,
      attempts: MAX_ATTEMPTS,
    }),
    color: COLORS.game,
    fields: gameFields(language, {}, 0),
    footer: t(language, 'minigames.guessnumber.footer', { min: MIN, max: MAX, attempts: MAX_ATTEMPTS }),
  });
}

function statusEmbed(client, language, game) {
  return createEmbed(client, {
    section: t(language, 'help.tabs.minigames'),
    title: t(language, 'minigames.guessnumber.progressTitle'),
    description: t(language, 'minigames.guessnumber.progress', {
      remaining: MAX_ATTEMPTS - game.attempts,
    }),
    color: COLORS.game,
    fields: gameFields(language, game, game.attempts),
    footer: t(language, 'minigames.guessnumber.footer', { min: MIN, max: MAX, attempts: MAX_ATTEMPTS }),
  });
}

function resultEmbed(client, language, game, outcome, guess) {
  const attempts = outcome.attempts;

  if (outcome.result === 'correct') {
    return createEmbed(client, {
      section: t(language, 'help.tabs.minigames'),
      title: t(language, 'minigames.guessnumber.winTitle'),
      description: t(
        language,
        attempts === 1 ? 'minigames.guessnumber.winOne' : 'minigames.guessnumber.win',
        { target: game.target, attempts },
      ),
      color: COLORS.success,
      fields: gameFields(language, game, attempts),
      footer: t(language, 'minigames.guessnumber.footerDone'),
    });
  }

  if (outcome.result === 'lost') {
    return createEmbed(client, {
      section: t(language, 'help.tabs.minigames'),
      title: t(language, 'minigames.guessnumber.lostTitle'),
      description: t(language, 'minigames.guessnumber.lost', { target: game.target }),
      color: COLORS.danger,
      fields: gameFields(language, game, attempts),
      footer: t(language, 'minigames.guessnumber.footerDone'),
    });
  }

  const direction = t(
    language,
    outcome.result === 'higher' ? 'minigames.guessnumber.higher' : 'minigames.guessnumber.lower',
  );

  return createEmbed(client, {
    section: t(language, 'help.tabs.minigames'),
    title: t(language, 'minigames.guessnumber.wrongTitle'),
    description: t(language, 'minigames.guessnumber.wrong', { guess, direction }),
    color: COLORS.warning,
    fields: gameFields(language, game, attempts),
    footer: t(language, 'minigames.guessnumber.footer', { min: MIN, max: MAX, attempts: MAX_ATTEMPTS }),
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
    const language = await getInteractionLanguage(interaction);

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
        await interaction.reply({ embeds: [startEmbed(interaction.client, language)] });
        return;
      }
    }

    if (guess === null) {
      await interaction.reply({ embeds: [statusEmbed(interaction.client, language, game)] });
      return;
    }

    const outcome = judgeGuess(game, guess);

    if (!outcome.valid) {
      await interaction.reply({
        content: t(language, 'minigames.guessnumber.invalid', { min: MIN, max: MAX }),
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
      embeds: [resultEmbed(interaction.client, language, game, outcome, guess)],
      allowedMentions: { parse: [] },
    });
  },
};
