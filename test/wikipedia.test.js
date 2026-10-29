const assert = require('node:assert/strict');
const test = require('node:test');

const {
  WikipediaError,
  fetchWikipedia,
  normalizeSearch,
  normalizeSummary,
  searchUrl,
  stripHtml,
  summaryUrl,
} = require('../src/lib/wikipedia');

const SEARCH_PAYLOAD = {
  query: {
    search: [
      {
        title: 'Ada Lovelace',
        snippet: '<span class="searchmatch">Ada</span> &amp; <b>Lovelace</b>',
        pageid: 1,
        timestamp: '2026-01-01T00:00:00Z',
      },
    ],
  },
};

const SUMMARY_PAYLOAD = {
  title: 'Ada Lovelace',
  description: 'English mathematician',
  extract: 'Ada Lovelace was an English mathematician and writer.',
  thumbnail: { source: 'https://upload.wikimedia.org/ada.jpg' },
  content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/Ada_Lovelace' } },
  timestamp: '2026-01-01T00:00:00Z',
  type: 'standard',
  pageid: 1,
};

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => payload,
  };
}

test('stripHtml removes MediaWiki markup and decodes entities', () => {
  assert.equal(stripHtml('<span>Ada</span> &amp; <b>Lovelace</b>'), 'Ada & Lovelace');
  assert.equal(stripHtml('Tom &quot;Q&quot; &#39;x&#39;'), 'Tom "Q" \'x\'');
  assert.equal(stripHtml('  spaced\n text  '), 'spaced text');
});

test('Wikipedia URLs encode the query and article title', () => {
  const search = new URL(searchUrl('Ada Lovelace'));
  assert.equal(search.origin, 'https://en.wikipedia.org');
  assert.equal(search.searchParams.get('action'), 'query');
  assert.equal(search.searchParams.get('srsearch'), 'Ada Lovelace');
  assert.match(summaryUrl('Ada Lovelace'), /\/Ada_Lovelace$/);
});

test('normalizeSearch and normalizeSummary map article fields', () => {
  const search = normalizeSearch(SEARCH_PAYLOAD);
  assert.equal(search.title, 'Ada Lovelace');
  assert.equal(search.snippet, 'Ada & Lovelace');
  assert.equal(search.pageId, 1);
  assert.equal(normalizeSearch({ query: { search: [] } }), null);

  const article = normalizeSummary(SUMMARY_PAYLOAD, search);
  assert.equal(article.title, 'Ada Lovelace');
  assert.equal(article.description, 'English mathematician');
  assert.equal(article.extract, 'Ada Lovelace was an English mathematician and writer.');
  assert.equal(article.thumbnail, 'https://upload.wikimedia.org/ada.jpg');
  assert.equal(article.url, 'https://en.wikipedia.org/wiki/Ada_Lovelace');
  assert.equal(article.timestamp, '2026-01-01T00:00:00Z');
  assert.equal(article.pageId, 1);
});

test('normalizeSummary falls back to search data and a generated URL', () => {
  const article = normalizeSummary(
    { title: 'Ada Lovelace', extract: '' },
    { title: 'Ada Lovelace', snippet: 'Fallback snippet', pageId: 1, timestamp: '2026-01-01T00:00:00Z' },
  );

  assert.equal(article.extract, 'Fallback snippet');
  assert.equal(article.pageId, 1);
  assert.equal(article.url, 'https://en.wikipedia.org/wiki/Ada_Lovelace');
});

test('fetchWikipedia searches first and then reads the summary', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return jsonResponse(calls.length === 1 ? SEARCH_PAYLOAD : SUMMARY_PAYLOAD);
  };

  const { article, search } = await fetchWikipedia('Ada Lovelace', { fetchImpl });
  assert.equal(search.title, 'Ada Lovelace');
  assert.equal(article.title, 'Ada Lovelace');
  assert.equal(article.extract, 'Ada Lovelace was an English mathematician and writer.');
  assert.equal(calls.length, 2);
  assert.match(calls[0], /action=query/);
  assert.match(calls[1], /Ada_Lovelace/);
});

test('fetchWikipedia falls back to the search snippet when the summary fails', async () => {
  const fetchImpl = async (url) => (
    url.includes('/w/api.php')
      ? jsonResponse(SEARCH_PAYLOAD)
      : { ok: false, status: 404 }
  );

  const { article } = await fetchWikipedia('Ada Lovelace', { fetchImpl });
  assert.equal(article.extract, 'Ada & Lovelace');
  assert.equal(article.title, 'Ada Lovelace');
});

test('fetchWikipedia reports invalid and missing queries', async () => {
  await assert.rejects(
    fetchWikipedia(' ', { fetchImpl: async () => jsonResponse(SEARCH_PAYLOAD) }),
    (error) => error instanceof WikipediaError && error.code === 'invalid',
  );

  await assert.rejects(
    fetchWikipedia('Nothing at all', { fetchImpl: async () => jsonResponse({ query: { search: [] } }) }),
    (error) => error instanceof WikipediaError && error.code === 'not_found',
  );

  await assert.rejects(
    fetchWikipedia('Ada Lovelace', { fetchImpl: async () => ({ ok: false, status: 503 }) }),
    (error) => error instanceof WikipediaError && error.code === 'unavailable',
  );
});
