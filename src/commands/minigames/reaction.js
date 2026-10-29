const crypto = require('node:crypto');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
  SlashCommandBuilder,
} = require('discord.js');
const { COLORS, createEmbed } = require('../../lib/embeds');
const { rateReaction } = require('../../lib/reaction');

const GAME_TTL_MS = 10 * 60 * 1000;
const games = new Map();

function pruneExpired(now = Date.now()) {
  for (const [gameId, game] of games) {
    if (now - game.updatedAt > GAME_TTL_MS) {
      if (game.timer) clearTimeout(game.timer);
      games.delete(gameId);
    }
  }
}

function controlRow(game, enabled) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`reaction:press:${game.id}`)
      .setLabel(enabled ? 'Click!' : 'Wait…')
      .setEmoji(enabled ? '⚡' : '⏳')
      .setStyle(enabled ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!enabled),
  );
}

function waitEmbed(client) {
  return createEmbed(client, {
    section: 'Minigames',
    title: 'Reaction test',
    description: 'Wait for the button to turn green, then click it as fast as you can.',
    color: COLORS.game,
    footer: 'The button unlocks in a moment',
  });
}

function readyEmbed(client) {
  return createEmbed(client, {
    section: 'Minigames',
    title: 'GO!',
    description: 'Click the button now!',
    color: COLORS.success,
    footer: 'Fastest click wins',
  });
}

function resultEmbed(client, milliseconds) {
  const rating = rateReaction(milliseconds);

  return createEmbed(client, {
    section: 'Minigames',
    title: 'Reaction result',
    description: `You clicked in **${milliseconds} ms**.\n-# ${rating.emoji} ${rating.label}`,
    color: milliseconds < 400 ? COLORS.success : COLORS.warning,
    footer: 'Run /reaction to try again',
  });
}

async function beginRound(interaction) {
  const game = {
    id: crypto.randomUUID(),
    ownerId: interaction.user.id,
    readyAt: null,
    updatedAt: Date.now(),
    timer: null,
  };

  games.set(game.id, game);

  const message = await interaction.reply({
    embeds: [waitEmbed(interaction.client)],
    components: [controlRow(game, false)],
    fetchReply: true,
  });

  const delay = 2000 + Math.floor(Math.random() * 3000);

  game.timer = setTimeout(async () => {
    if (!games.has(game.id)) return;

    game.readyAt = Date.now();
    game.updatedAt = Date.now();

    try {
      await message.edit({
        embeds: [readyEmbed(interaction.client)],
        components: [controlRow(game, true)],
      });
    } catch (error) {
      games.delete(game.id);
      console.warn(`[reaction] Could not unlock the button: ${error.message}`);
    }
  }, delay);

  game.timer.unref?.();
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('reaction')
    .setDescription('Test your reaction time against a button'),

  async execute(interaction) {
    pruneExpired();
    await beginRound(interaction);
  },

  async handleComponent(interaction) {
    const [, action, gameId] = interaction.customId.split(':');
    if (action !== 'press' || !gameId) return;

    pruneExpired();

    const game = games.get(gameId);

    if (!game) {
      await interaction.reply({
        content: 'This reaction test expired. Run `/reaction` to start a new one.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (game.ownerId !== interaction.user.id) {
      await interaction.reply({
        content: 'This reaction test belongs to someone else. Run `/reaction` to start your own.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!game.readyAt) {
      await interaction.reply({
        content: 'The button is not ready yet. Wait for it to turn green.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (game.timer) clearTimeout(game.timer);
    games.delete(gameId);

    const elapsed = Math.max(0, Date.now() - game.readyAt);

    await interaction.update({
      embeds: [resultEmbed(interaction.client, elapsed)],
      components: [],
    });
  },
};
