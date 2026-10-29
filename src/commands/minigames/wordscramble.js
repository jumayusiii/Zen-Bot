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

const GAME_TTL_MS = 15 * 60 * 1000;
const games = new Map();

function pruneExpired(now = Date.now()) {
  for (const [gameId, game] of games) {
    if (now - game.updatedAt > GAME_TTL_MS) games.delete(gameId);
  }
}

function freshRound(game, round, score) {
  return {
    ...game,
    round,
    score,
    result: null,
    ...createRound(Math.random, game.word),
    updatedAt: Date.now(),
  };
}

function buildPayload(client, game) {
  const answered = Boolean(game.result);
  const finished = answered && game.round >= MAX_ROUNDS;
  let title = 'Word Scramble';
  let description;

  if (!answered) {
    description = ['**Unscramble the word.**', `-# Hint: ${game.hint}`].join('\n');
  } else if (game.result.correct) {
    description = ['✅ **Correct!**', `The word was **${game.word}**.`].join('\n');
  } else {
    description = ['❌ **Not quite.**', `The word was **${game.word}**.`].join('\n');
  }

  if (finished) {
    title = 'Word Scramble · complete';
    description = [
      description,
      `-# Final score: **${game.score} / ${MAX_ROUNDS}**`,
    ].join('\n');
  }

  const embed = createEmbed(client, {
    section: 'Minigames',
    title,
    description,
    color: answered
      ? (game.result.correct ? COLORS.success : COLORS.danger)
      : COLORS.game,
    fields: [
      { name: '🔀 Scrambled', value: `\`${game.scrambled}\``, inline: true },
      { name: '🎯 Round', value: `**${game.round}** / ${MAX_ROUNDS}`, inline: true },
      { name: '⭐ Score', value: `**${game.score}** / ${game.round}`, inline: true },
    ],
    footer: answered
      ? (finished ? 'Round complete  ·  play again for a fresh set' : 'Pick the correct word to score')
      : 'Only the player who started this round can answer',
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
          .setLabel(finished ? 'Play again' : `Next word${remaining > 0 ? ` · ${remaining} left` : ''}`)
          .setEmoji(finished ? '🔁' : '➡️')
          .setStyle(finished ? ButtonStyle.Primary : ButtonStyle.Success),
      ),
    );
  }

  return { embeds: [embed], components };
}

async function replyExpired(interaction) {
  await interaction.reply({
    content: 'This word scramble round has expired. Run `/wordscramble` to start a new one.',
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

    const game = {
      id: crypto.randomUUID(),
      ownerId: interaction.user.id,
      round: 1,
      score: 0,
      result: null,
      ...createRound(),
      updatedAt: Date.now(),
    };

    games.set(game.id, game);
    await interaction.reply(buildPayload(interaction.client, game));
  },

  async handleComponent(interaction) {
    const [, action, gameId, rawIndex] = interaction.customId.split(':');
    if (!gameId) return;

    pruneExpired();

    const game = games.get(gameId);
    if (!game) {
      await replyExpired(interaction);
      return;
    }

    if (game.ownerId !== interaction.user.id) {
      await interaction.reply({
        content: 'This word scramble belongs to someone else. Run `/wordscramble` to start your own.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action === 'answer') {
      if (game.result) {
        await interaction.reply({
          content: 'You already answered this word. Use the next button for another one.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const choice = Number.parseInt(rawIndex, 10);
      if (!Number.isInteger(choice) || choice < 0 || choice >= game.choices.length) {
        await interaction.reply({
          content: 'That answer is not valid. Run `/wordscramble` for a new round.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      game.result = { choice, correct: choice === game.answer };
      if (game.result.correct) game.score += 1;
      game.updatedAt = Date.now();

      await interaction.update(buildPayload(interaction.client, game));
      return;
    }

    if (action === 'next' || action === 'again') {
      if (!game.result) {
        await interaction.reply({
          content: 'Answer this word before moving on. The buttons are still active.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const reset = action === 'again' || game.round >= MAX_ROUNDS;
      Object.assign(
        game,
        reset
          ? freshRound(game, 1, 0)
          : freshRound(game, game.round + 1, game.score),
      );

      await interaction.update(buildPayload(interaction.client, game));
    }
  },
};
