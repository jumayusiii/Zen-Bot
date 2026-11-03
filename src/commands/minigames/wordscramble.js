const crypto = require('node:crypto');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { MAX_ROUNDS, createRound } = require('../../lib/wordScramble');
const { getInteractionLanguage, t } = require('../../lib/i18n');

const GAME_TTL_MS = 15 * 60 * 1000;
const games = new Map();

function pruneExpired(now = Date.now()) {
  for (const [gameId, game] of games) {
    if (now - game.updatedAt > GAME_TTL_MS) games.delete(gameId);
  }
}

function freshRound(game, round, score, language) {
  return {
    ...game,
    round,
    score,
    result: null,
    ...createRound(Math.random, game.word, language),
    updatedAt: Date.now(),
  };
}

function buildPayload(client, game, language) {
  const answered = Boolean(game.result);
  const finished = answered && game.round >= MAX_ROUNDS;
  let title = t(language, 'minigames.wordscramble.title');
  let description;

  if (!answered) {
    description = [
      t(language, 'minigames.wordscramble.unscramble'),
      t(language, 'minigames.wordscramble.hint', { hint: game.hint }),
    ].join('\n');
  } else if (game.result.correct) {
    description = [
      t(language, 'minigames.wordscramble.correct'),
      t(language, 'minigames.wordscramble.wordWas', { word: game.word }),
    ].join('\n');
  } else {
    description = [
      t(language, 'minigames.wordscramble.wrong'),
      t(language, 'minigames.wordscramble.wordWas', { word: game.word }),
    ].join('\n');
  }

  if (finished) {
    title = t(language, 'minigames.wordscramble.completeTitle');
    description = [
      description,
      t(language, 'minigames.wordscramble.finalScore', {
        score: game.score,
        rounds: MAX_ROUNDS,
      }),
    ].join('\n');
  }

  const embed = createEmbed(client, {
    section: t(language, 'help.tabs.minigames'),
    title,
    description,
    color: answered
      ? (game.result.correct ? COLORS.success : COLORS.danger)
      : COLORS.game,
    fields: [
      { name: t(language, 'minigames.wordscramble.scrambled'), value: `\`${game.scrambled}\``, inline: true },
      { name: t(language, 'minigames.wordscramble.round'), value: `**${game.round}** / ${MAX_ROUNDS}`, inline: true },
      { name: t(language, 'minigames.wordscramble.score'), value: `**${game.score}** / ${game.round}`, inline: true },
    ],
    footer: t(
      language,
      answered
        ? (finished
            ? 'minigames.wordscramble.footerComplete'
            : 'minigames.wordscramble.footerPick')
        : 'minigames.wordscramble.footerOwner',
    ),
  });

  const answerButtons = game.choices.map((choice, index) => {
    let style = ButtonStyle.Secondary;

    if (answered) {
      if (index === game.answer) style = ButtonStyle.Success;
      else if (index === game.result.choice) style = ButtonStyle.Danger;
    } else {
      style = ButtonStyle.Primary;
    }

    return new ButtonBuilder()
      .setCustomId(`wordscramble:answer:${game.id}:${index}`)
      .setLabel(choice)
      .setStyle(style)
      .setDisabled(answered);
  });

  const components = [new ActionRowBuilder().addComponents(answerButtons)];

  if (answered) {
    const remaining = MAX_ROUNDS - game.round;
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(finished ? `wordscramble:again:${game.id}` : `wordscramble:next:${game.id}`)
          .setLabel(
            finished
              ? t(language, 'minigames.wordscramble.playAgain')
              : remaining > 0
                ? t(language, 'minigames.wordscramble.nextLeft', { count: remaining })
                : t(language, 'minigames.wordscramble.next'),
          )
          .setEmoji(finished ? '🔁' : '➡️')
          .setStyle(finished ? ButtonStyle.Primary : ButtonStyle.Success),
      ),
    );
  }

  return { embeds: [embed], components };
}

async function replyExpired(interaction, language) {
  await interaction.reply({
    content: t(language, 'minigames.wordscramble.expired'),
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  beta: true,
  MAX_ROUNDS,

  data: new SlashCommandBuilder()
    .setName('wordscramble')
    .setDescription('Unscramble the word across five quick rounds'),

  async execute(interaction) {
    pruneExpired();
    const language = await getInteractionLanguage(interaction);

    const game = {
      id: crypto.randomUUID(),
      ownerId: interaction.user.id,
      round: 1,
      score: 0,
      result: null,
      ...createRound(Math.random, null, language),
      updatedAt: Date.now(),
    };

    games.set(game.id, game);
    await interaction.reply(buildPayload(interaction.client, game, language));
  },

  async handleComponent(interaction) {
    const [, action, gameId, rawIndex] = interaction.customId.split(':');
    if (!gameId) return;

    pruneExpired();
    const language = await getInteractionLanguage(interaction);

    const game = games.get(gameId);
    if (!game) {
      await replyExpired(interaction, language);
      return;
    }

    if (game.ownerId !== interaction.user.id) {
      await interaction.reply({
        content: t(language, 'minigames.wordscramble.owner'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action === 'answer') {
      if (game.result) {
        await interaction.reply({
          content: t(language, 'minigames.wordscramble.already'),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const choice = Number.parseInt(rawIndex, 10);
      if (!Number.isInteger(choice) || choice < 0 || choice >= game.choices.length) {
        await interaction.reply({
          content: t(language, 'minigames.wordscramble.invalid'),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      game.result = { choice, correct: choice === game.answer };
      if (game.result.correct) game.score += 1;
      game.updatedAt = Date.now();

      await interaction.update(buildPayload(interaction.client, game, language));
      return;
    }

    if (action === 'next' || action === 'again') {
      if (!game.result) {
        await interaction.reply({
          content: t(language, 'minigames.wordscramble.answerFirst'),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const reset = action === 'again' || game.round >= MAX_ROUNDS;
      Object.assign(
        game,
        reset
          ? freshRound(game, 1, 0, language)
          : freshRound(game, game.round + 1, game.score, language),
      );

      await interaction.update(buildPayload(interaction.client, game, language));
    }
  },
};
