const { evaluateSpin, spinSlots } = require('./slots');

const COINFLIP_MULTIPLIER = 1.9;
const BLACKJACK_WIN_MULTIPLIER = 2;
const BLACKJACK_PUSH_MULTIPLIER = 1;
const SLOTS_PAIR_MULTIPLIER = 1.5;
const SLOTS_TRIPLE_MULTIPLIERS = Object.freeze({
  Cherry: 4,
  Lemon: 3,
  Bell: 7,
  Star: 10,
  Diamond: 15,
  Seven: 30,
});

function flipCoin(random = Math.random) {
  return random() < 0.5 ? 'heads' : 'tails';
}

/**
 * Resolves a coin-flip wager. A win returns 1.9× the stake, including the
 * original stake; a loss returns nothing.
 *
 * @param {{side: 'heads'|'tails', wager: number, random?: () => number}} input
 * @returns {{result: 'heads'|'tails', won: boolean, payout: number}}
 */
function resolveCoinBet({ side, wager, random = Math.random }) {
  const result = flipCoin(random);
  const won = result === side;
  return {
    result,
    won,
    payout: won ? Math.floor(Math.max(0, Number(wager) || 0) * COINFLIP_MULTIPLIER) : 0,
  };
}

/**
 * Spins the economy slot machine and maps the visual result to a payout.
 * Three matching symbols pay their symbol multiplier; any pair pays 1.5×.
 *
 * @param {{wager: number, random?: () => number, spin?: () => object[]}} input
 * @returns {{reels: object[], outcome: object, multiplier: number, payout: number}}
 */
function resolveSlotsBet({ wager, random = Math.random, spin = spinSlots }) {
  const reels = spin(random);
  const outcome = evaluateSpin(reels);
  let multiplier = 0;

  if (outcome.matches === 3) {
    multiplier = SLOTS_TRIPLE_MULTIPLIERS[reels[0]?.name] ?? 10;
  } else if (outcome.matches === 2) {
    multiplier = SLOTS_PAIR_MULTIPLIER;
  }

  return {
    reels,
    outcome,
    multiplier,
    payout: Math.floor(Math.max(0, Number(wager) || 0) * multiplier),
  };
}

/**
 * Maps a finished blackjack hand to its gross payout. The stake is taken when
 * the hand is dealt, so a win returns twice the stake (stake plus winnings),
 * a push returns the stake and a loss returns nothing.
 *
 * @param {'win'|'lose'|'push'} result
 * @param {number} bet
 * @returns {number}
 */
function blackjackPayout(result, bet) {
  const stake = Math.max(0, Math.floor(Number(bet) || 0));
  if (stake === 0) return 0;
  if (result === 'win') return stake * BLACKJACK_WIN_MULTIPLIER;
  if (result === 'push') return stake * BLACKJACK_PUSH_MULTIPLIER;
  return 0;
}

module.exports = {
  BLACKJACK_PUSH_MULTIPLIER,
  BLACKJACK_WIN_MULTIPLIER,
  COINFLIP_MULTIPLIER,
  SLOTS_PAIR_MULTIPLIER,
  SLOTS_TRIPLE_MULTIPLIERS,
  blackjackPayout,
  resolveCoinBet,
  resolveSlotsBet,
};
