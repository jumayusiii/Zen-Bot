const assert = require('node:assert/strict');
const test = require('node:test');

const {
  MAX,
  MAX_ATTEMPTS,
  MIN,
  createGame,
  judgeGuess,
} = require('../src/lib/guessNumber');

test('createGame picks numbers across the inclusive range', () => {
  assert.equal(createGame(() => 0).target, MIN);
  assert.equal(createGame(() => 0.999999).target, MAX);
  assert.equal(createGame(() => 0.5).target, 51);
});

test('judgeGuess gives higher/lower feedback and counts attempts', () => {
  const game = { target: 50, attempts: 0 };

  assert.deepEqual(judgeGuess(game, 25), {
    valid: true,
    result: 'higher',
    attempts: 1,
    remaining: MAX_ATTEMPTS - 1,
  });
  assert.equal(judgeGuess(game, 75).result, 'lower');
  assert.equal(judgeGuess({ target: 50, attempts: 2 }, 50).result, 'correct');
  assert.equal(judgeGuess({ target: 50, attempts: 2 }, 50).attempts, 3);
});

test('judgeGuess ends the round on the last wrong attempt', () => {
  const outcome = judgeGuess({ target: 50, attempts: MAX_ATTEMPTS - 1 }, 10);

  assert.equal(outcome.valid, true);
  assert.equal(outcome.result, 'lost');
  assert.equal(outcome.attempts, MAX_ATTEMPTS);
  assert.equal(outcome.remaining, 0);
});

test('judgeGuess rejects out-of-range and non-integer input', () => {
  const game = { target: 50, attempts: 0 };

  assert.equal(judgeGuess(game, 0).valid, false);
  assert.equal(judgeGuess(game, 101).valid, false);
  assert.equal(judgeGuess(game, 4.5).valid, false);
  assert.equal(judgeGuess(game, 'fifty').valid, false);
});
