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
const { getInteractionLanguage, t } = require('../../lib/i18n');

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

function controlRow(game, enabled, language) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`reaction:press:${game.id}`)
      .setLabel(
        enabled
          ? t(language, 'minigames.reaction.goTitle')
          : t(language, 'minigames.reaction.waitButton'),
      )
      .setEmoji(enabled ? '⚡' : '⏳')
      .setStyle(enabled ? ButtonStyle.Success : ButtonStyle.Secondary)
      .setDisabled(!enabled),
  );
}

function waitEmbed(client, language) {
  return createEmbed(client, {
    section: t(language, 'help.tabs.minigames'),
    title: t(language, 'minigames.reaction.title'),
    description: t(language, 'minigames.reaction.wait'),
    color: COLORS.game,
    footer: t(language, 'minigames.reaction.waitFooter'),
  });
}

function readyEmbed(client, language) {
  return createEmbed(client, {
    section: t(language, 'help.tabs.minigames'),
    title: t(language, 'minigames.reaction.goTitle'),
    description: t(language, 'minigames.reaction.go'),
    color: COLORS.success,
    footer: t(language, 'minigames.reaction.goFooter'),
  });
}

function resultEmbed(client, milliseconds, language) {
  const rating = rateReaction(milliseconds, language);

  return createEmbed(client, {
    section: t(language, 'help.tabs.minigames'),
    title: t(language, 'minigames.reaction.resultTitle'),
    description: t(language, 'minigames.reaction.result', {
      ms: milliseconds,
      emoji: rating.emoji,
      label: rating.label,
    }),
    color: milliseconds < 400 ? COLORS.success : COLORS.warning,
    footer: t(language, 'minigames.reaction.footer'),
  });
}

async function beginRound(interaction, language) {
  const game = {
    id: crypto.randomUUID(),
    ownerId: interaction.user.id,
    readyAt: null,
    updatedAt: Date.now(),
    timer: null,
  };

  games.set(game.id, game);

  const message = await interaction.reply({
    embeds: [waitEmbed(interaction.client, language)],
    components: [controlRow(game, false, language)],
    fetchReply: true,
  });

  const delay = 2000 + Math.floor(Math.random() * 3000);

  game.timer = setTimeout(async () => {
    if (!games.has(game.id)) return;

    game.readyAt = Date.now();
    game.updatedAt = Date.now();

    try {
      await message.edit({
        embeds: [readyEmbed(interaction.client, language)],
        components: [controlRow(game, true, language)],
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
    const language = await getInteractionLanguage(interaction);
    await beginRound(interaction, language);
  },

  async handleComponent(interaction) {
    const [, action, gameId] = interaction.customId.split(':');
    if (action !== 'press' || !gameId) return;

    pruneExpired();
    const language = await getInteractionLanguage(interaction);

    const game = games.get(gameId);

    if (!game) {
      await interaction.reply({
        content: t(language, 'minigames.reaction.expired'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (game.ownerId !== interaction.user.id) {
      await interaction.reply({
        content: t(language, 'minigames.reaction.owner'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (!game.readyAt) {
      await interaction.reply({
        content: t(language, 'minigames.reaction.notReady'),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (game.timer) clearTimeout(game.timer);
    games.delete(gameId);

    const elapsed = Math.max(0, Date.now() - game.readyAt);

    await interaction.update({
      embeds: [resultEmbed(interaction.client, elapsed, language)],
      components: [],
    });
  },
};
