const crypto = require('node:crypto');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { randomQuestion } = require('../../lib/trivia');

const LETTERS = ['A', 'B', 'C', 'D'];
const MAX_REFRESHES = 5;
const GAME_TTL_MS = 15 * 60 * 1000;
const games = new Map();

function pruneExpired(now = Date.now()) {
  for (const [gameId, game] of games) {
    if (now - game.updatedAt > GAME_TTL_MS) games.delete(gameId);
  }
}

function truncate(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function buildPayload(client, game) {
  const { question } = game;
  const answered = game.result !== null;
  const answer = `${LETTERS[question.answer]}. ${question.options[question.answer]}`;

  let description;
  if (!answered) {
    description = [
      'Pick the answer you think is correct.',
      `-# ${question.category}  ·  ${MAX_REFRESHES - game.refreshes} refresh${MAX_REFRESHES - game.refreshes === 1 ? '' : 'es'} left`,
    ].join('\n');
  } else if (game.result.correct) {
    description = ['✅ **Correct** — that is the answer.', `-# ${question.category}`].join('\n');
  } else {
    const chosen = `${LETTERS[game.result.choice]}. ${question.options[game.result.choice]}`;
    description = [
      `❌ **Not quite** — you chose **${chosen}**.`,
      `The answer is **${answer}**.`,
      `-# ${question.category}`,
    ].join('\n');
  }

  const embed = createEmbed(client, {
    section: 'Minigames',
    title: truncate(question.question, 240),
    description,
    color: answered ? (game.result.correct ? COLORS.success : COLORS.danger) : COLORS.game,
    fields: [
      {
        name: 'Choices',
        value: question.options.map((option, index) => `**${LETTERS[index]}.** ${option}`).join('\n'),
        inline: false,
      },
      {
        name: '📊 Score',
        value: `**${game.correct}** of **${game.answered}** correct`,
        inline: true,
      },
      {
        name: '🔁 Refreshes',
        value: `**${MAX_REFRESHES - game.refreshes}** of **${MAX_REFRESHES}** left`,
        inline: true,
      },
    ],
    footer: answered ? 'Trivia · answer revealed' : 'Trivia · choose an answer',
  });

  const answerButtons = question.options.map((option, index) => {
    let style = ButtonStyle.Primary;

    if (answered) {
      if (index === question.answer) style = ButtonStyle.Success;
      else if (index === game.result.choice) style = ButtonStyle.Danger;
      else style = ButtonStyle.Secondary;
    }

    return new ButtonBuilder()
      .setCustomId(`trivia:answer:${game.id}:${index}`)
      .setLabel(LETTERS[index])
      .setStyle(style)
      .setDisabled(answered);
  });

  const components = [new ActionRowBuilder().addComponents(answerButtons)];

  if (answered) {
    const remaining = MAX_REFRESHES - game.refreshes;
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`trivia:next:${game.id}`)
          .setLabel(remaining > 0 ? `Next question · ${remaining} left` : 'Refresh limit reached')
          .setEmoji('🔁')
          .setStyle(remaining > 0 ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(remaining === 0),
      ),
    );
  }

  return { embeds: [embed], components };
}

async function replyExpired(interaction) {
  await interaction.reply({
    content: 'This trivia round has expired. Run `/trivia` for a new question.',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  beta: true,
  MAX_REFRESHES,

  data: new SlashCommandBuilder()
    .setName('trivia')
    .setDescription('Answer a multiple-choice question, with up to five refreshes'),

  async execute(interaction) {
    pruneExpired();

    const game = {
      id: crypto.randomUUID(),
      ownerId: interaction.user.id,
      question: randomQuestion(),
      result: null,
      answered: 0,
      correct: 0,
      refreshes: 0,
      createdAt: Date.now(),
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
        content: 'This trivia round belongs to someone else. Run `/trivia` to start your own.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action === 'answer') {
      if (game.result) {
        await interaction.reply({
          content: 'You already answered this question. Use the refresh button for a new one.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const choice = Number.parseInt(rawIndex, 10);
      if (!Number.isInteger(choice) || choice < 0 || choice >= game.question.options.length) {
        await interaction.reply({
          content: 'That answer is not valid. Run `/trivia` for a new question.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const correct = choice === game.question.answer;
      game.result = { choice, correct };
      game.answered += 1;
      if (correct) game.correct += 1;
      game.updatedAt = Date.now();

      await interaction.update(buildPayload(interaction.client, game));
      return;
    }

    if (action !== 'next') return;

    if (!game.result) {
      await interaction.reply({
        content: 'Answer this question before refreshing it. The answer buttons are still active.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (game.refreshes >= MAX_REFRESHES) {
      await interaction.reply({
        content: `This round has used all **${MAX_REFRESHES}** refreshes. Run \`/trivia\` to start a new round.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    game.question = randomQuestion(Math.random, [game.question.question]);
    game.result = null;
    game.refreshes += 1;
    game.updatedAt = Date.now();

    await interaction.update(buildPayload(interaction.client, game));
  },
};
