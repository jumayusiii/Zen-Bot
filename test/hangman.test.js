const assert = require('node:assert/strict');
const test = require('node:test');

const {
  MAX_WRONG,
  applyGuess,
  createHangman,
  guessesLeft,
  hangmanArt,
  maskWord,
  randomWord,
  statusOf,
  unusedLetters,
  wrongLetters,
} = require('../src/lib/hangman');

test('randomWord picks a valid word and can exclude the previous one', () => {
  const first = randomWord(() => 0);
  assert.ok(first.word.length > 0);
  assert.ok(first.category.length > 0);

  const second = randomWord(() => 0, first.word);
  assert.notEqual(second.word, first.word);
});

test('letter guesses filter repeats and reveal matching letters', () => {
  const game = createHangman(() => 0);
  assert.equal(game.word, 'JAVASCRIPT');

  const next = applyGuess(game, 'a');
  assert.deepEqual(next.guessed, ['A']);
  assert.equal(maskWord(next), '_ A _ A _ _ _ _ _ _');
  assert.equal(applyGuess(next, 'A'), null);
  assert.equal(applyGuess(next, '1'), null);
});

test('wrong guesses build the hangman and end the round at six', () => {
  let game = createHangman(() => 0);
  assert.equal(guessesLeft(game), MAX_WRONG);
  assert.equal(statusOf(game), 'playing');

  for (const letter of ['B', 'D', 'E', 'F', 'G', 'H']) {
    game = applyGuess(game, letter);
    assert.ok(game, `${letter} should be accepted`);
  }

  assert.deepEqual(wrongLetters(game), ['B', 'D', 'E', 'F', 'G', 'H']);
  assert.equal(guessesLeft(game), 0);
  assert.equal(statusOf(game), 'lost');
  assert.equal(applyGuess(game, 'Z'), null);
});

test('solving every letter wins the round', () => {
  let game = createHangman(() => 0);
  for (const letter of new Set('JAVASCRIPT')) {
    game = applyGuess(game, letter);
  }

  assert.equal(maskWord(game), 'J A V A S C R I P T');
  assert.equal(statusOf(game), 'won');
  assert.equal(applyGuess(game, 'Z'), null);
});

test('unused letters are limited to the requested range', () => {
  const game = { ...createHangman(() => 0), guessed: ['A', 'B', 'N'] };
  assert.deepEqual(unusedLetters(game, 0, 13), ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']);
  assert.deepEqual(unusedLetters(game, 13, 26), [
    'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
  ]);
});

test('hangman art advances with wrong guesses', () => {
  assert.equal(hangmanArt(0).split('\n').length, 6);
  assert.doesNotMatch(hangmanArt(0), /O/);
  assert.match(hangmanArt(1), /O/);
  assert.match(hangmanArt(6), /\/ \\/);
});
