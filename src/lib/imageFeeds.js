const CAT_API = 'https://api.thecatapi.com/v1/images/search?limit=1&size=med';
const DOG_API = 'https://dog.ceo/api/breeds/image/random';
const MEMEGEN_BASE = 'https://api.memegen.link/images';
const MEME_WIDTH = 800;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_MEME_TEXT_LENGTH = 120;

const MEME_TEMPLATES = Object.freeze([
  { name: 'Drake — approve / reject', value: 'drake' },
  { name: 'This is fine', value: 'fine' },
  { name: 'Doge', value: 'doge' },
  { name: 'Success kid', value: 'success' },
  { name: 'Feels bad man', value: 'sadfrog' },
  { name: "Gru's plan", value: 'gru' },
]);

const TEMPLATE_IDS = new Set(MEME_TEMPLATES.map((template) => template.value));

function timeoutSignal() {
  return typeof AbortSignal?.timeout === 'function'
    ? AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    : undefined;
}

function safeImageUrl(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === 'https:' ? url.toString() : null;
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
    throw new Error(`${new URL(url).host} responded with HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Fetches one random cat photo. The Cat API is public and needs no key.
 *
 * @param {{fetchImpl?: typeof fetch}} [options]
 * @returns {Promise<{url: string, source: string, id: string|null}>}
 */
async function fetchCatImage({ fetchImpl = globalThis.fetch } = {}) {
  const payload = await fetchJson(CAT_API, fetchImpl);
  const candidate = Array.isArray(payload) ? payload.find((item) => item?.url) : null;
  const url = safeImageUrl(candidate?.url);

  if (!url) throw new Error('The Cat API returned no usable image.');

  return {
    url,
    source: 'The Cat API',
    id: candidate.id ? String(candidate.id) : null,
  };
}

/**
 * Fetches one random dog photo from the public Dog CEO API.
 *
 * @param {{fetchImpl?: typeof fetch}} [options]
 * @returns {Promise<{url: string, source: string, breed: string|null}>}
 */
async function fetchDogImage({ fetchImpl = globalThis.fetch } = {}) {
  const payload = await fetchJson(DOG_API, fetchImpl);
  const url = safeImageUrl(payload?.message);

  if (payload?.status !== 'success' || !url) {
    throw new Error('Dog CEO returned no usable image.');
  }

  const breed = url.match(/\/breeds\/([^/]+)\//)?.[1] ?? null;

  return {
    url,
    source: 'Dog CEO',
    breed,
  };
}

/**
 * Escapes text for the memegen.link path format.
 * @see https://api.memegen.link/docs/
 */
function escapeMemeText(value) {
  return String(value ?? '')
    .trim()
    .replace(/-/g, '--')
    .replace(/_/g, '__')
    .replace(/ /g, '_')
    .replace(/\?/g, '~q')
    .replace(/&/g, '~a')
    .replace(/%/g, '~p')
    .replace(/#/g, '~h')
    .replace(/\//g, '~s')
    .replace(/\\/g, '~b')
    .replace(/</g, '~l')
    .replace(/>/g, '~g')
    .replace(/"/g, "''");
}

/**
 * Builds an editable meme image URL. The top line is required; the bottom line
 * is optional and is omitted cleanly when blank.
 *
 * @param {string} template
 * @param {string} top
 * @param {string} [bottom]
 * @returns {string}
 */
function buildMemeUrl(template, top, bottom = '') {
  const selected = String(template ?? '').trim();
  const topText = String(top ?? '').trim().slice(0, MAX_MEME_TEXT_LENGTH);
  const bottomText = String(bottom ?? '').trim().slice(0, MAX_MEME_TEXT_LENGTH);

  if (!TEMPLATE_IDS.has(selected)) {
    throw new Error('Choose one of the available meme templates.');
  }
  if (!topText) throw new Error('Write the top line of the meme.');

  const base = `${MEMEGEN_BASE}/${selected}/${encodeURIComponent(escapeMemeText(topText))}`;

  if (bottomText) {
    return `${base}/${encodeURIComponent(escapeMemeText(bottomText))}.png?width=${MEME_WIDTH}`;
  }

  return `${base}.png?width=${MEME_WIDTH}`;
}

module.exports = {
  CAT_API,
  DOG_API,
  MAX_MEME_TEXT_LENGTH,
  MEME_TEMPLATES,
  MEMEGEN_BASE,
  buildMemeUrl,
  escapeMemeText,
  fetchCatImage,
  fetchDogImage,
  safeImageUrl,
};
