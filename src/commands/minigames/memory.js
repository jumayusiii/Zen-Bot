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
  SYMBOLS,
  createSequence,
  extendSequence,
  isCorrectStep,
  sequenceEmojis,
  symbolById,
} = require('../../lib/memory');

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
    round: 1,
    score: 0,
    phase: 'watch',
    sequence: createSequence(),
    position: 0,
    result: null,
    updatedAt: Date.now(),
  };
}

function resetGame(game) {
  Object.assign(game, {
    round: 1,
    score: 0,
    phase: 'watch',
    sequence: createSequence(),
    position: 0,
    result: null,
    updatedAt: Date.now(),
  });
}

function buildPayload(client, game) {
  const watching = game.phase === 'watch';
  const over = game.phase === 'over';
  const sequence = sequenceEmojis(game.sequence).join('  ');
  let description;

  if (watching) {
    description = [
      'Watch the sequence, then press **I’m ready**.',
      '',
      `## ${sequence}`,
    ].join('\n');
  } else if (over) {
    const chosen = symbolById(game.result?.chosen);
    const expected = symbolById(game.result?.expected);
    description = [
      `❌ **Not quite.** ${chosen ? `**${chosen.label}**` : 'That press'} came when ${expected ? `**${expected.label}**` : 'another symbol'} was next.`,
      `The sequence was ${sequence}.`,
    ].join('\n');
  } else {
    description = [
      'Repeat the sequence from memory. Press the symbols in order.',
      `-# Step ${game.position + 1} of ${game.sequence.length}. The sequence is hidden.`,
    ].join('\n');
  }

  const embed = createEmbed(client, {
    section: 'Minigames',
    title: over ? 'Memory · game over' : `Memory · Round ${game.round}`,
    description,
    color: over ? COLORS.danger : watching ? COLORS.game : COLORS.info,
    fields: [
      { name: '🎯 Round', value: `**${game.round}**`, inline: true },
      { name: '⭐ Score', value: `**${game.score}**`, inline: true },
      {
        name: game.phase === 'input' ? '📶 Progress' : '🔗 Sequence',
        value: game.phase === 'input'
          ? `**${game.position}** / ${game.sequence.length}`
          : `**${game.sequence.length}** symbols`,
        inline: true,
      },
    ],
    footer: watching
      ? 'The sequence hides when you start'
      : over
        ? 'Press Play again for a fresh sequence'
        : 'Only the player who started this round can play',
  });

  const components = [];

  if (watching) {
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`memory:ready:${game.id}`)
          .setLabel('I’m ready')
          .setEmoji('👀')
          .setStyle(ButtonStyle.Primary),
      ),
    );
  } else if (over) {
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`memory:again:${game.id}`)
          .setLabel('Play again')
          .setEmoji('🔁')
          .setStyle(ButtonStyle.Primary),
      ),
    );
  } else {
    components.push(
      new ActionRowBuilder().addComponents(
        SYMBOLS.map((symbol) =>
          new ButtonBuilder()
            .setCustomId(`memory:press:${game.id}:${symbol.id}`)
            .setLabel(symbol.label)
            .setEmoji(symbol.emoji)
            .setStyle(ButtonStyle.Primary),
        ),
      ),
    );
  }

  return { embeds: [embed], components };
}

async function replyExpired(interaction) {
  await interaction.reply({
    content: 'This memory round has expired. Run `/memory` to start a new one.',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('memory')
    .setDescription('Watch a symbol sequence and repeat it from memory'),

  async execute(interaction) {
    pruneExpired();

    const game = createGame(interaction.user.id);
    games.set(game.id, game);

    await interaction.reply(buildPayload(interaction.client, game));
  },

  async handleComponent(interaction) {
    const [, action, gameId, rawSymbol] = interaction.customId.split(':');
    if (!gameId) return;

    pruneExpired();

    const game = games.get(gameId);
    if (!game) {
      await replyExpired(interaction);
      return;
    }

    if (game.ownerId !== interaction.user.id) {
      await interaction.reply({
        content: 'This memory round belongs to someone else. Run `/memory` to start your own.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action === 'again') {
      resetGame(game);
      await interaction.update(buildPayload(interaction.client, game));
      return;
    }

    if (action === 'ready') {
      if (game.phase !== 'watch') {
        await interaction.reply({
          content: 'This round has already started. Finish the sequence first.',
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      game.phase = 'input';
      game.position = 0;
      game.updatedAt = Date.now();

      await interaction.update(buildPayload(interaction.client, game));
      return;
    }

    if (action !== 'press') return;

    if (game.phase !== 'input') {
      await interaction.reply({
        content: 'Watch the sequence first, then press **I’m ready**.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!isCorrectStep(game.sequence, game.position, rawSymbol)) {
      game.phase = 'over';
      game.result = {
        expected: game.sequence[game.position],
        chosen: rawSymbol,
      };
      game.updatedAt = Date.now();

      await interaction.update(buildPayload(interaction.client, game));
      return;
    }

    game.position += 1;

    if (game.position >= game.sequence.length) {
      game.score += 1;
      game.round += 1;
      game.sequence = extendSequence(game.sequence);
      game.position = 0;
      game.phase = 'watch';
    }

    game.updatedAt = Date.now();
    await interaction.update(buildPayload(interaction.client, game));
  },
};
