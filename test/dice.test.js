const assert = require('node:assert/strict');
const test = require('node:test');

const { parseDice, rollDice } = require('../src/lib/dice');

test('parseDice accepts common notation and normalizes it', () => {
  assert.deepEqual(parseDice('1d6'), {
    count: 1,
    sides: 6,
    modifier: 0,
    notation: '1d6',
  });
  assert.equal(parseDice('2d20').notation, '2d20');
  assert.equal(parseDice('4d6+2').notation, '4d6+2');
  assert.equal(parseDice('3d8-1').notation, '3d8-1');
  assert.equal(parseDice('D12').notation, '1d12');
});

test('parseDice rejects unsupported or malformed input', () => {
  for (const input of ['', 'd', '0d6', '21d6', '1d1', '1d1001', '4d6+101', 'abc', '2d6+']) {
    assert.equal(parseDice(input), null, `expected ${JSON.stringify(input)} to be rejected`);
  }
});

test('rollDice rolls the requested count and applies the modifier', () => {
  const dice = parseDice('3d6+2');
  const result = rollDice(dice, () => 0);

  assert.deepEqual(result.rolls, [1, 1, 1]);
  assert.equal(result.total, 5);
});

test('rollDice keeps every roll inside the side range', () => {
  const dice = parseDice('20d6');
  const result = rollDice(dice, () => 0.999999);

  assert.equal(result.rolls.length, 20);
  assert.ok(result.rolls.every((roll) => roll === 6));
  assert.equal(result.total, 120);
});
