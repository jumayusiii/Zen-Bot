const MIN = 1;
const MAX = 100;
const MAX_ATTEMPTS = 7;

function randomTarget(random = Math.random) {
  const value = Math.min(0.999999, Math.max(0, random()));
  return MIN + Math.floor(value * (MAX - MIN + 1));
}

function createGame(random = Math.random) {
  return {
    target: randomTarget(random),
    attempts: 0,
  };
}

/**
 * Judges one guess without mutating the game. The caller stores the returned
 * attempt count so the command can keep the round state in memory.
 *
 * @param {{target: number, attempts: number}} game
 * @param {number} guess
 * @returns {{valid: boolean, result: 'invalid'|'higher'|'lower'|'correct'|'lost', attempts: number, remaining: number}}
 */
function judgeGuess(game, guess) {
  const value = Number(guess);
  const attempts = Number.isInteger(game?.attempts) ? game.attempts : 0;

  if (!Number.isInteger(value) || value < MIN || value > MAX) {
    return {
      valid: false,
      result: 'invalid',
      attempts,
      remaining: Math.max(0, MAX_ATTEMPTS - attempts),
    };
  }

  const nextAttempts = attempts + 1;
  const remaining = Math.max(0, MAX_ATTEMPTS - nextAttempts);

  if (value === game.target) {
    return { valid: true, result: 'correct', attempts: nextAttempts, remaining };
  }

  if (nextAttempts >= MAX_ATTEMPTS) {
    return { valid: true, result: 'lost', attempts: nextAttempts, remaining: 0 };
  }

  return {
    valid: true,
    result: value < game.target ? 'higher' : 'lower',
    attempts: nextAttempts,
    remaining,
  };
}

module.exports = { MAX, MAX_ATTEMPTS, MIN, createGame, judgeGuess, randomTarget };
