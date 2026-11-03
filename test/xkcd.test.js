const assert = require('node:assert/strict');
const test = require('node:test');

const { XKCD_COMIC, XKCD_LATEST, fetchXkcdComic } = require('../src/lib/xkcd');

function comicPayload(number) {
  return {
    num: number,
    title: `Comic ${number}`,
    alt: `Alt text for ${number}`,
    img: `https://imgs.xkcd.com/comics/${number}.png`,
    year: '2026',
    month: '11',
    day: '3',
  };
}

function jsonResponse(payload) {
  return { ok: true, status: 200, json: async () => payload };
}

function missingResponse() {
  return { ok: false, status: 404, json: async () => ({}) };
}

test('fetchXkcdComic returns a random comic with a page and image', async () => {
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(url);
    if (url === XKCD_LATEST) return jsonResponse({ num: 3000 });
    return jsonResponse(comicPayload(1234));
  };

  const comic = await fetchXkcdComic({ fetchImpl, random: () => 0.411 });

  assert.equal(comic.number, 1234);
  assert.equal(comic.title, 'Comic 1234');
  assert.equal(comic.alt, 'Alt text for 1234');
  assert.equal(comic.image, 'https://imgs.xkcd.com/comics/1234.png');
  assert.equal(comic.page, 'https://xkcd.com/1234/');
  assert.equal(comic.published, '2026-11-03');
  assert.deepEqual(requested, [XKCD_LATEST, XKCD_COMIC(1234)]);
});

test('fetchXkcdComic skips the retired comic 404 and retries a missing number', async () => {
  const requested = [];
  const fetchImpl = async (url) => {
    requested.push(url);
    if (url === XKCD_LATEST) return jsonResponse({ num: 1000 });
    if (url === XKCD_COMIC(404)) throw new Error('comic 404 should never be requested');
    if (url === XKCD_COMIC(500)) return missingResponse();
    return jsonResponse(comicPayload(501));
  };

  const values = [0.403, 0.499, 0.5];
  const random = () => values.shift() ?? 0.5;

  const comic = await fetchXkcdComic({ fetchImpl, random });

  assert.equal(comic.number, 501);
  assert.ok(!requested.includes(XKCD_COMIC(404)));
  assert.ok(requested.includes(XKCD_COMIC(500)));
});

test('fetchXkcdComic fails clearly when xkcd is unavailable', async () => {
  await assert.rejects(
    fetchXkcdComic({
      fetchImpl: async () => {
        throw new Error('network down');
      },
    }),
    /network down/,
  );
});
