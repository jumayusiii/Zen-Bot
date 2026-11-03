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
const { getInteractionLanguage, t } = require('../../lib/i18n');

function symbolLabel(language, symbol) {
  return symbol
    ? t(language, `minigames.memory.symbolLabels.${symbol.id}`, {}, symbol.label)
    : null;
}

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

function buildPayload(client, game, language) {
  const watching = game.phase === 'watch';
  const over = game.phase === 'over';
  const sequence = sequenceEmojis(game.sequence).join('  ');
  let description;

  if (watching) {
    description = [
      t(language, 'minigames.memory.watch'),
      '',
      `## ${sequence}`,
    ].join('\n');
  } else if (over) {
    const chosen = symbolById(game.result?.chosen);
    const expected = symbolById(game.result?.expected);
    description = [
      t(language, 'minigames.memory.notQuite', {
        chosen: chosen
          ? `**${symbolLabel(language, chosen)}**`
          : t(language, 'minigames.memory.chosenFallback'),
        expected: expected
          ? symbolLabel(language, expected)
          : t(language, 'minigames.memory.expectedFallback'),
      }),
      t(language, 'minigames.memory.sequenceWas', { sequence }),
    ].join('\n');
  } else {
    description = [
      t(language, 'minigames.memory.repeat'),
      t(language, 'minigames.memory.repeatHint', {
        step: game.position + 1,
        total: game.sequence.length,
      }),
    ].join('\n');
  }

  const embed = createEmbed(client, {
    section: t(language, 'help.tabs.minigames'),
    title: over
      ? t(language, 'minigames.memory.overTitle')
      : t(language, 'minigames.memory.title', { round: game.round }),
    description,
    color: over ? COLORS.danger : watching ? COLORS.game : COLORS.info,
    fields: [
      { name: t(language, 'minigames.memory.round'), value: `**${game.round}**`, inline: true },
      { name: t(language, 'minigames.memory.score'), value: `**${game.score}**`, inline: true },
      {
        name: game.phase === 'input'
          ? t(language, 'minigames.memory.progress')
          : t(language, 'minigames.memory.sequence'),
        value: game.phase === 'input'
          ? `**${game.position}** / ${game.sequence.length}`
          : t(language, 'minigames.memory.symbols', { count: game.sequence.length }),
        inline: true,
      },
    ],
    footer: t(
      language,
      watching
        ? 'minigames.memory.footerWatch'
        : over
          ? 'minigames.memory.footerOver'
          : 'minigames.memory.footerPlay',
    ),
  });

  const components = [];

  if (watching) {
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`memory:ready:${game.id}`)
          .setLabel(t(language, 'minigames.memory.ready'))
          .setEmoji('👀')
          .setStyle(ButtonStyle.Primary),
      ),
    );
  } else if (over) {
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`memory:again:${game.id}`)
          .setLabel(t(language, 'minigames.memory.again'))
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
            .setLabel(symbolLabel(language, symbol))
            .setEmoji(symbol.emoji)
            .setStyle(ButtonStyle.Primary),
        ),
      ),
    );
  }

  return { embeds: [embed], components };
}

async function replyExpired(interaction, language) {
  await interaction.reply({
    content: t(language, 'minigames.memory.expired'),
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
    const language = await getInteractionLanguage(interaction);

    const game = createGame(interaction.user.id);
    games.set(game.id, game);

    await interaction.reply(buildPayload(interaction.client, game, language));
  },

  async handleComponent(interaction) {
    const [, action, gameId, rawSymbol] = interaction.customId.split(':');
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
        content: t(language, 'minigames.memory.owner'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action === 'again') {
      resetGame(game);
      await interaction.update(buildPayload(interaction.client, game, language));
      return;
    }

    if (action === 'ready') {
      if (game.phase !== 'watch') {
        await interaction.reply({
          content: t(language, 'minigames.memory.started'),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      game.phase = 'input';
      game.position = 0;
      game.updatedAt = Date.now();

      await interaction.update(buildPayload(interaction.client, game, language));
      return;
    }

    if (action !== 'press') return;

    if (game.phase !== 'input') {
      await interaction.reply({
        content: t(language, 'minigames.memory.watchFirst'),
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

      await interaction.update(buildPayload(interaction.client, game, language));
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
    await interaction.update(buildPayload(interaction.client, game, language));
  },
};
