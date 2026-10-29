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
  dealerPlay,
  drawCards,
  formatDealer,
  formatHand,
  handValue,
  outcome,
  startRound,
} = require('../../lib/blackjack');

const GAME_TTL_MS = 15 * 60 * 1000;
const games = new Map();
const RESULT_LABELS = {
  win: '🏆 You win!',
  lose: '💥 You lose.',
  push: '🤝 Push.',
};

function pruneExpired(now = Date.now()) {
  for (const [gameId, game] of games) {
    if (now - game.updatedAt > GAME_TTL_MS) games.delete(gameId);
  }
}

function settle(game, { playDealer = true } = {}) {
  let dealer = game.dealer;
  let deck = game.deck;

  if (playDealer) {
    const dealerTurn = dealerPlay(dealer, deck);
    dealer = dealerTurn.cards;
    deck = dealerTurn.deck;
  }

  return {
    ...game,
    dealer,
    deck,
    status: 'ended',
    result: outcome(game.player, dealer),
    updatedAt: Date.now(),
  };
}

function createGame(ownerId) {
  let game = {
    id: crypto.randomUUID(),
    ownerId,
    ...startRound(),
    status: 'playing',
    result: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  if (handValue(game.player).total === 21 || handValue(game.dealer).total === 21) {
    game = settle(game);
  }

  return game;
}

function statusText(game) {
  if (game.status !== 'ended') return 'Hit or stand? Closest to 21 without going over wins.';

  const player = handValue(game.player).total;
  const dealer = handValue(game.dealer).total;

  if (game.result === 'push') return '🤝 **Push.** Both hands finish on the same total.';
  if (game.result === 'win') {
    return dealer > 21
      ? '🏆 **You win!** The dealer went over 21.'
      : `🏆 **You win!** **${player}** beats **${dealer}**.`;
  }

  return player > 21
    ? '💥 **Bust.** You went over 21.'
    : `💥 **You lose.** The dealer's **${dealer}** beats **${player}**.`;
}

function buildPayload(client, game) {
  const finished = game.status === 'ended';
  const player = handValue(game.player);
  const dealer = handValue(game.dealer);

  const embed = createEmbed(client, {
    section: 'Minigames',
    title: 'Blackjack',
    description: statusText(game),
    color: finished
      ? game.result === 'win'
        ? COLORS.success
        : game.result === 'push'
          ? COLORS.warning
          : COLORS.danger
      : COLORS.game,
    fields: [
      {
        name: 'Your hand',
        value: `${formatHand(game.player)}  ·  **${player.total}**`,
        inline: false,
      },
      {
        name: 'Dealer',
        value: finished
          ? `${formatHand(game.dealer)}  ·  **${dealer.total}**`
          : `${formatDealer(game.dealer)}  ·  **?**`,
        inline: false,
      },
      {
        name: 'Result',
        value: finished ? RESULT_LABELS[game.result] : 'In progress',
        inline: true,
      },
    ],
    footer: finished
      ? 'Round finished  ·  press Play again for a new hand'
      : 'Only the player who started this round can move',
  });

  const components = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`blackjack:hit:${game.id}`)
        .setLabel('Hit')
        .setEmoji('🃏')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(finished),
      new ButtonBuilder()
        .setCustomId(`blackjack:stand:${game.id}`)
        .setLabel('Stand')
        .setEmoji('✋')
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(finished),
    ),
  ];

  if (finished) {
    components.push(
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`blackjack:again:${game.id}`)
          .setLabel('Play again')
          .setEmoji('🔁')
          .setStyle(ButtonStyle.Success),
      ),
    );
  }

  return { embeds: [embed], components };
}

async function replyExpired(interaction) {
  await interaction.reply({
    content: 'This blackjack round has expired. Run `/blackjack` to start a new one.',
    flags: MessageFlags.Ephemeral,
  });
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Play a hand of blackjack against the dealer'),

  async execute(interaction) {
    pruneExpired();

    const game = createGame(interaction.user.id);
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
        content: 'This blackjack hand belongs to someone else. Run `/blackjack` to start your own.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action === 'again') {
      const fresh = createGame(game.ownerId);
      fresh.id = game.id;
      games.set(game.id, fresh);
      await interaction.update(buildPayload(interaction.client, fresh));
      return;
    }

    if (game.status === 'ended') {
      await interaction.reply({
        content: 'This hand is already over. Press **Play again** for a new one.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (action === 'hit') {
      const draw = drawCards(game.deck, 1);
      const player = [...game.player, ...draw.cards];
      const total = handValue(player).total;
      let updated = { ...game, player, deck: draw.deck, updatedAt: Date.now() };

      if (total >= 21) {
        updated = settle(updated, { playDealer: total <= 21 });
      }

      games.set(game.id, updated);
      await interaction.update(buildPayload(interaction.client, updated));
      return;
    }

    if (action !== 'stand') return;

    const updated = settle(game);
    games.set(game.id, updated);
    await interaction.update(buildPayload(interaction.client, updated));
  },
};
