const assert = require('node:assert/strict');
const test = require('node:test');

const { renderRankCard } = require('../src/lib/rankCard');

const baseCard = {
  displayName: 'Test Member',
  username: 'testmember',
  avatarUrl: null,
  level: 12,
  rank: 3,
  totalUsers: 42,
  xpIntoLevel: 1240,
  xpNeeded: 2100,
  totalXp: 5240,
};

test('renderRankCard produces a valid PNG without an avatar', async () => {
  const buffer = await renderRankCard(baseCard);

  assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.ok(buffer.length > 5000, 'card should contain more than a blank image');
});

test('renderRankCard renders each card theme with different output', async () => {
  const ocean = await renderRankCard({ ...baseCard, theme: 'ocean' });
  const midnight = await renderRankCard({ ...baseCard, theme: 'midnight' });

  for (const buffer of [ocean, midnight]) {
    assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
    assert.ok(buffer.length > 5000);
  }

  assert.notEqual(Buffer.compare(ocean, midnight), 0);
  assert.notEqual(Buffer.compare(ocean, await renderRankCard(baseCard)), 0);
});
