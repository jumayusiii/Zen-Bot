const TIKWM_API = 'https://www.tikwm.com/api/';
const REQUEST_TIMEOUT_MS = 15000;
const DOWNLOAD_TIMEOUT_MS = 45000;
// Discord's default upload cap is 10 MiB. Stay below it so the attachment
// never fails at the API for a plain, unboosted server.
const MAX_VIDEO_BYTES = 8 * 1024 * 1024;
const USER_AGENT = 'Mozilla/5.0 (compatible; ZenBot/1.12; +https://github.com/jumayusiii/Zen-Bot)';
const UNAVAILABLE_MESSAGE = 'TikTok did not return that video. It may be private, region-locked or removed.';
const SHORT_HOSTS = new Set(['vm.tiktok.com', 'vt.tiktok.com']);
const VIDEO_PATH = /^\/@[^/]+\/(?:video|photo)\/(\d{6,25})\/?$/i;
const SHORT_PATH = /^\/(?:t\/)?[A-Za-z0-9]{5,32}\/?$/;
const NAMED_ENTITIES = Object.freeze({
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
});

class TikTokError extends Error {
  /**
   * @param {'invalid'|'unavailable'|'too_large'|'download_failed'} code
   * @param {string} message User-facing explanation.
   */
  constructor(code, message) {
    super(message);
    this.name = 'TikTokError';
    this.code = code;
  }
}

/**
 * Accepts a TikTok video link and returns the canonical URL plus its video id.
 * Short share links (vm.tiktok.com/…, /t/…) have no id until TikTok resolves them.
 *
 * @param {string} input
 * @returns {{href: string, videoId: string|null, short: boolean, host: string}|null}
 */
function parseTikTokUrl(input) {
  if (typeof input !== 'string') return null;
  const trimmed = input.trim();
  if (!trimmed || trimmed.length > 2048) return null;

  let url;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

  const host = url.hostname.toLowerCase();
  if (host !== 'tiktok.com' && !host.endsWith('.tiktok.com')) return null;

  const path = url.pathname.replace(/\/+$/, '') || '/';
  const video = path.match(VIDEO_PATH);

  if (video) {
    return {
      href: `https://www.tiktok.com${path}`,
      videoId: video[1],
      short: false,
      host,
    };
  }

  const isShort = SHORT_HOSTS.has(host) || path.startsWith('/t/');
  if (isShort && SHORT_PATH.test(path)) {
    return {
      href: `https://${host}${path}`,
      videoId: null,
      short: true,
      host,
    };
  }

  return null;
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

function cleanText(value, maxLength = 300) {
  const text = decodeEntities(value)
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function toCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function formatCount(value) {
  const number = toCount(value);
  if (number < 1000) return String(number);

  const [divisor, suffix] = number >= 1_000_000_000
    ? [1_000_000_000, 'B']
    : number >= 1_000_000
      ? [1_000_000, 'M']
      : [1_000, 'K'];
  const scaled = number / divisor;

  return `${scaled >= 10 ? Math.round(scaled) : scaled.toFixed(1).replace(/\.0$/, '')}${suffix}`;
}

function formatBytes(bytes) {
  return `${(Number(bytes) / (1024 * 1024)).toFixed(1)} MB`;
}

function isPrivateHost(hostname) {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (/^(?:::1?|f[cd][0-9a-f]{2}:|fe80:)/.test(host)) return true;

  const parts = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!parts) return false;

  const octets = parts.slice(1).map(Number);
  if (octets.some((octet) => octet > 255)) return true;

  const [first, second] = octets;
  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    first >= 224
  );
}

/** Media URLs come from a third-party API, so only public HTTPS hosts are fetched. */
function assertPublicHttpsUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new TikTokError('unavailable', 'TikTok returned an unexpected video address.');
  }

  if (url.protocol !== 'https:' || isPrivateHost(url.hostname)) {
    throw new TikTokError('unavailable', 'TikTok returned an unexpected video address.');
  }

  return url;
}

/**
 * Maps a tikwm.com payload into the small shape the command renders.
 * Kept separate from the fetch so the mapping can be tested offline.
 */
function normalizeApiPayload(payload) {
  if (!payload || typeof payload !== 'object' || payload.code !== 0 || !payload.data) {
    throw new TikTokError('unavailable', UNAVAILABLE_MESSAGE);
  }

  const data = payload.data;
  const images = Array.isArray(data.images)
    ? data.images.filter((image) => typeof image === 'string' && image.length > 0)
    : [];
  const videoUrl = data.hdplay || data.play || data.wmplay || null;

  if (!videoUrl && images.length === 0) {
    throw new TikTokError('unavailable', UNAVAILABLE_MESSAGE);
  }

  const author = data.author && typeof data.author === 'object' ? data.author : {};
  const username = cleanText(author.unique_id, 60) || null;
  const nickname = cleanText(author.nickname, 80) || (username ? `@${username}` : 'Unknown creator');
  const duration = Number(data.duration);
  const isHd = Boolean(data.hdplay) && videoUrl === data.hdplay;
  const declaredSize = Number(isHd ? data.hd_size : data.size);
  const cover = [data.origin_cover, data.cover, data.ai_dynamic_cover, images[0]]
    .find((value) => typeof value === 'string' && value.length > 0) || null;

  return {
    id: cleanText(data.id, 30) || null,
    kind: images.length > 0 && !videoUrl ? 'images' : 'video',
    title: cleanText(data.title, 200) || null,
    author: {
      username,
      nickname,
      avatarUrl: typeof author.avatar === 'string' ? author.avatar : null,
      url: username ? `https://www.tiktok.com/@${encodeURIComponent(username)}` : null,
    },
    durationSeconds: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : null,
    videoUrl,
    cover,
    images,
    sizeBytes: Number.isFinite(declaredSize) && declaredSize > 0 ? declaredSize : null,
    stats: {
      views: toCount(data.play_count),
      likes: toCount(data.digg_count),
      comments: toCount(data.comment_count),
      shares: toCount(data.share_count),
    },
    music: cleanText(data.music_info?.title, 100) || null,
  };
}

/**
 * Fetches TikTok metadata and a direct video URL.
 *
 * @param {string|ReturnType<typeof parseTikTokUrl>} input
 * @param {{fetchImpl?: typeof fetch}} [options]
 */
async function fetchTikTokInfo(input, { fetchImpl = globalThis.fetch } = {}) {
  const parsed = typeof input === 'string' ? parseTikTokUrl(input) : input;
  if (!parsed) {
    throw new TikTokError(
      'invalid',
      'That does not look like a TikTok video link. Paste a link such as `https://www.tiktok.com/@user/video/123…`.',
    );
  }

  const endpoint = `${TIKWM_API}?url=${encodeURIComponent(parsed.href)}&hd=1`;
  let response;

  try {
    response = await fetchImpl(endpoint, {
      headers: {
        accept: 'application/json',
        'user-agent': USER_AGENT,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new TikTokError('unavailable', 'TikTok could not be reached right now. Please try again in a moment.');
  }

  if (!response.ok) {
    throw new TikTokError('unavailable', UNAVAILABLE_MESSAGE);
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new TikTokError('unavailable', UNAVAILABLE_MESSAGE);
  }

  return {
    ...normalizeApiPayload(payload),
    sourceUrl: parsed.href,
    shortLink: parsed.short,
  };
}

/**
 * Downloads a direct MP4 from TikTok's CDN with a hard upload-size cap.
 *
 * @param {string} videoUrl
 * @param {{fetchImpl?: typeof fetch, maxBytes?: number}} [options]
 * @returns {Promise<{buffer: Buffer, contentType: string, bytes: number}>}
 */
async function downloadTikTokVideo(videoUrl, { fetchImpl = globalThis.fetch, maxBytes = MAX_VIDEO_BYTES } = {}) {
  assertPublicHttpsUrl(videoUrl);

  let response;
  try {
    response = await fetchImpl(videoUrl, {
      headers: {
        accept: 'video/mp4,video/*;q=0.9,*/*;q=0.8',
        referer: 'https://www.tiktok.com/',
        'user-agent': USER_AGENT,
      },
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });
  } catch {
    throw new TikTokError('download_failed', 'I found the video but could not download it. Please try again in a moment.');
  }

  if (response.url) assertPublicHttpsUrl(response.url);

  if (!response.ok) {
    throw new TikTokError('download_failed', 'I found the video but could not download it. Please try again in a moment.');
  }

  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (contentType && !contentType.startsWith('video/') && contentType !== 'application/octet-stream') {
    throw new TikTokError('download_failed', 'TikTok returned something other than a video. Please try again in a moment.');
  }

  const declaredBytes = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredBytes) && declaredBytes > maxBytes) {
    throw new TikTokError(
      'too_large',
      `This video is **${formatBytes(declaredBytes)}**, above the **${formatBytes(maxBytes)}** upload limit.`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    throw new TikTokError('download_failed', 'TikTok returned an empty video. Please try again in a moment.');
  }

  if (buffer.length > maxBytes) {
    throw new TikTokError(
      'too_large',
      `This video is **${formatBytes(buffer.length)}**, above the **${formatBytes(maxBytes)}** upload limit.`,
    );
  }

  return { buffer, contentType: contentType || 'video/mp4', bytes: buffer.length };
}

module.exports = {
  MAX_VIDEO_BYTES,
  TikTokError,
  cleanText,
  decodeEntities,
  downloadTikTokVideo,
  fetchTikTokInfo,
  formatBytes,
  formatCount,
  normalizeApiPayload,
  parseTikTokUrl,
};
