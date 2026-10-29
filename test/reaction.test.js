const assert = require('node:assert/strict');
const test = require('node:test');

const { rateReaction } = require('../src/lib/reaction');

test('rateReaction maps milliseconds to readable bands', () => {
  assert.equal(rateReaction(0).label, 'Lightning');
  assert.equal(rateReaction(249).label, 'Lightning');
  assert.equal(rateReaction(250).label, 'Quick');
  assert.equal(rateReaction(399).label, 'Quick');
  assert.equal(rateReaction(400).label, 'Solid');
  assert.equal(rateReaction(699).label, 'Solid');
  assert.equal(rateReaction(700).label, 'Slow and steady');
  assert.equal(rateReaction(-10).label, 'Lightning');
});
