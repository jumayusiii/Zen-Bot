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
const { blackjackPayout } = require('../../lib/economyGames');
const { MAX_WAGER, creditCoins, settleWager } = require('../../lib/economy');

const GAME_TTL_MS = 15 * 60 * 1000;
const games = new Map();
const RESULT_LABELS = {
  win: '🏆 You win!',
  lose: '💥 You lose.',
  push: '🤝 Push.',
};

function coins(value) {
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString('en-US');
}

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

function createGame({ ownerId, guildId, bet = 0, balance = null }) {
  let game = {
    id: crypto.randomUUID(),
    ownerId,
    guildId,
    bet,
    balance,
    paid: false,
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

/**
 * Credits the payout once per finished hand. The paid flag is set before the
 * await so two quick button presses cannot pay the same hand twice.
 */
async function settleBet(game) {
  if (!game.bet || game.paid || game.status !== 'ended') return game;

  game.paid = true;
  try {
    const payout = blackjackPayout(game.result, game.bet);
    const credited = await creditCoins({
      guildId: game.guildId,
      userId: game.ownerId,
      amount: payout,
    });
    game.payout = payout;
    game.balance = credited.balance;
  } catch (error) {
    game.paid = false;
    throw error;
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

  const fields = [
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
  ];

  if (game.bet > 0) {
    fields.push(
      { name: '💰 Wager', value: `${coins(game.bet)} coins`, inline: true },
      {
        name: '🏆 Return',
        value: finished ? `${coins(game.payout)} coins` : 'Pending',
        inline: true,
      },
    );

    if (finished && game.balance != null) {
      fields.push({
        name: '👛 Balance',
        value: `${coins(game.balance)} coins`,
        inline: true,
      });
    }
  }

  const embed = createEmbed(client, {
    section: 'Economy',
    title: game.bet > 0 ? `Blackjack · ${coins(game.bet)} coin bet` : 'Blackjack',
    description: statusText(game),
    color: finished
      ? game.result === 'win'
        ? COLORS.success
        : game.result === 'push'
          ? COLORS.warning
          : COLORS.danger
      : COLORS.game,
    fields,
    footer: game.bet > 0
      ? 'Win pays 2× · push returns the stake · the bet is taken when the hand is dealt'
      : 'Play for fun  ·  add a bet to play for coins',
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
          .setLabel(game.bet > 0 ? `Play again · ${coins(game.bet)} coins` : 'Play again')
          .setEmoji('🔁')
          .setStyle(ButtonStyle.Success),
      ),
    );
  }

  return { embeds: [embed], components };
}

async function present(interaction, game, { update = false } = {}) {
  const settled = await settleBet(game);
  games.set(settled.id, settled);

  const payload = buildPayload(interaction.client, settled);
  if (update) await interaction.update(payload);
  else await interaction.reply(payload);
}

async function replyExpired(interaction) {
  await interaction.reply({
    content: 'This blackjack round has expired. Run `/blackjack` to start a new one.',
    flags: MessageFlags.Ephemeral,
  });
}

function stakeErrorReply(error) {
  if (error.code === 'insufficient') {
    return `You only have **${coins(error.balance)} coins**. Choose a smaller bet or play without one.`;
  }

  if (error.code === 'invalid_wager' || error.code === 'wager_too_large') {
    return error.message;
  }

  return null;
}

module.exports = {
  beta: true,

  data: new SlashCommandBuilder()
    .setName('blackjack')
    .setDescription('Play a hand of blackjack against the dealer, with an optional coin bet')
    .addIntegerOption((option) =>
      option
        .setName('bet')
        .setDescription(`Coins to wager (0–${MAX_WAGER.toLocaleString('en-US')}, leave empty to play for fun)`)
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(MAX_WAGER),
    ),

  async execute(interaction) {
    pruneExpired();

    const bet = interaction.options.getInteger('bet') ?? 0;
    const guildId = interaction.guild?.id ?? null;

    if (bet > 0 && !guildId) {
      await interaction.reply({
        content: 'Coins are tracked per server. Run `/blackjack` with a bet in a server channel.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let balance = null;

    if (bet > 0) {
      try {
        const charge = await settleWager({
          guildId,
          userId: interaction.user.id,
          wager: bet,
          payout: 0,
        });
        balance = charge.balance;
      } catch (error) {
        const message = stakeErrorReply(error);
        if (!message) throw error;

        await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
        return;
      }
    }

    const game = createGame({
      ownerId: interaction.user.id,
      guildId,
      bet,
      balance,
    });

    await present(interaction, game);
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
      let balance = game.balance;

      if (game.bet > 0) {
        try {
          const charge = await settleWager({
            guildId: game.guildId,
            userId: game.ownerId,
            wager: game.bet,
            payout: 0,
          });
          balance = charge.balance;
        } catch (error) {
          const message = stakeErrorReply(error);
          if (!message) throw error;

          await interaction.reply({ content: message, flags: MessageFlags.Ephemeral });
          return;
        }
      }

      const fresh = createGame({
        ownerId: game.ownerId,
        guildId: game.guildId,
        bet: game.bet,
        balance,
      });
      fresh.id = game.id;
      await present(interaction, fresh, { update: true });
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

      await present(interaction, updated, { update: true });
      return;
    }

    if (action !== 'stand') return;

    await present(interaction, settle(game), { update: true });
  },
};
