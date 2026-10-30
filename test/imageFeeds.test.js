const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildMemeUrl,
  escapeMemeText,
  fetchCatImage,
  fetchDogImage,
  safeImageUrl,
} = require('../src/lib/imageFeeds');

test('meme text escapes memegen characters and builds optional bottom lines', () => {
  assert.equal(escapeMemeText('a-b_c d'), 'a--b__c_d');
  assert.equal(
    buildMemeUrl('drake', 'Hello world', 'Goodbye world'),
    'https://api.memegen.link/images/drake/Hello_world/Goodbye_world.png?width=800',
  );
  assert.equal(
    buildMemeUrl('fine', 'This is fine'),
    'https://api.memegen.link/images/fine/This_is_fine.png?width=800',
  );
  assert.throws(() => buildMemeUrl('not-a-template', 'Hello'), /available meme templates/);
  assert.throws(() => buildMemeUrl('doge', '   '), /top line/);
});

test('cat and dog image feeds accept only HTTPS images and parse metadata', async () => {
  const cat = await fetchCatImage({
    fetchImpl: async () => ({
      ok: true,
      json: async () => [{ id: 'cat-id', url: 'https://cdn.example/cat.jpg' }],
    }),
  });
  assert.deepEqual(cat, {
    url: 'https://cdn.example/cat.jpg',
    source: 'The Cat API',
    id: 'cat-id',
  });

  const dog = await fetchDogImage({
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        status: 'success',
        message: 'https://images.dog.ceo/breeds/buhund-norwegian/hakon.jpg',
      }),
    }),
  });
  assert.equal(dog.url, 'https://images.dog.ceo/breeds/buhund-norwegian/hakon.jpg');
  assert.equal(dog.breed, 'buhund-norwegian');
  assert.equal(dog.source, 'Dog CEO');

  assert.equal(safeImageUrl('http://example.com/cat.jpg'), null);
  assert.equal(safeImageUrl('not a url'), null);
});

test('image feeds fail clearly on unusable API payloads', async () => {
  await assert.rejects(
    fetchCatImage({ fetchImpl: async () => ({ ok: true, json: async () => [] }) }),
    /no usable image/,
  );

  await assert.rejects(
    fetchDogImage({
      fetchImpl: async () => ({
        ok: true,
        json: async () => ({ status: 'error', message: 'missing' }),
      }),
    }),
    /no usable image/,
  );
});
