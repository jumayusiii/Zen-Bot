const assert = require('node:assert/strict');
const test = require('node:test');

const { ActivityType } = require('discord.js');
const { applyPresence, buildPresence } = require('../src/lib/presence');

test('buildPresence uses the Playing activity with the configured text', () => {
  const presence = buildPresence();

  assert.equal(presence.status, 'online');
  assert.equal(presence.activities.length, 1);
  assert.equal(presence.activities[0].name, 'I am Legend.');
  assert.equal(presence.activities[0].type, ActivityType.Playing);
});

test('applyPresence updates a ready client and reports missing users', () => {
  let received = null;
  const client = {
    user: {
      setPresence(presence) {
        received = presence;
      },
    },
  };

  assert.equal(applyPresence(client), true);
  assert.deepEqual(received, buildPresence());
  assert.equal(applyPresence({}), false);
});
