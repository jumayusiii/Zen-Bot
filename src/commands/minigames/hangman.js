const crypto = require('node:crypto');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const {
  MAX_WRONG,
  applyGuess,
  createHangman,
  guessesLeft,
  hangmanArt,
  maskWord,
  statusOf,
  unusedLetters,
  wrongLetters,
} = require('../../lib/hangman');
const { getInteractionLanguage, t } = require('../../lib/i18n');

const GAME_TTL_MS = 15 * 60 * 1000;
const games = new Map();

function pruneExpired(now = Date.now()) {
  for (const [gameId, game] of games) {
    if (now - game.updatedAt > GAME_TTL_MS) games.delete(gameId);
  }
}

function buildPayload(client, game, language) {
  const status = statusOf(game);
  const wrong = wrongLetters(game);
  const won = status === 'won';
  const lost = status === 'lost';
  const finished = won || lost;

  const description = finished
    ? [
        `\`\`\`\n${hangmanArt(wrong.length)}\n\`\`\``,
        t(language, won ? 'minigames.hangman.solved' : 'minigames.hangman.lost', { word: game.word }),
      ].join('\n')
    : [
        `\`\`\`\n${hangmanArt(wrong.length)}\n\`\`\``,
        `\`${maskWord(game)}\``,
        t(language, 'minigames.hangman.prompt'),
      ].join('\n');

  const embed = createEmbed(client, {
    section: t(language, 'help.tabs.minigames'),
    title: t(language, 'minigames.hangman.title'),
    description,
    color: won ? COLORS.success : lost ? COLORS.danger : COLORS.game,
    fields: [
      { name: t(language, 'minigames.hangman.category'), value: game.category, inline: true },
      {
        name: t(language, 'minigames.hangman.wrong'),
        value: wrong.length > 0 ? wrong.join(' ') : t(language, 'minigames.hangman.noneYet'),
        inline: true,
      },
      {
        name: t(language, 'minigames.hangman.guesses'),
        value: `${guessesLeft(game)} / ${MAX_WRONG}`,
        inline: true,
      },
    ],
    footer: t(language, finished ? 'minigames.hangman.footerDone' : 'minigames.hangman.footerActive'),
  });

  const components = [];

  if (!finished) {
    const groups = [
      { id: 'first', start: 0, end: 13, label: t(language, 'minigames.hangman.lettersAM') },
      { id: 'second', start: 13, end: 26, label: t(language, 'minigames.hangman.lettersNZ') },
    ];

    for (const group of groups) {
      const letters = unusedLetters(game, group.start, group.end);
      if (letters.length === 0) continue;

      components.push(
        new ActionRowBuilder().addComponents(
          new StringSelectMenuBuilder()
            .setCustomId(`hangman:letter:${game.id}:${group.id}`)
            .setPlaceholder(group.label)
            .addOptions(
              letters.map((letter) =>
                new StringSelectMenuOptionBuilder()
                  .setLabel(letter)
                  .setValue(letter)
                  .setDescription(t(language, 'minigames.hangman.guessLetter', { letter })),
              ),
            ),
        ),
      );
    }
  }

  if (finished) {
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`hangman:again:${game.id}`)
          .setLabel(t(language, 'minigames.hangman.playAgain'))
          .setEmoji('🔁')
          .setStyle(ButtonStyle.Primary),
      ),
    );
  }

  return { embeds: [embed], components };
}

async function replyExpired(interaction, language) {
  await interaction.reply({
    content: t(language, 'minigames.hangman.expired'),
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('hangman')
    .setDescription('Guess the hidden word one letter at a time'),

  async execute(interaction) {
    pruneExpired();
    const language = await getInteractionLanguage(interaction);

    const game = {
      id: crypto.randomUUID(),
      ownerId: interaction.user.id,
      ...createHangman(Math.random, null, language),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    games.set(game.id, game);
    await interaction.reply(buildPayload(interaction.client, game, language));
  },

  async handleComponent(interaction) {
    const [, action, gameId] = interaction.customId.split(':');
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
        content: t(language, 'minigames.hangman.owner'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action === 'again') {
      const fresh = {
        id: game.id,
        ownerId: game.ownerId,
        ...createHangman(Math.random, game.word, language),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      games.set(game.id, fresh);
      await interaction.update(buildPayload(interaction.client, fresh, language));
      return;
    }

    if (action !== 'letter') return;

    if (statusOf(game) !== 'playing') {
      await interaction.reply({
        content: t(language, 'minigames.hangman.alreadyOver'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const next = applyGuess(game, interaction.values?.[0]);
    if (!next) {
      await interaction.reply({
        content: t(language, 'minigames.hangman.alreadyGuessed'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const updated = { ...next, id: game.id, ownerId: game.ownerId, updatedAt: Date.now() };
    games.set(game.id, updated);

    await interaction.update(buildPayload(interaction.client, updated, language));
  },
};
