const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildMemeUrl,
  escapeMemeText,
  fetchAnimalMeme,
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

test('meme styling options add fonts, colours, layout, caps and a custom background', () => {
  const styled = new URL(
    buildMemeUrl('doge', 'hello world', 'goodbye world', {
      font: 'impact',
      color: 'white,black',
      layout: 'top',
      uppercase: true,
      background: 'https://cdn.example/background.png',
    }),
  );

  assert.equal(styled.pathname, '/images/doge/HELLO_WORLD/GOODBYE_WORLD.png');
  assert.equal(styled.searchParams.get('width'), '800');
  assert.equal(styled.searchParams.get('font'), 'impact');
  assert.equal(styled.searchParams.get('color'), 'white,black');
  assert.equal(styled.searchParams.get('layout'), 'top');
  assert.equal(styled.searchParams.get('background'), 'https://cdn.example/background.png');

  assert.throws(() => buildMemeUrl('doge', 'hi', '', { font: 'comic-sans' }), /meme fonts/);
  assert.throws(() => buildMemeUrl('doge', 'hi', '', { color: 'red' }), /text colours/);
  assert.throws(() => buildMemeUrl('doge', 'hi', '', { layout: 'middle' }), /text layout/);
  assert.throws(
    () => buildMemeUrl('doge', 'hi', '', { background: 'http://cdn.example/background.png' }),
    /HTTPS image URL/,
  );
});

test('animal meme feed rotates sources, rejects NSFW posts and parses metadata', async () => {
  const calls = [];
  const meme = await fetchAnimalMeme({
    subreddits: ['AnimalMemes', 'catmemes'],
    random: () => 0,
    fetchImpl: async (url) => {
      calls.push(url);
      if (url.endsWith('/AnimalMemes')) {
        return {
          ok: true,
          json: async () => ({
            title: 'Not safe',
            subreddit: 'AnimalMemes',
            url: 'https://cdn.example/nsfw.png',
            nsfw: true,
          }),
        };
      }

      return {
        ok: true,
        json: async () => ({
          title: 'A very good cat',
          subreddit: 'catmemes',
          url: 'https://cdn.example/cat.png',
          postLink: 'https://redd.it/example',
          ups: 42,
          nsfw: false,
        }),
      };
    },
  });

  assert.equal(meme.title, 'A very good cat');
  assert.equal(meme.url, 'https://cdn.example/cat.png');
  assert.equal(meme.link, 'https://redd.it/example');
  assert.equal(meme.source, 'r/catmemes');
  assert.equal(meme.ups, 42);
  assert.equal(calls.length, 2);
});

test('animal meme feed fails clearly when every community fails', async () => {
  await assert.rejects(
    fetchAnimalMeme({
      subreddits: ['AnimalMemes'],
      fetchImpl: async () => ({ ok: false, status: 503 }),
    }),
    /No animal meme was available/,
  );
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
