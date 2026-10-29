const assert = require('node:assert/strict');
const test = require('node:test');

const {
  MAX,
  MIN,
  drawNext,
  drawStartingNumber,
  judgeGuess,
} = require('../src/lib/higherlower');

test('drawStartingNumber stays inside the board range', () => {
  assert.equal(drawStartingNumber(() => 0), MIN);
  assert.equal(drawStartingNumber(() => 0.999999), MAX);
});

test('drawNext never repeats the current number and stays in range', () => {
  for (const random of [0, 0.25, 0.5, 0.75, 0.999999]) {
    for (let current = MIN; current <= MAX; current += 1) {
      const next = drawNext(current, () => random);

      assert.ok(next >= MIN && next <= MAX, `next ${next} should be in range`);
      assert.notEqual(next, current, `next should differ from ${current}`);
    }
  }
});

test('drawNext rejects an invalid current number', () => {
  assert.throws(() => drawNext(0), RangeError);
  assert.throws(() => drawNext(101), RangeError);
  assert.throws(() => drawNext(4.5), RangeError);
});

test('judgeGuess compares the next number with the current one', () => {
  assert.equal(judgeGuess(40, 80, 'higher'), true);
  assert.equal(judgeGuess(40, 10, 'higher'), false);
  assert.equal(judgeGuess(40, 10, 'lower'), true);
  assert.equal(judgeGuess(40, 80, 'lower'), false);
  assert.equal(judgeGuess(40, 40, 'higher'), null);
  assert.equal(judgeGuess(40, 80, 'sideways'), null);
});
