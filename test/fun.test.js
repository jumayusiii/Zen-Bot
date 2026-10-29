const assert = require('node:assert/strict');
const test = require('node:test');

const {
  FACTS,
  randomFact,
  shipScore,
  shipVerdict,
} = require('../src/lib/fun');

test('shipScore is deterministic, symmetric and stays in range', () => {
  const first = shipScore('100000000000000001', '100000000000000002');
  const reverse = shipScore('100000000000000002', '100000000000000001');

  assert.equal(first, reverse);
  assert.equal(first, shipScore('100000000000000001', '100000000000000002'));
  assert.ok(first >= 0 && first <= 100);
  assert.notEqual(first, shipScore('100000000000000003', '100000000000000004'));
});

test('shipVerdict maps scores to readable labels', () => {
  assert.equal(shipVerdict(100).label, 'Soulmates');
  assert.equal(shipVerdict(75).label, 'Perfect match');
  assert.equal(shipVerdict(60).label, 'Strong connection');
  assert.equal(shipVerdict(40).label, 'Worth a shot');
  assert.equal(shipVerdict(25).label, 'Just friends');
  assert.equal(shipVerdict(0).label, 'Not meant to be');
});

test('randomFact returns a valid fact and respects the excluded one', () => {
  const fact = randomFact(() => 0);
  assert.equal(fact.index, 0);
  assert.equal(fact.text, FACTS[0]);

  const next = randomFact(() => 0, 0);
  assert.notEqual(next.index, 0);
  assert.ok(next.text.length > 0);
  assert.ok(next.index < FACTS.length);
});
