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
const { getInteractionLanguage, t } = require('../../lib/i18n');

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

function buildPayload(client, game, language) {
  const { question } = game;
  const answered = game.result !== null;
  const answer = `${LETTERS[question.answer]}. ${question.options[question.answer]}`;

  let description;
  if (!answered) {
    description = [
      t(language, 'minigames.trivia.choose'),
      t(
        language,
        MAX_REFRESHES - game.refreshes === 1
          ? 'minigames.trivia.refreshLeftOne'
          : 'minigames.trivia.refreshLeft',
        {
          category: question.category,
          count: MAX_REFRESHES - game.refreshes,
        },
      ),
    ].join('\n');
  } else if (game.result.correct) {
    description = [t(language, 'minigames.trivia.correct'), `-# ${question.category}`].join('\n');
  } else {
    const chosen = `${LETTERS[game.result.choice]}. ${question.options[game.result.choice]}`;
    description = [
      t(language, 'minigames.trivia.wrong', { chosen }),
      t(language, 'minigames.trivia.answerIs', { answer }),
      `-# ${question.category}`,
    ].join('\n');
  }

  const embed = createEmbed(client, {
    section: t(language, 'help.tabs.minigames'),
    title: truncate(question.question, 240),
    description,
    color: answered ? (game.result.correct ? COLORS.success : COLORS.danger) : COLORS.game,
    fields: [
      {
        name: t(language, 'minigames.trivia.choices'),
        value: question.options.map((option, index) => `**${LETTERS[index]}.** ${option}`).join('\n'),
        inline: false,
      },
      {
        name: t(language, 'minigames.trivia.score'),
        value: t(language, 'minigames.trivia.scoreValue', {
          correct: game.correct,
          answered: game.answered,
        }),
        inline: true,
      },
      {
        name: t(language, 'minigames.trivia.refreshes'),
        value: t(language, 'minigames.trivia.refreshesValue', {
          remaining: MAX_REFRESHES - game.refreshes,
          max: MAX_REFRESHES,
        }),
        inline: true,
      },
    ],
    footer: t(
      language,
      answered ? 'minigames.trivia.footerAnswer' : 'minigames.trivia.footerChoose',
    ),
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
          .setLabel(
            remaining > 0
              ? t(language, 'minigames.trivia.nextLeft', { count: remaining })
              : t(language, 'minigames.trivia.limit'),
          )
          .setEmoji('🔁')
          .setStyle(remaining > 0 ? ButtonStyle.Success : ButtonStyle.Secondary)
          .setDisabled(remaining === 0),
      ),
    );
  }

  return { embeds: [embed], components };
}

async function replyExpired(interaction, language) {
  await interaction.reply({
    content: t(language, 'minigames.trivia.expired'),
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
    const language = await getInteractionLanguage(interaction);

    const game = {
      id: crypto.randomUUID(),
      ownerId: interaction.user.id,
      question: randomQuestion(Math.random, [], language),
      result: null,
      answered: 0,
      correct: 0,
      refreshes: 0,
      createdAt: Date.now(),
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
        content: t(language, 'minigames.trivia.owner'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action === 'answer') {
      if (game.result) {
        await interaction.reply({
          content: t(language, 'minigames.trivia.already'),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const choice = Number.parseInt(rawIndex, 10);
      if (!Number.isInteger(choice) || choice < 0 || choice >= game.question.options.length) {
        await interaction.reply({
          content: t(language, 'minigames.trivia.invalid'),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const correct = choice === game.question.answer;
      game.result = { choice, correct };
      game.answered += 1;
      if (correct) game.correct += 1;
      game.updatedAt = Date.now();

      await interaction.update(buildPayload(interaction.client, game, language));
      return;
    }

    if (action !== 'next') return;

    if (!game.result) {
      await interaction.reply({
        content: t(language, 'minigames.trivia.answerFirst'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (game.refreshes >= MAX_REFRESHES) {
      await interaction.reply({
        content: t(language, 'minigames.trivia.allRefreshes', { count: MAX_REFRESHES }),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    game.question = randomQuestion(
      Math.random,
      [game.question.question],
      language,
    );
    game.result = null;
    game.refreshes += 1;
    game.updatedAt = Date.now();

    await interaction.update(buildPayload(interaction.client, game, language));
  },
};
