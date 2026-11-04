const assert = require('node:assert/strict');
const test = require('node:test');

const {
  DAD_JOKES,
  DAD_JOKES_DE,
  MAX_EMOJIFY_CHARS,
  MAX_MOCK_CHARS,
  RIDDLES,
  RIDDLES_DE,
  emojify,
  mockText,
  randomDadJoke,
  randomRiddle,
} = require('../src/lib/funAdditions');

test('dad jokes and riddles have matching English and German pools', () => {
  assert.ok(DAD_JOKES.length >= 10);
  assert.equal(DAD_JOKES.length, DAD_JOKES_DE.length);
  assert.equal(RIDDLES.length, RIDDLES_DE.length);

  for (const riddle of [...RIDDLES, ...RIDDLES_DE]) {
    assert.ok(riddle.question.length > 0);
    assert.ok(riddle.answer.length > 0);
  }

  assert.equal(randomDadJoke(() => 0), DAD_JOKES[0]);
  assert.equal(randomDadJoke(() => 0, 'de'), DAD_JOKES_DE[0]);
  assert.equal(randomRiddle(() => 0), RIDDLES[0]);
  assert.equal(randomRiddle(() => 0.99, 'de'), RIDDLES_DE[RIDDLES_DE.length - 1]);
  assert.equal(randomDadJoke(() => 0, 'fr'), DAD_JOKES[0]);
});

test('emojify maps letters and digits and widens spaces', () => {
  assert.equal(emojify('ab'), '🇦🇧');
  assert.equal(emojify('1'), '1️⃣');
  assert.equal(emojify('a b'), '🇦   🇧');
  assert.equal(emojify('hi!'), '🇭🇮!');
  assert.equal(emojify(''), '');
  assert.equal(MAX_EMOJIFY_CHARS, 80);
});

test('mockText alternates only letters and leaves punctuation alone', () => {
  assert.equal(mockText('hello'), 'HeLlO');
  assert.equal(mockText('hi there!'), 'Hi ThErE!');
  assert.equal(mockText('123'), '123');
  assert.equal(mockText(''), '');
  assert.equal(MAX_MOCK_CHARS, 200);
});
