const { evaluateSpin, spinSlots } = require('./slots');

const COINFLIP_MULTIPLIER = 1.9;
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

module.exports = {
  COINFLIP_MULTIPLIER,
  SLOTS_PAIR_MULTIPLIER,
  SLOTS_TRIPLE_MULTIPLIERS,
  resolveCoinBet,
  resolveSlotsBet,
};
