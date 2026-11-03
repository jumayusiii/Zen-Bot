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

const PHRASES_DE = Object.freeze([
  'klarer kopf, sauberer code',
  'bleib einfach',
  'ein schritt nach dem anderen',
  'übung macht fortschritt',
  'kleine erfolge zählen',
  'fokus auf den nächsten schritt',
  'lass es passieren',
  'bleib neugierig',
  'atme und beginn',
  'schreiben, testen, wiederholen',
  'gute laune, gute energie',
  'weniger lärm, mehr signal',
  'langsam ist geschmeidig',
  'lernen, bauen, teilen',
  'fertig schlägt perfekt',
  'bleib am ball',
]);

const RATINGS_DE = Object.freeze({
  blazing: { label: 'Blitzschnell', emoji: '⚡' },
  fast: { label: 'Schnell', emoji: '🚀' },
  quick: { label: 'Flott', emoji: '🏃' },
  steady: { label: 'Stetig', emoji: '🌱' },
  warming: { label: 'Warmlaufen', emoji: '☕' },
});

function isGerman(language) {
  return String(language ?? '').toLowerCase().startsWith('de');
}

function rollIndex(random, length) {
  const value = Math.min(0.999999, Math.max(0, Number(random()) || 0));
  return Math.floor(value * length);
}

/**
 * @param {() => number} [random]
 * @param {number|null} [excludeIndex]
 * @returns {{text: string, index: number}}
 */
function randomPhrase(random = Math.random, excludeIndex = null, language = 'en') {
  const phrases = isGerman(language) ? PHRASES_DE : PHRASES;
  const available = phrases
    .map((text, index) => ({ text, index }))
    .filter((entry) => entry.index !== excludeIndex);
  const pool = available.length > 0
    ? available
    : phrases.map((text, index) => ({ text, index }));

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

function rateTyping(wordsPerMinute, language = 'en') {
  const speed = Math.max(0, Number(wordsPerMinute) || 0);
  let key = 'warming';
  if (speed >= 90) key = 'blazing';
  else if (speed >= 70) key = 'fast';
  else if (speed >= 50) key = 'quick';
  else if (speed >= 30) key = 'steady';

  const ratings = isGerman(language)
    ? RATINGS_DE
    : {
        blazing: { label: 'Blazing', emoji: '⚡' },
        fast: { label: 'Fast', emoji: '🚀' },
        quick: { label: 'Quick', emoji: '🏃' },
        steady: { label: 'Steady', emoji: '🌱' },
        warming: { label: 'Warming up', emoji: '☕' },
      };

  return { ...ratings[key] };
}

module.exports = {
  PHRASES,
  PHRASES_DE,
  formatDuration,
  matchesPhrase,
  normalize,
  randomPhrase,
  rateTyping,
  typingSpeed,
};
