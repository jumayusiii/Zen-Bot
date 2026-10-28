const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildDailyBreakdown,
  formatDuration,
  summarizeHistory,
} = require('../src/lib/siteHistory');

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = Date.UTC(2026, 9, 28, 12, 0, 0);

function sample(at, ok, ms = 120, status = ok ? 200 : 503) {
  return { at, ok, ms, status, error: ok ? null : `HTTP ${status}` };
}

test('daily breakdown uses seven UTC calendar days and keeps gaps empty', () => {
  const day22 = Date.UTC(2026, 9, 22);
  const day23 = Date.UTC(2026, 9, 23);
  const history = {
    samples: [
      sample(day22 + 10 * HOUR, true, 100),
      sample(day22 + 12 * HOUR, false, 80),
      sample(day23 + 9 * HOUR, true, 200),
      sample(NOW - HOUR, true, 140),
    ],
  };

  const days = buildDailyBreakdown(history, 7, NOW);

  assert.equal(days.length, 7);
  assert.equal(days[0].date, '2026-10-22');
  assert.equal(days.at(-1).date, '2026-10-28');
  assert.equal(days[0].samples, 2);
  assert.equal(days[0].successful, 1);
  assert.equal(days[0].availability, 50);
  assert.equal(days[0].averageMs, 100);
  assert.equal(days[1].samples, 1);
  assert.equal(days[2].availability, null);
  assert.equal(days[2].label, 'Oct 24');
  assert.equal(days.at(-1).samples, 1);
});

test('daily breakdown only counts samples within the current UTC day', () => {
  const today = Date.UTC(2026, 9, 28);
  const history = {
    samples: [
      sample(today - 1, false),
      sample(today, true),
      sample(today + 23 * HOUR, true),
      sample(today + DAY, true),
    ],
  };

  const days = buildDailyBreakdown(history, 1, NOW);

  assert.equal(days.length, 1);
  assert.equal(days[0].samples, 2);
  assert.equal(days[0].successful, 2);
  assert.equal(days[0].availability, 100);
});

test('seven-day summary groups consecutive failures into one incident', () => {
  const history = {
    samples: [
      sample(NOW - 2 * DAY, true, 100),
      sample(NOW - 2 * DAY + 5 * 60 * 1000, false, 70),
      sample(NOW - 2 * DAY + 10 * 60 * 1000, false, 60),
      sample(NOW - 2 * DAY + 15 * 60 * 1000, true, 110),
      sample(NOW - HOUR, true, 130),
    ],
  };

  const summary = summarizeHistory(history, 24 * 7, NOW);

  assert.equal(summary.samples, 5);
  assert.equal(summary.successful, 3);
  assert.equal(summary.availability, 60);
  assert.equal(summary.incidents.length, 1);
  assert.equal(summary.incidents[0].checks, 2);
  assert.equal(summary.incidents[0].ongoing, false);
  assert.equal(summary.incidents[0].durationMs, 10 * 60 * 1000);
  assert.equal(summary.downtimeMs, 10 * 60 * 1000);
  assert.equal(summary.averageMs, (100 + 110 + 130) / 3);
});

test('an unfinished failure is reported as an ongoing incident', () => {
  const history = {
    samples: [
      sample(NOW - 2 * HOUR, true),
      sample(NOW - 30 * 60 * 1000, false),
      sample(NOW - 15 * 60 * 1000, false),
    ],
  };

  const summary = summarizeHistory(history, 24, NOW);

  assert.equal(summary.incidents.length, 1);
  assert.equal(summary.incidents[0].ongoing, true);
  assert.equal(summary.incidents[0].checks, 2);
  assert.equal(summary.incidents[0].durationMs, 30 * 60 * 1000);
});

test('duration formatting stays readable across ranges', () => {
  assert.equal(formatDuration(5 * 1000), '5s');
  assert.equal(formatDuration(5 * 60 * 1000), '5m');
  assert.equal(formatDuration(2 * HOUR), '2h');
  assert.equal(formatDuration(2 * HOUR + 15 * 60 * 1000), '2h 15m');
  assert.equal(formatDuration(DAY + 3 * HOUR), '1d 3h');
});
