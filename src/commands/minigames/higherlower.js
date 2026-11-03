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
  MAX,
  MAX_ROUNDS,
  MIN,
  drawNext,
  drawStartingNumber,
  judgeGuess,
} = require('../../lib/higherlower');
const { getInteractionLanguage, t } = require('../../lib/i18n');

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
    current: drawStartingNumber(),
    round: 1,
    streak: 0,
    over: false,
    result: null,
    updatedAt: Date.now(),
  };
}

function buildPayload(client, game, language) {
  const shownRound = Math.min(game.round, MAX_ROUNDS);
  let title = t(language, 'minigames.higherlower.title');
  let description;
  let color = COLORS.game;

  if (!game.over) {
    description = [
      t(language, 'minigames.higherlower.question', { number: game.current }),
      t(language, 'minigames.higherlower.hint'),
    ].join('\n');
  } else if (game.result?.correct) {
    title = t(language, 'minigames.higherlower.perfectTitle');
    color = COLORS.success;
    description = t(language, 'minigames.higherlower.perfect', {
      rounds: MAX_ROUNDS,
      streak: game.streak,
    });
  } else {
    title = t(language, 'minigames.higherlower.overTitle');
    color = COLORS.danger;
    description = t(language, 'minigames.higherlower.over', {
      number: game.result?.next ?? '—',
      streak: game.streak,
      round: shownRound,
    });
  }

  const embed = createEmbed(client, {
    section: t(language, 'help.tabs.minigames'),
    title,
    description,
    color,
    fields: [
      { name: t(language, 'minigames.higherlower.streak'), value: `**${game.streak}**`, inline: true },
      { name: t(language, 'minigames.higherlower.round'), value: `**${shownRound}** / ${MAX_ROUNDS}`, inline: true },
      { name: t(language, 'minigames.higherlower.range'), value: `${MIN}–${MAX}`, inline: true },
    ],
    footer: t(
      language,
      game.over ? 'minigames.higherlower.footerDone' : 'minigames.higherlower.footer',
      { rounds: MAX_ROUNDS },
    ),
  });

  const guessButtons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`higherlower:guess:${game.id}:higher`)
      .setLabel(t(language, 'minigames.higherlower.higher'))
      .setEmoji('⬆️')
      .setStyle(ButtonStyle.Success)
      .setDisabled(game.over),
    new ButtonBuilder()
      .setCustomId(`higherlower:guess:${game.id}:lower`)
      .setLabel(t(language, 'minigames.higherlower.lower'))
      .setEmoji('⬇️')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(game.over),
  );

  const components = [guessButtons];

  if (game.over) {
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`higherlower:again:${game.id}`)
          .setLabel(t(language, 'minigames.higherlower.playAgain'))
          .setEmoji('🔁')
          .setStyle(ButtonStyle.Primary),
      ),
    );
  }

  return { embeds: [embed], components };
}

async function replyExpired(interaction, language) {
  await interaction.reply({
    content: t(language, 'minigames.higherlower.expired'),
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  beta: true,
  MAX_ROUNDS,

  data: new SlashCommandBuilder()
    .setName('higherlower')
    .setDescription('Guess whether the next number is higher or lower'),

  async execute(interaction) {
    pruneExpired();
    const language = await getInteractionLanguage(interaction);

    const game = createGame(interaction.user.id);
    games.set(game.id, game);

    await interaction.reply(buildPayload(interaction.client, game, language));
  },

  async handleComponent(interaction) {
    const [, action, gameId, rawGuess] = interaction.customId.split(':');
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
        content: t(language, 'minigames.higherlower.owner'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action === 'again') {
      if (!game.over) {
        await interaction.reply({
          content: t(language, 'minigames.higherlower.finishFirst'),
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      Object.assign(game, {
        current: drawStartingNumber(),
        round: 1,
        streak: 0,
        over: false,
        result: null,
        updatedAt: Date.now(),
      });

      await interaction.update(buildPayload(interaction.client, game, language));
      return;
    }

    if (action !== 'guess') return;

    if (game.over) {
      await interaction.reply({
        content: t(language, 'minigames.higherlower.overPress'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const guess = rawGuess === 'higher' || rawGuess === 'lower' ? rawGuess : null;
    if (!guess) {
      await interaction.reply({
        content: t(language, 'minigames.higherlower.invalid'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const next = drawNext(game.current);
    const correct = judgeGuess(game.current, next, guess);
    game.result = { guess, next, correct };

    if (correct) {
      game.streak += 1;
      game.current = next;

      if (game.round >= MAX_ROUNDS) game.over = true;
      else game.round += 1;
    } else {
      game.over = true;
    }

    game.updatedAt = Date.now();

    await interaction.update(buildPayload(interaction.client, game, language));
  },
};
