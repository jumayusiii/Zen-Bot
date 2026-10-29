const MIN_MS = Date.UTC(1970, 0, 1);
const MAX_MS = Date.UTC(2100, 11, 31, 23, 59, 59, 999);

const STYLES = Object.freeze([
  { id: 'relative', flag: 'R', label: 'Relative', emoji: '⏳', example: 'in 2 hours' },
  { id: 'short_time', flag: 't', label: 'Short time', emoji: '🕒', example: '8:30 PM' },
  { id: 'long_time', flag: 'T', label: 'Long time', emoji: '🕓', example: '8:30:00 PM' },
  { id: 'short_date', flag: 'd', label: 'Short date', emoji: '📅', example: '10/29/2026' },
  { id: 'long_date', flag: 'D', label: 'Long date', emoji: '🗓️', example: 'October 29, 2026' },
  { id: 'full', flag: 'f', label: 'Full', emoji: '🧾', example: 'October 29, 2026 at 8:30 PM' },
]);

const UNIT_MS = Object.freeze({
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
  w: 7 * 24 * 60 * 60 * 1000,
});

const RELATIVE_PATTERN =
  /^([+-])?(?:in\s+)?(\d{1,6})\s*(seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|weeks?|w)(?:\s+(ago))?$/i;

const DATE_HINT =
  /\d{4}|jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?/i;

function styleById(id) {
  return STYLES.find((style) => style.id === id) ?? STYLES[STYLES.length - 1];
}

function inRange(milliseconds) {
  return Number.isFinite(milliseconds) && milliseconds >= MIN_MS && milliseconds <= MAX_MS;
}

/**
 * Formats a date as Discord timestamp markup for one of the six styles.
 *
 * @param {number} milliseconds
 * @param {string} [styleId]
 * @returns {string} markup such as `<t:1793318400:R>`
 */
function formatTimestamp(milliseconds, styleId = 'full') {
  if (!Number.isFinite(milliseconds)) {
    throw new TypeError('A valid timestamp is required.');
  }

  const seconds = Math.floor(milliseconds / 1000);
  return `<t:${seconds}:${styleById(styleId).flag}>`;
}

/**
 * Parses `now`, relative durations (`in 2h`, `30m`, `2h ago`), Unix seconds
 * or milliseconds, and ISO-like dates into a timestamp.
 *
 * @param {string} input
 * @param {number} [now]
 * @returns {{at: number, source: 'now'|'relative'|'unix'|'date'}|null}
 */
function parseTimeInput(input, now = Date.now()) {
  if (typeof input !== 'string') return null;

  const value = input.trim();
  if (!value) return null;

  if (/^now$/i.test(value)) {
    return inRange(now) ? { at: now, source: 'now' } : null;
  }

  const relative = value.match(RELATIVE_PATTERN);
  if (relative) {
    const [, sign, rawAmount, rawUnit, ago] = relative;
    const amount = Number(rawAmount);
    const unit = UNIT_MS[rawUnit[0].toLowerCase()];

    if (!Number.isInteger(amount) || !unit) return null;

    const direction = ago || sign === '-' ? -1 : 1;
    const at = now + direction * amount * unit;

    return inRange(at) ? { at, source: 'relative' } : null;
  }

  if (/^\d{9,13}$/.test(value)) {
    const numeric = Number(value);
    const at = value.length <= 10 ? numeric * 1000 : numeric;
    return inRange(at) ? { at, source: 'unix' } : null;
  }

  if (DATE_HINT.test(value)) {
    const at = Date.parse(value);
    if (Number.isFinite(at) && inRange(at)) return { at, source: 'date' };
  }

  return null;
}

module.exports = {
  MAX_MS,
  MIN_MS,
  STYLES,
  formatTimestamp,
  parseTimeInput,
  styleById,
};
