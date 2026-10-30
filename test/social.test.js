const assert = require('node:assert/strict');
const test = require('node:test');

const { SOCIAL_ACTIONS, socialLine } = require('../src/lib/social');

test('social actions have complete metadata and varied lines', () => {
  assert.deepEqual(Object.keys(SOCIAL_ACTIONS), ['hug', 'pat', 'highfive']);

  for (const action of Object.values(SOCIAL_ACTIONS)) {
    assert.ok(action.title);
    assert.ok(action.description);
    assert.ok(action.verb);
    assert.ok(action.lines.length >= 4);
    assert.ok(action.lines.every((line) => line.includes('{actor}') && line.includes('{target}')));
  }
});

test('socialLine fills both names and uses the supplied random source', () => {
  assert.equal(
    socialLine('hug', 'Ada', 'Grace', () => 0),
    '**Ada** wraps **Grace** in a warm, squishy hug.',
  );
  assert.match(
    socialLine('pat', 'Ada', 'Grace', () => 0.99),
    /Ada.*Grace/,
  );
  assert.match(
    socialLine('highfive', 'Ada', 'Grace', () => 0.5),
    /Ada.*Grace/,
  );
  assert.throws(() => socialLine('nope', 'Ada', 'Grace'), /Unknown social action/);
});
