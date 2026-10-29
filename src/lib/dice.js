const MAX_DICE = 20;
const MIN_SIDES = 2;
const MAX_SIDES = 1000;
const MAX_MODIFIER = 100;

const DICE_PATTERN = /^(\d{1,2})?d(\d{1,4})([+-]\d{1,3})?$/i;

/**
 * Parses compact dice notation such as `1d6`, `2d20` or `4d6+2`.
 *
 * @param {string} input
 * @returns {{count: number, sides: number, modifier: number, notation: string}|null}
 */
function parseDice(input) {
  if (typeof input !== 'string') return null;

  const match = input.trim().match(DICE_PATTERN);
  if (!match) return null;

  const count = match[1] ? Number(match[1]) : 1;
  const sides = Number(match[2]);
  const modifier = match[3] ? Number(match[3]) : 0;

  if (!Number.isInteger(count) || count < 1 || count > MAX_DICE) return null;
  if (!Number.isInteger(sides) || sides < MIN_SIDES || sides > MAX_SIDES) return null;
  if (!Number.isInteger(modifier) || Math.abs(modifier) > MAX_MODIFIER) return null;

  return {
    count,
    sides,
    modifier,
    notation: `${count}d${sides}${modifier > 0 ? `+${modifier}` : modifier < 0 ? modifier : ''}`,
  };
}

/**
 * @param {{count: number, sides: number, modifier: number}} dice
 * @param {() => number} [random]
 * @returns {{rolls: number[], total: number}}
 */
function rollDice(dice, random = Math.random) {
  const rolls = Array.from({ length: dice.count }, () =>
    Math.min(dice.sides, Math.floor(random() * dice.sides) + 1),
  );

  const total = rolls.reduce((sum, roll) => sum + roll, 0) + dice.modifier;
  return { rolls, total };
}

module.exports = {
  MAX_DICE,
  MAX_MODIFIER,
  MAX_SIDES,
  MIN_SIDES,
  parseDice,
  rollDice,
};
