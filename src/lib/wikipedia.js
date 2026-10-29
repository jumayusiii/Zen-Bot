const SEARCH_ENDPOINT = 'https://en.wikipedia.org/w/api.php';
const SUMMARY_ENDPOINT = 'https://en.wikipedia.org/api/rest_v1/page/summary/';
const REQUEST_TIMEOUT_MS = 10000;
const USER_AGENT = 'Mozilla/5.0 (compatible; ZenBot/1.12; +https://github.com/jumayusiii/Zen-Bot)';

class WikipediaError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'WikipediaError';
    this.code = code;
  }
}

function cleanText(value, maxLength = 120) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

/** Removes the HTML markup used in MediaWiki search snippets. */
function stripHtml(value) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal) => String.fromCodePoint(Number(decimal)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function searchUrl(query) {
  const url = new URL(SEARCH_ENDPOINT);
  url.search = new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: query,
    srlimit: '1',
    format: 'json',
    origin: '*',
  }).toString();
  return url.href;
}

function summaryUrl(title) {
  return `${SUMMARY_ENDPOINT}${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

function normalizeSearch(payload) {
  const result = payload?.query?.search?.[0];
  if (!result?.title) return null;

  return {
    title: stripHtml(result.title),
    snippet: stripHtml(result.snippet),
    pageId: Number.isFinite(Number(result.pageid)) ? Number(result.pageid) : null,
    timestamp: typeof result.timestamp === 'string' ? result.timestamp : null,
  };
}

function normalizeSummary(payload, fallback = {}) {
  if (!payload || typeof payload !== 'object') return null;

  const title = stripHtml(payload.title ?? fallback.title);
  if (!title) return null;

  const extract = stripHtml(payload.extract) || fallback.snippet || '';
  const description = stripHtml(payload.description);
  const thumbnail = typeof payload.thumbnail?.source === 'string' ? payload.thumbnail.source : null;
  const url = payload.content_urls?.desktop?.page
    || `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
  const timestamp = typeof payload.timestamp === 'string' ? payload.timestamp : fallback.timestamp ?? null;

  return {
    title,
    description,
    extract,
    thumbnail,
    url,
    type: typeof payload.type === 'string' ? payload.type : 'standard',
    timestamp,
    pageId: Number.isFinite(Number(payload.pageid)) ? Number(payload.pageid) : fallback.pageId ?? null,
  };
}

async function fetchJson(url, fetchImpl) {
  let response;

  try {
    response = await fetchImpl(url, {
      headers: {
        accept: 'application/json',
        'user-agent': USER_AGENT,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new WikipediaError('unavailable', 'Wikipedia could not be reached right now. Please try again in a moment.');
  }

  if (!response.ok) {
    throw new WikipediaError('unavailable', 'Wikipedia could not return that article. Please try again in a moment.');
  }

  try {
    return await response.json();
  } catch {
    throw new WikipediaError('unavailable', 'Wikipedia returned an unreadable response. Please try again.');
  }
}

/**
 * Searches Wikipedia and returns the best matching article summary.
 *
 * @param {string} input
 * @param {{fetchImpl?: typeof fetch}} [options]
 */
async function fetchWikipedia(input, { fetchImpl = globalThis.fetch } = {}) {
  const query = cleanText(input, 120);

  if (query.length < 2) {
    throw new WikipediaError('invalid', 'Enter a topic between 2 and 120 characters.');
  }

  const search = normalizeSearch(await fetchJson(searchUrl(query), fetchImpl));
  if (!search) {
    throw new WikipediaError('not_found', `I could not find a Wikipedia article for **${query}**. Try a different spelling or a broader topic.`);
  }

  let summaryPayload;
  try {
    summaryPayload = await fetchJson(summaryUrl(search.title), fetchImpl);
  } catch (error) {
    if (!(error instanceof WikipediaError)) throw error;
    summaryPayload = {
      title: search.title,
      extract: search.snippet,
      timestamp: search.timestamp,
    };
  }

  const article = normalizeSummary(summaryPayload, search);
  if (!article) {
    throw new WikipediaError('unavailable', 'I found a Wikipedia article but could not read its summary. Please try again.');
  }

  if (!article.extract && article.description) article.extract = article.description;
  return { article, search };
}

module.exports = {
  WikipediaError,
  fetchWikipedia,
  normalizeSearch,
  normalizeSummary,
  searchUrl,
  stripHtml,
  summaryUrl,
};
