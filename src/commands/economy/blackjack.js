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
const { getInteractionLanguage, t } = require('../../lib/i18n');

const GAME_TTL_MS = 15 * 60 * 1000;
const games = new Map();

function coins(value, language = 'en') {
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString(locale);
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

function createGame({ ownerId, guildId, bet = 0, balance = null, language = 'en' }) {
  let game = {
    id: crypto.randomUUID(),
    ownerId,
    guildId,
    bet,
    balance,
    language,
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
  const language = game.language;

  if (game.status !== 'ended') return t(language, 'economy.blackjack.status.hitOrStand');

  const player = handValue(game.player).total;
  const dealer = handValue(game.dealer).total;

  if (game.result === 'push') return t(language, 'economy.blackjack.status.push');
  if (game.result === 'win') {
    return dealer > 21
      ? t(language, 'economy.blackjack.status.winDealerBust')
      : t(language, 'economy.blackjack.status.win', { player, dealer });
  }

  return player > 21
    ? t(language, 'economy.blackjack.status.bust')
    : t(language, 'economy.blackjack.status.lose', { player, dealer });
}

function buildPayload(client, game) {
  const language = game.language;
  const finished = game.status === 'ended';
  const player = handValue(game.player);
  const dealer = handValue(game.dealer);

  const fields = [
    {
      name: t(language, 'economy.blackjack.fields.hand'),
      value: `${formatHand(game.player)}  ·  **${player.total}**`,
      inline: false,
    },
    {
      name: t(language, 'economy.blackjack.fields.dealer'),
      value: finished
        ? `${formatHand(game.dealer)}  ·  **${dealer.total}**`
        : `${formatDealer(game.dealer)}  ·  **?**`,
      inline: false,
    },
    {
      name: t(language, 'economy.blackjack.fields.result'),
      value: finished
        ? t(language, `economy.blackjack.results.${game.result}`)
        : t(language, 'economy.inProgress'),
      inline: true,
    },
  ];

  if (game.bet > 0) {
    fields.push(
      {
        name: `💰 ${t(language, 'economy.wager')}`,
        value: `${coins(game.bet, language)} ${t(language, 'common.coins')}`,
        inline: true,
      },
      {
        name: `🏆 ${t(language, 'economy.return')}`,
        value: finished
          ? `${coins(game.payout, language)} ${t(language, 'common.coins')}`
          : t(language, 'economy.pending'),
        inline: true,
      },
    );

    if (finished && game.balance != null) {
      fields.push({
        name: `👛 ${t(language, 'economy.balance')}`,
        value: `${coins(game.balance, language)} ${t(language, 'common.coins')}`,
        inline: true,
      });
    }
  }

  const embed = createEmbed(client, {
    section: t(language, 'help.tabs.economy'),
    title: game.bet > 0
      ? t(language, 'economy.blackjack.betTitle', { coins: coins(game.bet, language) })
      : t(language, 'economy.blackjack.title'),
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
      ? t(language, 'economy.blackjack.footer.bet')
      : t(language, 'economy.blackjack.footer.fun'),
  });

  const components = [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`blackjack:hit:${game.id}`)
        .setLabel(t(language, 'economy.blackjack.buttons.hit'))
        .setEmoji('🃏')
        .setStyle(ButtonStyle.Primary)
        .setDisabled(finished),
      new ButtonBuilder()
        .setCustomId(`blackjack:stand:${game.id}`)
        .setLabel(t(language, 'economy.blackjack.buttons.stand'))
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
          .setLabel(
            game.bet > 0
              ? t(language, 'economy.blackjack.buttons.againBet', {
                coins: coins(game.bet, language),
              })
              : t(language, 'economy.blackjack.buttons.again'),
          )
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

async function replyExpired(interaction, language) {
  await interaction.reply({
    content: t(language, 'economy.blackjack.errors.expired'),
    flags: MessageFlags.Ephemeral,
  });
}

function stakeErrorReply(error, language) {
  if (error.code === 'insufficient') {
    return t(language, 'economy.blackjack.errors.insufficient', {
      balance: coins(error.balance, language),
    });
  }

  if (error.code === 'invalid_wager') {
    return t(language, 'economy.coinbet.invalidWager');
  }

  if (error.code === 'wager_too_large') {
    return t(language, 'economy.coinbet.tooLarge', { max: coins(MAX_WAGER, language) });
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
    const language = await getInteractionLanguage(interaction);

    if (bet > 0 && !guildId) {
      await interaction.reply({
        content: t(language, 'economy.blackjack.errors.guildOnly'),
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
        const message = stakeErrorReply(error, language);
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
      language,
    });

    await present(interaction, game);
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

    game.language = language;

    if (game.ownerId !== interaction.user.id) {
      await interaction.reply({
        content: t(language, 'economy.blackjack.errors.wrongOwner'),
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
          const message = stakeErrorReply(error, language);
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
        language,
      });
      fresh.id = game.id;
      await present(interaction, fresh, { update: true });
      return;
    }

    if (game.status === 'ended') {
      await interaction.reply({
        content: t(language, 'economy.blackjack.errors.ended'),
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
