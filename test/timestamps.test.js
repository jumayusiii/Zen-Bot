const assert = require('node:assert/strict');
const test = require('node:test');

const {
  STYLES,
  formatTimestamp,
  parseTimeInput,
  styleById,
} = require('../src/lib/timestamps');

const NOW = Date.UTC(2026, 9, 29, 12, 0, 0);

test('parseTimeInput understands now, relative durations and past times', () => {
  assert.equal(parseTimeInput('now', NOW).at, NOW);
  assert.equal(parseTimeInput('in 2h', NOW).at, NOW + 2 * 60 * 60 * 1000);
  assert.equal(parseTimeInput('+30m', NOW).at, NOW + 30 * 60 * 1000);
  assert.equal(parseTimeInput('90 seconds', NOW).at, NOW + 90 * 1000);
  assert.equal(parseTimeInput('2h ago', NOW).at, NOW - 2 * 60 * 60 * 1000);
  assert.equal(parseTimeInput('-1d', NOW).at, NOW - 24 * 60 * 60 * 1000);
  assert.equal(parseTimeInput('1 week', NOW).at, NOW + 7 * 24 * 60 * 60 * 1000);
});

test('parseTimeInput understands ISO dates and Unix seconds or milliseconds', () => {
  const iso = parseTimeInput('2026-12-31T18:00:00Z', NOW);
  assert.equal(iso.at, Date.UTC(2026, 11, 31, 18, 0, 0));
  assert.equal(iso.source, 'date');

  const local = parseTimeInput('2026-12-31 18:00', NOW);
  assert.equal(local.at, Date.parse('2026-12-31 18:00'));

  const seconds = Math.floor(NOW / 1000);
  assert.equal(parseTimeInput(String(seconds), NOW).at, NOW);
  assert.equal(parseTimeInput(String(NOW), NOW).at, NOW);
  assert.equal(parseTimeInput(String(seconds), NOW).source, 'unix');
});

test('parseTimeInput rejects unreadable or out-of-range input', () => {
  for (const input of ['', 'soon', '2x', '123', '1900-01-01', '99999999999999']) {
    assert.equal(parseTimeInput(input, NOW), null, `expected ${JSON.stringify(input)} to be rejected`);
  }
});

test('formatTimestamp uses the matching Discord style flag', () => {
  const seconds = Math.floor(NOW / 1000);

  for (const style of STYLES) {
    assert.equal(formatTimestamp(NOW, style.id), `<t:${seconds}:${style.flag}>`);
  }

  assert.equal(styleById('missing').id, 'full');
  assert.equal(formatTimestamp(NOW), `<t:${seconds}:f>`);
});
