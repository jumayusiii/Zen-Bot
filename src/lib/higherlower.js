const MIN = 1;
const MAX = 100;
const MAX_ROUNDS = 10;

function rollIndex(random, length) {
  const value = Math.min(0.999999999, Math.max(0, random()));
  return Math.floor(value * length);
}

function drawStartingNumber(random = Math.random) {
  return MIN + rollIndex(random, MAX - MIN + 1);
}

/**
 * Draws the next number from the inclusive range while never returning the
 * current number, so every round has a definite higher/lower answer.
 *
 * @param {number} current
 * @param {() => number} [random]
 * @returns {number}
 */
function drawNext(current, random = Math.random) {
  if (!Number.isInteger(current) || current < MIN || current > MAX) {
    throw new RangeError(`current must be an integer between ${MIN} and ${MAX}.`);
  }

  const candidate = MIN + rollIndex(random, MAX - MIN);
  return candidate >= current ? candidate + 1 : candidate;
}

/**
 * @param {number} current
 * @param {number} next
 * @param {'higher'|'lower'} guess
 * @returns {boolean|null} null when the guess or numbers are invalid
 */
function judgeGuess(current, next, guess) {
  if (guess !== 'higher' && guess !== 'lower') return null;
  if (!Number.isFinite(current) || !Number.isFinite(next) || current === next) return null;

  return guess === 'higher' ? next > current : next < current;
}

module.exports = { MAX, MAX_ROUNDS, MIN, drawNext, drawStartingNumber, judgeGuess };
