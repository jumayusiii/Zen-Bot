const SYMBOLS = Object.freeze([
  { id: 'mint', label: 'Mint', emoji: '🌿' },
  { id: 'ember', label: 'Ember', emoji: '🔥' },
  { id: 'tide', label: 'Tide', emoji: '💧' },
  { id: 'nova', label: 'Nova', emoji: '⭐' },
]);

const START_LENGTH = 3;
const MAX_START_LENGTH = 50;

function rollIndex(random, length) {
  const value = Math.min(0.999999, Math.max(0, Number(random()) || 0));
  return Math.floor(value * length);
}

function pickSymbol(random = Math.random) {
  return SYMBOLS[rollIndex(random, SYMBOLS.length)];
}

function symbolById(id) {
  return SYMBOLS.find((symbol) => symbol.id === id) ?? null;
}

/**
 * @param {number} [length]
 * @param {() => number} [random]
 * @returns {string[]} symbol ids
 */
function createSequence(length = START_LENGTH, random = Math.random) {
  const size = Number.isInteger(length) && length > 0 && length <= MAX_START_LENGTH
    ? length
    : START_LENGTH;

  return Array.from({ length: size }, () => pickSymbol(random).id);
}

/**
 * @param {string[]} sequence
 * @param {() => number} [random]
 * @returns {string[]}
 */
function extendSequence(sequence, random = Math.random) {
  if (!Array.isArray(sequence) || sequence.length === 0) {
    throw new TypeError('A memory sequence needs at least one symbol.');
  }

  return [...sequence, pickSymbol(random).id];
}

function isCorrectStep(sequence, position, symbolId) {
  return Array.isArray(sequence)
    && Number.isInteger(position)
    && position >= 0
    && sequence[position] === symbolId;
}

function sequenceEmojis(sequence) {
  return sequence.map((id) => symbolById(id)?.emoji ?? '❔');
}

module.exports = {
  MAX_START_LENGTH,
  START_LENGTH,
  SYMBOLS,
  createSequence,
  extendSequence,
  isCorrectStep,
  pickSymbol,
  sequenceEmojis,
  symbolById,
};
