const assert = require('node:assert/strict');
const test = require('node:test');

const {
  MAX_PURGE_AGE_MS,
  deletePurgeable,
  formatSlowmode,
  selectPurgeable,
} = require('../src/lib/moderationTools');

const ONE_HOUR_MS = 60 * 60 * 1000;

test('slowmode labels use compact hour, minute and second units', () => {
  assert.equal(formatSlowmode(0), 'Off');
  assert.equal(formatSlowmode(30), '30s');
  assert.equal(formatSlowmode(90), '1m 30s');
  assert.equal(formatSlowmode(3600), '1h');
  assert.equal(formatSlowmode(5400), '1h 30m');
  assert.equal(formatSlowmode(21600), '6h');
});

test('purge filtering respects user, age and pinned messages', () => {
  const now = Date.now();
  const messages = [
    { id: '1', author: { id: 'user' }, createdTimestamp: now - 1000, pinned: false },
    { id: '2', author: { id: 'other' }, createdTimestamp: now - 1000, pinned: false },
    { id: '3', author: { id: 'user' }, createdTimestamp: now - MAX_PURGE_AGE_MS - 1, pinned: false },
    { id: '4', author: { id: 'user' }, createdTimestamp: now - 1000, pinned: true },
    { id: '5', author: { id: 'user' }, createdTimestamp: now - ONE_HOUR_MS, pinned: false },
  ];

  assert.deepEqual(
    selectPurgeable(messages, { userId: 'user', now }).map((message) => message.id),
    ['1', '5'],
  );
  assert.deepEqual(
    selectPurgeable(messages, { now, includePinned: true }).map((message) => message.id),
    ['1', '2', '4', '5'],
  );
  assert.deepEqual(selectPurgeable([], { now }), []);
});

test('purge deletion uses message delete for one item and bulk delete otherwise', async () => {
  const single = [];
  const one = { delete: async () => single.push('one') };
  assert.equal(await deletePurgeable({}, [one]), 1);
  assert.deepEqual(single, ['one']);

  let bulkFilter = false;
  const two = [{ id: 'a' }, { id: 'b' }];
  const channel = {
    bulkDelete: async (messages, filter) => {
      bulkFilter = filter;
      return { size: messages.length };
    },
  };

  assert.equal(await deletePurgeable(channel, two), 2);
  assert.equal(bulkFilter, true);
  assert.equal(await deletePurgeable(channel, []), 0);
});
