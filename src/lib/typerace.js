const PHRASES = Object.freeze([
  'clear mind, clean code',
  'keep it simple',
  'one step at a time',
  'practice makes progress',
  'small wins count',
  'focus on the next step',
  'make it happen',
  'stay curious',
  'breathe and begin',
  'write, test, repeat',
  'good vibes only',
  'less noise, more signal',
  'slow is smooth',
  'learn, build, share',
  'done beats perfect',
  'keep showing up',
]);

function rollIndex(random, length) {
  const value = Math.min(0.999999, Math.max(0, Number(random()) || 0));
  return Math.floor(value * length);
}

/**
 * @param {() => number} [random]
 * @param {number|null} [excludeIndex]
 * @returns {{text: string, index: number}}
 */
function randomPhrase(random = Math.random, excludeIndex = null) {
  const available = PHRASES
    .map((text, index) => ({ text, index }))
    .filter((entry) => entry.index !== excludeIndex);
  const pool = available.length > 0
    ? available
    : PHRASES.map((text, index) => ({ text, index }));

  return pool[rollIndex(random, pool.length)];
}

function normalize(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function matchesPhrase(typed, phrase) {
  return normalize(typed) === normalize(phrase);
}

/**
 * Standard typing-test speed: one word is five non-space characters.
 *
 * @param {string} phrase
 * @param {number} elapsedMs
 * @returns {number}
 */
function typingSpeed(phrase, elapsedMs) {
  const milliseconds = Number(elapsedMs);
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return 0;

  const characters = normalize(phrase).replace(/\s+/g, '').length;
  return Math.max(0, Math.round((characters / 5) / (milliseconds / 60000)));
}

function formatDuration(elapsedMs) {
  const milliseconds = Math.max(0, Number(elapsedMs) || 0);
  if (milliseconds < 10000) return `${(milliseconds / 1000).toFixed(1)}s`;
  return `${Math.round(milliseconds / 1000)}s`;
}

function rateTyping(wordsPerMinute) {
  const speed = Math.max(0, Number(wordsPerMinute) || 0);
  if (speed >= 90) return { label: 'Blazing', emoji: '⚡' };
  if (speed >= 70) return { label: 'Fast', emoji: '🚀' };
  if (speed >= 50) return { label: 'Quick', emoji: '🏃' };
  if (speed >= 30) return { label: 'Steady', emoji: '🌱' };
  return { label: 'Warming up', emoji: '☕' };
}

module.exports = {
  PHRASES,
  formatDuration,
  matchesPhrase,
  normalize,
  randomPhrase,
  rateTyping,
  typingSpeed,
};
