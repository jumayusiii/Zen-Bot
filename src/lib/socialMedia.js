const BSKY_PUBLIC_API = 'https://public.api.bsky.app/xrpc';
const REDDIT_WEB = 'https://www.reddit.com';
const YOUTUBE_OEMBED = 'https://www.youtube.com/oembed';
const REQUEST_TIMEOUT_MS = 12000;
const USER_AGENT = 'Mozilla/5.0 (compatible; ZenBot/1.17; +https://github.com/jumayusiii/Zen-Bot)';

const BSKY_HANDLE = /^[a-z0-9](?:[a-z0-9.-]{0,251}[a-z0-9])?$/;
const SUBREDDIT_NAME = /^[a-z0-9_]{2,21}$/i;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

// Reddit's public Atom feeds are readable without OAuth. Keep the command to
// communities that are safe for a general-purpose Discord bot; the JSON API
// cannot be used to check the NSFW flag without credentials.
const SAFE_SUBREDDITS = Object.freeze([
  'popular',
  'aww',
  'cats',
  'dogs',
  'wholesomememes',
  'mademesmile',
  'interestingasfuck',
  'todayilearned',
  'science',
  'space',
  'technology',
  'gaming',
  'movies',
  'music',
  'art',
  'food',
  'nature',
  'dataisbeautiful',
  'programming',
]);

const SAFE_SUBREDDIT_SET = new Set(SAFE_SUBREDDITS);
const NAMED_ENTITIES = Object.freeze({
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
});

class SocialMediaError extends Error {
  /**
   * @param {'invalid'|'not_found'|'unavailable'|'rate_limited'} code
   * @param {string} message
   */
  constructor(code, message) {
    super(message);
    this.name = 'SocialMediaError';
    this.code = code;
  }
}

function decodeEntities(value) {
  return String(value ?? '').replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const hex = entity[1]?.toLowerCase() === 'x';
      const code = Number.parseInt(hex ? entity.slice(2) : entity.slice(1), hex ? 16 : 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : match;
    }

    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function stripHtml(value) {
  return decodeEntities(value)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function cleanText(value, maxLength = 500) {
  const text = decodeEntities(value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function cleanMultilineText(value, maxLength = 500) {
  const text = decodeEntities(value)
    .replace(/\r/g, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function formatCount(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return '0';
  if (number < 1000) return String(Math.round(number));

  const [divisor, suffix] = number >= 1_000_000_000
    ? [1_000_000_000, 'B']
    : number >= 1_000_000
      ? [1_000_000, 'M']
      : [1_000, 'K'];
  const scaled = number / divisor;
  return `${scaled >= 10 ? Math.round(scaled) : scaled.toFixed(1).replace(/\.0$/, '')}${suffix}`;
}

function safeHttps(value) {
  try {
    const url = new URL(String(value ?? ''));
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function numeric(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function parseBlueskyHandle(input) {
  if (typeof input !== 'string') return null;
  let raw = input.trim();
  if (!raw) return null;

  if (!/^https?:\/\//i.test(raw) && /^(?:www\.)?bsky\.app\//i.test(raw)) {
    raw = `https://${raw}`;
  }

  if (/^https?:\/\//i.test(raw)) {
    let url;
    try {
      url = new URL(raw);
    } catch {
      return null;
    }

    const host = url.hostname.toLowerCase();
    if (host !== 'bsky.app' && host !== 'www.bsky.app') return null;
    const match = url.pathname.match(/^\/profile\/([^/]+)/i);
    if (!match) return null;
    try {
      try {
      raw = decodeURIComponent(match[1]);
    } catch {
      return null;
    }
    } catch {
      return null;
    }
  }

  raw = raw.replace(/^@+/, '').toLowerCase().replace(/\.$/, '');
  if (!raw.includes('.') || raw.includes('..') || !BSKY_HANDLE.test(raw)) return null;
  if (raw.length > 253) return null;
  return raw;
}

function parseSubreddit(input) {
  if (typeof input !== 'string') return null;
  let raw = input.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    let url;
    try {
      url = new URL(raw);
    } catch {
      return null;
    }

    const host = url.hostname.toLowerCase();
    if (host !== 'reddit.com' && host !== 'www.reddit.com' && host !== 'old.reddit.com') return null;
    const match = url.pathname.match(/^\/r\/([^/]+)/i);
    if (!match) return null;
    raw = decodeURIComponent(match[1]);
  } else {
    raw = raw.replace(/^\/?r\//i, '').replace(/\/+$/, '');
  }

  if (!SUBREDDIT_NAME.test(raw)) return null;
  return raw.toLowerCase();
}

function isSafeSubreddit(name) {
  return SAFE_SUBREDDIT_SET.has(String(name ?? '').toLowerCase());
}

function parseYouTubeUrl(input) {
  if (typeof input !== 'string') return null;
  const raw = input.trim();
  if (!raw) return null;

  let id = null;

  if (YOUTUBE_ID.test(raw)) {
    id = raw;
  } else {
    if (!/^https?:\/\//i.test(raw)) return null;

    let url;
    try {
      url = new URL(raw);
    } catch {
      return null;
    }

    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') {
      id = url.pathname.split('/').filter(Boolean)[0] || null;
    } else if (
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com' ||
      host === 'youtube-nocookie.com'
    ) {
      const path = url.pathname.replace(/\/+$/, '');
      if (path === '/watch') {
        id = url.searchParams.get('v');
      } else {
        const match = path.match(/^\/(?:shorts|embed|live|v)\/([^/]+)$/i);
        id = match?.[1] ?? null;
      }
    }
  }

  if (!id || !YOUTUBE_ID.test(id)) return null;
  return { id, url: `https://www.youtube.com/watch?v=${id}` };
}

function firstTag(xml, tag) {
  const match = String(xml ?? '').match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'),
  );
  return match ? match[1] : '';
}

function firstAttribute(xml, tag, attribute) {
  const match = String(xml ?? '').match(
    new RegExp(`<${tag}\\b[^>]*\\b${attribute}="([^"]*)"`, 'i'),
  );
  return match ? decodeEntities(match[1]) : '';
}

/**
 * Maps Reddit's public Atom feed into the small shape the command renders.
 * Reddit's JSON endpoint is frequently blocked, while the Atom feed remains
 * public and needs no OAuth credentials.
 */
function parseRedditAtom(xml) {
  const entries = (String(xml ?? '').match(/<entry\b[^>]*>[\s\S]*?<\/entry>/gi) || [])
    .map((entry) => {
      const authorBlock = firstTag(entry, 'author');
      const author = cleanText(firstTag(authorBlock, 'name'), 80).replace(/^\/?u\//i, '');
      const url = safeHttps(firstAttribute(entry, 'link', 'href'));
      const title = cleanText(stripHtml(firstTag(entry, 'title')), 220);
      const published = cleanText(firstTag(entry, 'published'), 40);
      const thumbnail = safeHttps(
        firstAttribute(entry, 'media:thumbnail', 'url') ||
        firstAttribute(entry, 'media:content', 'url'),
      );

      if (!title || !url) return null;

      return {
        title,
        url,
        author: author || 'unknown',
        published,
        image: thumbnail,
      };
    })
    .filter(Boolean);

  const category = firstAttribute(xml, 'category', 'term');
  const description = cleanText(stripHtml(firstTag(xml, 'subtitle')), 500);
  const icon = safeHttps(firstTag(xml, 'icon') || firstTag(xml, 'logo'));

  return {
    subreddit: category ? category.toLowerCase() : null,
    title: cleanText(stripHtml(firstTag(xml, 'title')), 100),
    description,
    icon,
    updated: cleanText(firstTag(xml, 'updated'), 40),
    entries,
  };
}

async function request(url, { fetchImpl = globalThis.fetch, accept = '*/*', source } = {}) {
  let response;
  try {
    response = await fetchImpl(url, {
      headers: {
        accept,
        'user-agent': USER_AGENT,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new SocialMediaError(
      'unavailable',
      `${source} could not be reached right now. Please try again in a moment.`,
    );
  }

  return response;
}

async function requestJson(url, {
  fetchImpl,
  accept = 'application/json',
  source,
  notFoundStatuses = [404],
  notFoundMessage,
}) {
  const response = await request(url, { fetchImpl, accept, source });
  if (notFoundStatuses.includes(response.status)) {
    throw new SocialMediaError('not_found', notFoundMessage || `${source} could not find that item.`);
  }
  if (response.status === 429) {
    throw new SocialMediaError('rate_limited', `${source} is rate-limiting Zen right now. Try again in a minute.`);
  }
  if (!response.ok) {
    throw new SocialMediaError('unavailable', `${source} is unavailable right now. Please try again in a moment.`);
  }

  try {
    return await response.json();
  } catch {
    throw new SocialMediaError('unavailable', `${source} returned an unreadable response.`);
  }
}

function normalizeBlueskyProfile(profile) {
  const handle = cleanText(profile?.handle, 253).toLowerCase();
  if (!handle) return null;

  return {
    did: cleanText(profile.did, 100) || null,
    handle,
    displayName: cleanMultilineText(profile.displayName, 100) || `@${handle}`,
    description: cleanMultilineText(profile.description, 500),
    avatar: safeHttps(profile.avatar),
    banner: safeHttps(profile.banner),
    followers: numeric(profile.followersCount),
    following: numeric(profile.followsCount),
    posts: numeric(profile.postsCount),
    createdAt: cleanText(profile.createdAt, 40),
    url: `https://bsky.app/profile/${encodeURIComponent(handle)}`,
  };
}

function normalizeBlueskyPost(post) {
  if (!post || typeof post !== 'object' || !post.uri) return null;
  const author = post.author && typeof post.author === 'object' ? post.author : {};
  const handle = cleanText(author.handle, 253).toLowerCase();
  const rkey = String(post.uri).split('/').pop();
  if (!handle || !rkey) return null;

  const embed = post.embed && typeof post.embed === 'object' ? post.embed : {};
  const imageCandidates = [
    ...(Array.isArray(embed.images) ? embed.images : []),
    ...(Array.isArray(embed.items) ? embed.items : []),
    embed.external ? { thumb: embed.external.thumb } : null,
  ]
    .map((item) => safeHttps(item?.thumb || item?.thumbnail || item?.fullsize || item?.uri))
    .filter(Boolean);

  return {
    uri: post.uri,
    url: `https://bsky.app/profile/${encodeURIComponent(handle)}/post/${encodeURIComponent(rkey)}`,
    author: {
      handle,
      displayName: cleanMultilineText(author.displayName, 100) || `@${handle}`,
      avatar: safeHttps(author.avatar),
    },
    text: cleanMultilineText(post.record?.text, 500) || 'No text in this post.',
    createdAt: cleanText(post.record?.createdAt || post.indexedAt, 40),
    image: imageCandidates[0] || null,
    likes: numeric(post.likeCount),
    replies: numeric(post.replyCount),
    reposts: numeric(post.repostCount),
    quotes: numeric(post.quoteCount),
  };
}

async function fetchBluesky(handleInput, { fetchImpl = globalThis.fetch } = {}) {
  const handle = parseBlueskyHandle(handleInput);
  if (!handle) {
    throw new SocialMediaError(
      'invalid',
      'Enter a Bluesky handle like `bsky.app` or `@someone.bsky.social`.',
    );
  }

  const profile = await requestJson(
    `${BSKY_PUBLIC_API}/app.bsky.actor.getProfile?actor=${encodeURIComponent(handle)}`,
    {
      fetchImpl,
      source: 'Bluesky',
      notFoundStatuses: [400, 404],
      notFoundMessage: 'Bluesky could not find that account.',
    },
  );
  const normalized = normalizeBlueskyProfile(profile);
  if (!normalized) {
    throw new SocialMediaError('not_found', 'Bluesky could not find that account.');
  }

  let latestPost = null;
  let postUnavailable = false;
  try {
    const feed = await requestJson(
      `${BSKY_PUBLIC_API}/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(handle)}&limit=1&filter=posts_no_replies`,
      { fetchImpl, source: 'Bluesky' },
    );
    latestPost = normalizeBlueskyPost(Array.isArray(feed?.feed) ? feed.feed[0]?.post : null);
  } catch (error) {
    if (!(error instanceof SocialMediaError) || error.code !== 'not_found') {
      postUnavailable = true;
    }
  }

  return { profile: normalized, latestPost, postUnavailable };
}

async function fetchReddit(subredditInput, { fetchImpl = globalThis.fetch, random = Math.random } = {}) {
  const subreddit = parseSubreddit(subredditInput);
  if (!subreddit) {
    throw new SocialMediaError('invalid', 'Enter a subreddit like `aww`, `r/aww` or `popular`.');
  }
  if (!isSafeSubreddit(subreddit)) {
    throw new SocialMediaError(
      'invalid',
      `That community is not on Zen's SFW list. Try one of: ${SAFE_SUBREDDITS.slice(0, 8).map((name) => `\`${name}\``).join(', ')}.`,
    );
  }

  const response = await request(
    `${REDDIT_WEB}/r/${encodeURIComponent(subreddit)}/hot/.rss`,
    {
      fetchImpl,
      accept: 'application/atom+xml,application/xml;q=0.9,*/*;q=0.8',
      source: 'Reddit',
    },
  );

  if (response.status === 404) {
    throw new SocialMediaError('not_found', 'Reddit could not find that community.');
  }
  if (response.status === 429) {
    throw new SocialMediaError('rate_limited', 'Reddit is rate-limiting Zen right now. Try again in a minute.');
  }
  if (!response.ok) {
    throw new SocialMediaError('unavailable', 'Reddit’s public feed is unavailable right now. Please try again in a moment.');
  }

  let xml;
  try {
    xml = await response.text();
  } catch {
    throw new SocialMediaError('unavailable', 'Reddit returned an unreadable feed.');
  }

  const feed = parseRedditAtom(xml);
  const candidates = feed.entries.filter((entry) => !/automoderator/i.test(entry.author));
  if (candidates.length === 0) {
    throw new SocialMediaError('unavailable', 'Reddit returned no public posts for that community.');
  }

  const index = Math.min(
    candidates.length - 1,
    Math.floor(Math.max(0, Number(random()) || 0) * candidates.length),
  );

  return {
    ...feed,
    subreddit: feed.subreddit || subreddit,
    url: `${REDDIT_WEB}/r/${encodeURIComponent(subreddit)}/`,
    entry: candidates[index],
  };
}

async function fetchYouTube(input, { fetchImpl = globalThis.fetch } = {}) {
  const parsed = parseYouTubeUrl(typeof input === 'object' && input?.id ? input.id : input);
  if (!parsed) {
    throw new SocialMediaError('invalid', 'Paste a YouTube video link, Shorts link or 11-character video ID.');
  }

  const payload = await requestJson(
    `${YOUTUBE_OEMBED}?url=${encodeURIComponent(parsed.url)}&format=json`,
    {
      fetchImpl,
      source: 'YouTube',
      notFoundStatuses: [400, 401, 403, 404],
      notFoundMessage: 'That YouTube video is private, removed or unavailable.',
    },
  );

  if (!payload?.title || !payload?.author_name) {
    throw new SocialMediaError('not_found', 'YouTube could not find that video.');
  }

  return {
    id: parsed.id,
    url: parsed.url,
    title: cleanText(payload.title, 200),
    author: cleanText(payload.author_name, 100),
    authorUrl: safeHttps(payload.author_url),
    thumbnail: safeHttps(payload.thumbnail_url) ||
      `https://i.ytimg.com/vi/${encodeURIComponent(parsed.id)}/hqdefault.jpg`,
  };
}

module.exports = {
  SAFE_SUBREDDITS,
  SocialMediaError,
  cleanText,
  decodeEntities,
  fetchBluesky,
  fetchReddit,
  fetchYouTube,
  formatCount,
  isSafeSubreddit,
  normalizeBlueskyPost,
  normalizeBlueskyProfile,
  parseBlueskyHandle,
  parseRedditAtom,
  parseSubreddit,
  parseYouTubeUrl,
  safeHttps,
  stripHtml,
};
