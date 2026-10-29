const assert = require('node:assert/strict');
const test = require('node:test');

const { MAX_CHOICES, parseChoices, pickChoice } = require('../src/lib/choices');

test('parseChoices splits, trims and removes duplicate options', () => {
  assert.deepEqual(parseChoices('Pizza | Sushi, Tacos\npizza'), [
    'Pizza',
    'Sushi',
    'Tacos',
  ]);
});

test('parseChoices caps the list and each label', () => {
  const many = Array.from({ length: 14 }, (_, index) => `Option ${index + 1}`).join(' | ');
  assert.equal(parseChoices(many).length, MAX_CHOICES);

  const long = parseChoices(`${'a'.repeat(120)} | b`);
  assert.equal(long[0].length, 80);
});

test('pickChoice uses the random source and handles an empty list', () => {
  assert.equal(pickChoice(['a', 'b', 'c'], () => 0), 'a');
  assert.equal(pickChoice(['a', 'b', 'c'], () => 0.999), 'c');
  assert.equal(pickChoice([], () => 0.5), null);
});
