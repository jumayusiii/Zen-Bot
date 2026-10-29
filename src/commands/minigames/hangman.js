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

const GAME_TTL_MS = 15 * 60 * 1000;
const games = new Map();

function pruneExpired(now = Date.now()) {
  for (const [gameId, game] of games) {
    if (now - game.updatedAt > GAME_TTL_MS) games.delete(gameId);
  }
}

function buildPayload(client, game) {
  const status = statusOf(game);
  const wrong = wrongLetters(game);
  const won = status === 'won';
  const lost = status === 'lost';
  const finished = won || lost;

  const description = finished
    ? [
        `\`\`\`\n${hangmanArt(wrong.length)}\n\`\`\``,
        won
          ? `🎉 **Solved!** The word was **${game.word}**.`
          : `💀 **Out of guesses.** The word was **${game.word}**.`,
      ].join('\n')
    : [
        `\`\`\`\n${hangmanArt(wrong.length)}\n\`\`\``,
        `\`${maskWord(game)}\``,
        'Pick a letter below to guess the word.',
      ].join('\n');

  const embed = createEmbed(client, {
    section: 'Minigames',
    title: 'Hangman',
    description,
    color: won ? COLORS.success : lost ? COLORS.danger : COLORS.game,
    fields: [
      { name: 'Category', value: game.category, inline: true },
      {
        name: 'Wrong letters',
        value: wrong.length > 0 ? wrong.join(' ') : 'None yet',
        inline: true,
      },
      {
        name: 'Guesses left',
        value: `${guessesLeft(game)} / ${MAX_WRONG}`,
        inline: true,
      },
    ],
    footer: finished
      ? 'Round finished  ·  press Play again for a new word'
      : 'Only the player who started this round can guess',
  });

  const components = [];

  if (!finished) {
    const groups = [
      { id: 'first', start: 0, end: 13, label: 'Letters A–M' },
      { id: 'second', start: 13, end: 26, label: 'Letters N–Z' },
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
                  .setDescription(`Guess ${letter}`),
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
    content: 'This hangman round has expired. Run `/hangman` to start a new one.',
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

    const game = {
      id: crypto.randomUUID(),
      ownerId: interaction.user.id,
      ...createHangman(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    games.set(game.id, game);
    await interaction.reply(buildPayload(interaction.client, game));
  },

  async handleComponent(interaction) {
    const [, action, gameId] = interaction.customId.split(':');
    if (!gameId) return;

    pruneExpired();

    const game = games.get(gameId);
    if (!game) {
      await replyExpired(interaction);
      return;
    }

    if (game.ownerId !== interaction.user.id) {
      await interaction.reply({
        content: 'This hangman round belongs to someone else. Run `/hangman` to start your own.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action === 'again') {
      const fresh = {
        id: game.id,
        ownerId: game.ownerId,
        ...createHangman(Math.random, game.word),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      games.set(game.id, fresh);
      await interaction.update(buildPayload(interaction.client, fresh));
      return;
    }

    if (action !== 'letter') return;

    if (statusOf(game) !== 'playing') {
      await interaction.reply({
        content: 'This round is already over. Press **Play again** for a new word.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const next = applyGuess(game, interaction.values?.[0]);
    if (!next) {
      await interaction.reply({
        content: 'That letter was already guessed. Pick another one.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const updated = { ...next, id: game.id, ownerId: game.ownerId, updatedAt: Date.now() };
    games.set(game.id, updated);

    await interaction.update(buildPayload(interaction.client, updated));
  },
};
