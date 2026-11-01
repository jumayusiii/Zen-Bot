const CAT_API = 'https://api.thecatapi.com/v1/images/search?limit=1&size=med';
const DOG_API = 'https://dog.ceo/api/breeds/image/random';
const MEMEGEN_BASE = 'https://api.memegen.link/images';
const ANIMAL_MEME_BASE = 'https://meme-api.com/gimme';
const MEME_WIDTH = 800;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_MEME_TEXT_LENGTH = 120;
const MAX_BACKGROUND_URL_LENGTH = 500;

const ANIMAL_SUBREDDITS = Object.freeze([
  'AnimalMemes',
  'catmemes',
  'dogmemes',
  'AnimalsBeingDerps',
  'aww',
]);

const MEME_TEMPLATES = Object.freeze([
  { name: 'Drake — approve / reject', value: 'drake' },
  { name: 'This is fine', value: 'fine' },
  { name: 'Doge', value: 'doge' },
  { name: 'Success kid', value: 'success' },
  { name: 'Feels bad man', value: 'sadfrog' },
  { name: "Gru's plan", value: 'gru' },
  { name: 'Grumpy Cat', value: 'grumpycat' },
  { name: 'Bongo Cat', value: 'bongo' },
  { name: 'I should buy a boat cat', value: 'boat' },
  { name: 'Persian cat room guardian', value: 'persian' },
  { name: 'Seal of approval', value: 'soa' },
  { name: 'Socially awesome penguin', value: 'awesome' },
  { name: 'Sarcastic bear', value: 'sarcasticbear' },
  { name: 'Woman yelling at a cat', value: 'woman-cat' },
]);

const MEME_FONTS = Object.freeze([
  { name: 'Impact (classic)', value: 'impact' },
  { name: 'Titillium Web', value: 'titilliumweb' },
  { name: 'Noto Sans', value: 'notosans' },
  { name: 'Kalam (handwritten)', value: 'kalam' },
  { name: 'Segoe UI', value: 'segoe' },
  { name: 'Ming-style serif', value: 'hgminchob' },
]);

const MEME_COLORS = Object.freeze([
  { name: 'White text, black outline', value: 'white,black' },
  { name: 'Black text, white outline', value: 'black,white' },
  { name: 'Yellow text, black outline', value: 'yellow,black' },
  { name: 'Pink text, black outline', value: '#ff6fb5,black' },
  { name: 'Cyan text, black outline', value: '#4adede,black' },
  { name: 'Orange text, black outline', value: '#ff8a5c,black' },
]);

const MEME_LAYOUTS = Object.freeze([
  { name: 'Template default', value: 'default' },
  { name: 'All text at the top', value: 'top' },
]);

const TEMPLATE_IDS = new Set(MEME_TEMPLATES.map((template) => template.value));
const FONT_IDS = new Set(MEME_FONTS.map((font) => font.value));
const COLOR_VALUES = new Set(MEME_COLORS.map((color) => color.value));
const LAYOUT_VALUES = new Set(MEME_LAYOUTS.map((layout) => layout.value));

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
 * Fetches one random animal meme from a rotating list of public subreddits.
 * Each source is tried once so a slow or empty community cannot fail the
 * command on its own.
 *
 * @param {{fetchImpl?: typeof fetch, subreddits?: string[], random?: () => number}} [options]
 * @returns {Promise<{url: string, title: string, link: string, source: string, subreddit: string, ups: number}>}
 */
async function fetchAnimalMeme({
  fetchImpl = globalThis.fetch,
  subreddits = ANIMAL_SUBREDDITS,
  random = Math.random,
} = {}) {
  const pool = [...subreddits].filter(Boolean);
  if (pool.length === 0) throw new Error('No animal meme communities are configured.');

  const offset = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  let lastError = null;

  for (let attempt = 0; attempt < pool.length; attempt += 1) {
    const subreddit = pool[(offset + attempt) % pool.length];
    try {
      const payload = await fetchJson(
        `${ANIMAL_MEME_BASE}/${encodeURIComponent(subreddit)}`,
        fetchImpl,
      );
      const url = safeImageUrl(payload?.url);
      if (!url) throw new Error('the feed returned no usable image');
      if (payload?.nsfw) throw new Error('the feed returned an NSFW post');

      const link = safeImageUrl(payload?.postLink) ?? url;
      return {
        url,
        title: String(payload?.title || 'Animal meme').trim().slice(0, 256) || 'Animal meme',
        link,
        source: `r/${payload?.subreddit || subreddit}`,
        subreddit: String(payload?.subreddit || subreddit),
        ups: Math.max(0, Math.floor(Number(payload?.ups) || 0)),
      };
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(`No animal meme was available (${lastError?.message || 'all feeds failed'}).`);
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
 * is optional and is omitted cleanly when blank. Font, colour, layout,
 * uppercase text and a custom HTTPS background are optional.
 *
 * @param {string} template
 * @param {string} top
 * @param {string} [bottom]
 * @param {{font?: string, color?: string, layout?: string, uppercase?: boolean, background?: string}} [options]
 * @returns {string}
 */
function buildMemeUrl(template, top, bottom = '', options = {}) {
  const selected = String(template ?? '').trim();
  let topText = String(top ?? '').trim().slice(0, MAX_MEME_TEXT_LENGTH);
  let bottomText = String(bottom ?? '').trim().slice(0, MAX_MEME_TEXT_LENGTH);

  if (!TEMPLATE_IDS.has(selected)) {
    throw new Error('Choose one of the available meme templates.');
  }
  if (!topText) throw new Error('Write the top line of the meme.');

  if (options.uppercase) {
    topText = topText.toUpperCase();
    bottomText = bottomText.toUpperCase();
  }

  const base = `${MEMEGEN_BASE}/${selected}/${encodeURIComponent(escapeMemeText(topText))}`;
  const suffix = bottomText
    ? `/${encodeURIComponent(escapeMemeText(bottomText))}.png`
    : '.png';

  const query = new URLSearchParams({ width: String(MEME_WIDTH) });

  if (options.font) {
    if (!FONT_IDS.has(options.font)) throw new Error('Choose one of the available meme fonts.');
    query.set('font', options.font);
  }

  if (options.color) {
    if (!COLOR_VALUES.has(options.color)) {
      throw new Error('Choose one of the available meme text colours.');
    }
    query.set('color', options.color);
  }

  if (options.layout) {
    if (!LAYOUT_VALUES.has(options.layout)) {
      throw new Error('Choose the default or top text layout.');
    }
    query.set('layout', options.layout);
  }

  if (options.background) {
    const background = String(options.background).trim();
    if (background.length > MAX_BACKGROUND_URL_LENGTH || !safeImageUrl(background)) {
      throw new Error('The background must be a valid HTTPS image URL.');
    }
    query.set('background', background);
  }

  return `${base}${suffix}?${query.toString()}`;
}

module.exports = {
  ANIMAL_MEME_BASE,
  ANIMAL_SUBREDDITS,
  CAT_API,
  DOG_API,
  MAX_BACKGROUND_URL_LENGTH,
  MAX_MEME_TEXT_LENGTH,
  MEME_COLORS,
  MEME_FONTS,
  MEME_LAYOUTS,
  MEME_TEMPLATES,
  MEMEGEN_BASE,
  buildMemeUrl,
  escapeMemeText,
  fetchAnimalMeme,
  fetchCatImage,
  fetchDogImage,
  safeImageUrl,
};
