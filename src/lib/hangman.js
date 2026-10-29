const MAX_WRONG = 6;
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

const WORDS = Object.freeze([
  { word: 'JAVASCRIPT', category: 'Technology' },
  { word: 'DISCORD', category: 'Technology' },
  { word: 'KEYBOARD', category: 'Technology' },
  { word: 'MONITOR', category: 'Technology' },
  { word: 'ALGORITHM', category: 'Technology' },
  { word: 'DATABASE', category: 'Technology' },
  { word: 'NETWORK', category: 'Technology' },
  { word: 'COMPILER', category: 'Technology' },
  { word: 'BROWSER', category: 'Technology' },
  { word: 'PYTHON', category: 'Technology' },
  { word: 'OXYGEN', category: 'Science' },
  { word: 'GRAVITY', category: 'Science' },
  { word: 'MOLECULE', category: 'Science' },
  { word: 'ELECTRON', category: 'Science' },
  { word: 'VOLCANO', category: 'Science' },
  { word: 'GALAXY', category: 'Science' },
  { word: 'PHOTON', category: 'Science' },
  { word: 'NEUTRON', category: 'Science' },
  { word: 'MOUNTAIN', category: 'Geography' },
  { word: 'PORTUGAL', category: 'Geography' },
  { word: 'ANTARCTICA', category: 'Geography' },
  { word: 'AUSTRALIA', category: 'Geography' },
  { word: 'RIVER', category: 'Geography' },
  { word: 'DESERT', category: 'Geography' },
  { word: 'ISLAND', category: 'Geography' },
  { word: 'GERMANY', category: 'Geography' },
  { word: 'MINECRAFT', category: 'Gaming' },
  { word: 'CHESS', category: 'Gaming' },
  { word: 'POKEMON', category: 'Gaming' },
  { word: 'ZELDA', category: 'Gaming' },
  { word: 'ARCADE', category: 'Gaming' },
  { word: 'JOYSTICK', category: 'Gaming' },
  { word: 'SPEEDRUN', category: 'Gaming' },
  { word: 'ELEPHANT', category: 'Animals' },
  { word: 'PENGUIN', category: 'Animals' },
  { word: 'OCTOPUS', category: 'Animals' },
  { word: 'DOLPHIN', category: 'Animals' },
  { word: 'GIRAFFE', category: 'Animals' },
  { word: 'KANGAROO', category: 'Animals' },
  { word: 'CHOCOLATE', category: 'Food' },
  { word: 'PINEAPPLE', category: 'Food' },
  { word: 'SPAGHETTI', category: 'Food' },
  { word: 'AVOCADO', category: 'Food' },
  { word: 'PANCAKE', category: 'Food' },
  { word: 'STRAWBERRY', category: 'Food' },
]);

function rollIndex(random, length) {
  const value = Math.min(0.999999, Math.max(0, random()));
  return Math.floor(value * length);
}

function randomWord(random = Math.random, exclude = null) {
  const pool = WORDS.filter((entry) => entry.word !== exclude);
  const choice = pool[rollIndex(random, pool.length)];
  return { ...choice };
}

function createHangman(random = Math.random, exclude = null) {
  const choice = randomWord(random, exclude);
  return {
    word: choice.word,
    category: choice.category,
    guessed: [],
  };
}

function wrongLetters(game) {
  return game.guessed.filter((letter) => !game.word.includes(letter));
}

function guessesLeft(game) {
  return Math.max(0, MAX_WRONG - wrongLetters(game).length);
}

function maskWord(game) {
  return [...game.word]
    .map((letter) => (game.guessed.includes(letter) ? letter : '_'))
    .join(' ');
}

function isWon(game) {
  return [...new Set(game.word)].every((letter) => game.guessed.includes(letter));
}

function statusOf(game) {
  if (isWon(game)) return 'won';
  if (guessesLeft(game) === 0) return 'lost';
  return 'playing';
}

/**
 * @param {{word: string, guessed: string[]}} game
 * @param {string} letter
 * @returns {{word: string, category: string, guessed: string[]}|null} a new game state
 */
function applyGuess(game, letter) {
  const normalized = String(letter ?? '').toUpperCase();
  if (!/^[A-Z]$/.test(normalized)) return null;
  if (statusOf(game) !== 'playing') return null;
  if (game.guessed.includes(normalized)) return null;

  return { ...game, guessed: [...game.guessed, normalized] };
}

function unusedLetters(game, start, end) {
  return [...ALPHABET.slice(start, end)].filter((letter) => !game.guessed.includes(letter));
}

function hangmanArt(wrongCount) {
  const stage = Math.max(0, Math.min(MAX_WRONG, Math.floor(wrongCount)));
  const head = stage >= 1 ? '  O   │' : '      │';
  const body =
    stage >= 4
      ? ' /|\\  │'
      : stage === 3
        ? ' /|   │'
        : stage === 2
          ? '  |   │'
          : '      │';
  const legs = stage >= 6 ? ' / \\  │' : stage === 5 ? ' /    │' : '      │';

  return ['  ┌───┐', '  │   │', head, body, legs, '═════════'].join('\n');
}

module.exports = {
  ALPHABET,
  HANGMAN_STAGES: MAX_WRONG,
  MAX_WRONG,
  WORDS,
  applyGuess,
  createHangman,
  guessesLeft,
  hangmanArt,
  isWon,
  maskWord,
  randomWord,
  statusOf,
  unusedLetters,
  wrongLetters,
};
