const MAX_CHOICES = 10;
const MAX_LABEL_LENGTH = 80;

/**
 * Splits a free-form list on `|`, commas or newlines, trims it, drops
 * duplicates (case-insensitive) and caps it at ten readable options.
 *
 * @param {string} input
 * @returns {string[]}
 */
function parseChoices(input) {
  if (typeof input !== 'string') return [];

  const seen = new Set();
  const choices = [];

  for (const part of input.split(/\||\n|,/)) {
    const label = part.replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL_LENGTH);
    if (!label) continue;

    const key = label.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    choices.push(label);

    if (choices.length >= MAX_CHOICES) break;
  }

  return choices;
}

/**
 * @param {string[]} choices
 * @param {() => number} [random]
 * @returns {string|null}
 */
function pickChoice(choices, random = Math.random) {
  if (!Array.isArray(choices) || choices.length === 0) return null;

  const index = Math.min(choices.length - 1, Math.floor(random() * choices.length));
  return choices[index];
}

module.exports = { MAX_CHOICES, MAX_LABEL_LENGTH, parseChoices, pickChoice };
