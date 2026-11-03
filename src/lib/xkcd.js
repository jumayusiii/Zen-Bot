const XKCD_LATEST = 'https://xkcd.com/info.0.json';
const XKCD_COMIC = (number) => `https://xkcd.com/${number}/info.0.json`;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_ATTEMPTS = 4;
const RETIRED_COMICS = new Set([404]);

function timeoutSignal() {
  return typeof AbortSignal?.timeout === 'function'
    ? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    : undefined;
}

function safeUrl(value, protocol = 'https:') {
  try {
    const url = new URL(String(value));
    return url.protocol === protocol ? url.toString() : null;
  } catch {
    return null;
  }
}

async function fetchJson(url, fetchImpl = globalThis.fetch) {
  const response = await fetchImpl(url, {
    headers: { accept: 'application/json' },
    signal: timeoutSignal(),
  });

  if (!response.ok) {
    throw new Error(`xkcd responded with HTTP ${response.status} for ${url}`);
  }

  return response.json();
}

function normalizeComic(payload) {
  const number = Math.floor(Number(payload?.num));
  const image = safeUrl(payload?.img);
  const page = safeUrl(`https://xkcd.com/${number}/`);
  const title = String(payload?.title ?? '').trim();

  if (!Number.isFinite(number) || number <= 0) {
    throw new Error('xkcd returned a comic without a number.');
  }
  if (!image) {
    throw new Error('xkcd returned a comic without a usable image.');
  }

  const year = Math.floor(Number(payload?.year) || 0);
  const month = Math.floor(Number(payload?.month) || 0);
  const day = Math.floor(Number(payload?.day) || 0);
  const published = year && month && day
    ? `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    : null;

  return {
    number,
    title: title || `Comic ${number}`,
    alt: String(payload?.alt ?? '').trim(),
    image,
    page,
    published,
    source: 'xkcd',
  };
}

/**
 * Picks a random xkcd comic. Comic 404 does not exist, and a missing number
 * is retried with a fresh pick so one bad draw cannot fail the command.
 *
 * @param {{fetchImpl?: typeof fetch, random?: () => number}} [options]
 * @returns {Promise<object>}
 */
async function fetchXkcdComic({ fetchImpl = globalThis.fetch, random = Math.random } = {}) {
  const latest = await fetchJson(XKCD_LATEST, fetchImpl);
  const highest = Math.floor(Number(latest?.num));
  if (!Number.isFinite(highest) || highest <= 0) {
    throw new Error('xkcd did not report its latest comic.');
  }

  let lastError = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = 1 + Math.floor(Math.min(0.999999, Math.max(0, random())) * highest);
    if (RETIRED_COMICS.has(candidate)) continue;

    try {
      return normalizeComic(await fetchJson(XKCD_COMIC(candidate), fetchImpl));
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`Could not load a random xkcd comic (${lastError?.message || 'no comic found'}).`);
}

module.exports = {
  MAX_ATTEMPTS,
  RETIRED_COMICS,
  XKCD_COMIC,
  XKCD_LATEST,
  fetchXkcdComic,
  normalizeComic,
};
