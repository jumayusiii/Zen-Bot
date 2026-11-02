const { setTimeout: delay } = require('node:timers/promises');
const {
  SAFE_SUBREDDITS,
  SocialMediaError,
  decodeEntities,
  isSafeSubreddit,
  stripHtml,
} = require('./socialMedia');

const REDDIT_WEB = 'https://www.reddit.com';
const REDDIT_USER_AGENT =
  'Mozilla/5.0 (compatible; ZenBot/1.19; +https://github.com/jumayusiii/Zen-Bot)';
const REQUEST_TIMEOUT_MS = 12000;
const MAX_COMMENTS = 4;
const MAX_COMMENT_LENGTH = 520;

const CARD_THEMES = Object.freeze([
  { name: 'Dark', value: 'dark' },
  { name: 'Light', value: 'light' },
  { name: 'Sepia', value: 'sepia' },
]);

const THEMES = Object.freeze({
  dark: {
    background: '#0c0d10',
    panel: '#17191d',
    text: '#f4f5f6',
    muted: '#a4a9b2',
    line: '#2b2f36',
    accent: '#ff4500',
    avatarText: '#ffffff',
  },
  light: {
    background: '#e7e9ec',
    panel: '#ffffff',
    text: '#111316',
    muted: '#626a75',
    line: '#d9dde3',
    accent: '#ff4500',
    avatarText: '#ffffff',
  },
  sepia: {
    background: '#e8dcc8',
    panel: '#fff8ec',
    text: '#2c2117',
    muted: '#7b6652',
    line: '#ddc9ac',
    accent: '#d84315',
    avatarText: '#ffffff',
  },
});

let canvasModule = null;

function canvasApi() {
  if (!canvasModule) canvasModule = require('@napi-rs/canvas');
  return canvasModule;
}

function readTag(xml, tag) {
  const match = String(xml ?? '').match(
    new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`, 'i'),
  );
  return match ? match[1] : '';
}

function readAttribute(xml, tag, attribute) {
  const match = String(xml ?? '').match(
    new RegExp(`<${tag}\\b[^>]*\\b${attribute}="([^"]*)"`, 'i'),
  );
  return match ? decodeEntities(match[1]) : '';
}

function cleanLines(value) {
  return String(value ?? '')
    .replace(/\r/g, '')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function plainTextFromHtml(html) {
  let text = decodeEntities(String(html ?? ''));
  text = text
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|blockquote)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ');

  // Reddit's Atom bodies are HTML-escaped twice, so decode once more after
  // the tags are gone.
  text = decodeEntities(text)
    .replace(/https?:\/\/\S+/gi, '[link]')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n');

  return cleanLines(text).slice(0, MAX_COMMENT_LENGTH);
}

function parseRedditPostUrl(input) {
  let url;
  try {
    url = new URL(String(input ?? '').trim());
  } catch {
    throw new SocialMediaError(
      'invalid',
      'Paste a full Reddit thread link, for example `https://www.reddit.com/r/AskReddit/comments/...`.',
    );
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'redd.it') {
    throw new SocialMediaError(
      'invalid',
      'Paste the full reddit.com thread link, not a short redd.it link.',
    );
  }

  if (!['reddit.com', 'old.reddit.com', 'np.reddit.com'].includes(host)) {
    throw new SocialMediaError('invalid', 'That link is not a Reddit thread.');
  }

  const match = url.pathname.match(
    /^\/r\/([^/]+)\/comments\/([a-z0-9]+)(?:\/([^/]*))?\/?$/i,
  );
  if (!match) {
    throw new SocialMediaError(
      'invalid',
      'That Reddit link does not point at a thread. Open the post and copy its URL.',
    );
  }

  const subreddit = match[1].toLowerCase();
  if (!isSafeSubreddit(subreddit)) {
    throw new SocialMediaError(
      'invalid',
      `That community is not on Zen's SFW list. Try one of: ${SAFE_SUBREDDITS.slice(0, 10)
        .map((name) => `\`${name}\``)
        .join(', ')}.`,
    );
  }

  return {
    subreddit,
    id: match[2],
    slug: match[3] || '',
    url: `${REDDIT_WEB}/r/${subreddit}/comments/${match[2]}/`,
  };
}

function parseRedditThread(xml, { maxComments = 3 } = {}) {
  const entries = (String(xml ?? '').match(/<entry\b[^>]*>[\s\S]*?<\/entry>/gi) || [])
    .map((entry) => {
      const id = cleanLines(stripHtml(readTag(entry, 'id')));
      const authorBlock = readTag(entry, 'author');
      const author = cleanLines(stripHtml(readTag(authorBlock, 'name')))
        .replace(/^\/?u\//i, '')
        .slice(0, 80);
      const url = readAttribute(entry, 'link', 'href');
      const title = cleanLines(stripHtml(readTag(entry, 'title'))).slice(0, 300);
      const body = plainTextFromHtml(readTag(entry, 'content'));
      const published = cleanLines(stripHtml(readTag(entry, 'published')));

      return { id, author, url, title, body, published };
    })
    .filter((entry) => entry.id);

  const post = entries.find((entry) => entry.id.startsWith('t3_')) ?? entries[0];
  if (!post) {
    throw new SocialMediaError('unavailable', 'Reddit returned no readable thread.');
  }

  const seenAuthors = new Set();
  const comments = entries
    .filter((entry) => entry.id.startsWith('t1_'))
    .filter((entry) => entry.url && entry.body.length >= 16)
    .filter((entry) => !/automoderator/i.test(entry.author))
    .filter((entry) => !/^\[(deleted|removed)\]$/i.test(entry.body))
    .filter((entry) => {
      if (seenAuthors.has(entry.author)) return false;
      seenAuthors.add(entry.author);
      return true;
    })
    .slice(0, Math.max(1, Math.min(MAX_COMMENTS, Math.floor(maxComments) || 3)));

  if (comments.length === 0) {
    throw new SocialMediaError('unavailable', 'Reddit returned no public comments for that thread.');
  }

  return {
    id: post.id.replace(/^t[13]_/, ''),
    subreddit: readAttribute(xml, 'category', 'term').toLowerCase() || null,
    title: post.title,
    author: post.author || 'unknown',
    url: post.url || null,
    published: post.published,
    comments,
  };
}

async function fetchRedditThread(input, { fetchImpl = globalThis.fetch } = {}) {
  const parsed = parseRedditPostUrl(input);
  const feedUrl = `${parsed.url}.rss?limit=100&sort=top`;

  let response;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetchImpl(feedUrl, {
        headers: {
          accept: 'application/atom+xml,application/xml;q=0.9,*/*;q=0.8',
          'user-agent': REDDIT_USER_AGENT,
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new SocialMediaError(
        'unavailable',
        'Reddit could not be reached right now. Please try again in a moment.',
      );
    }

    if (response.status !== 429 || attempt === 1) break;
    await delay(1500);
  }

  if (response.status === 404) {
    throw new SocialMediaError('not_found', 'Reddit could not find that thread.');
  }
  if (response.status === 429) {
    throw new SocialMediaError('rate_limited', 'Reddit is rate-limiting Zen right now. Try again in a minute.');
  }
  if (!response.ok) {
    throw new SocialMediaError(
      'unavailable',
      'Reddit’s public thread feed is unavailable right now. Please try again in a moment.',
    );
  }

  let xml;
  try {
    xml = await response.text();
  } catch {
    throw new SocialMediaError('unavailable', 'Reddit returned an unreadable thread.');
  }

  const thread = parseRedditThread(xml);
  return {
    ...thread,
    subreddit: thread.subreddit || parsed.subreddit,
    url: thread.url || parsed.url,
  };
}

function wrapLines(ctx, text, maxWidth, maxLines) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
      continue;
    }

    lines.push(current);
    current = word;
    if (lines.length === maxLines - 1) break;
  }

  if (lines.length < maxLines && current) lines.push(current);

  const shownWords = lines.join(' ').split(/\s+/).length;
  if (shownWords < words.length) {
    let last = lines[lines.length - 1] || '';
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = `${last.trimEnd()}…`;
  }

  return lines;
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function avatarColor(name) {
  const colors = ['#ff4500', '#7193ff', '#46d160', '#ffb000', '#ff66ac', '#25b6d2'];
  let hash = 0;
  for (const character of String(name ?? '')) hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  return colors[hash % colors.length];
}

function drawAvatar(ctx, name, x, y, radius, palette) {
  const color = avatarColor(name);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.avatarText;
  ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(name || '?').charAt(0).toUpperCase(), x, y + 1);
  ctx.restore();
}

/**
 * Renders a real Reddit thread and its public comments as a shareable image.
 *
 * @param {object} input
 * @param {{subreddit?: string, title: string, author: string, url?: string}} input.thread
 * @param {{author: string, body: string}[]} input.comments
 * @param {string} [input.theme] dark, light or sepia
 * @param {number} [input.maxComments]
 * @returns {Promise<Buffer>}
 */
async function renderRedditCard({
  thread,
  comments = [],
  theme = 'dark',
  maxComments = 3,
}) {
  const { createCanvas } = canvasApi();
  const palette = THEMES[theme] ?? THEMES.dark;
  const width = 900;
  const padding = 48;
  const contentWidth = width - padding * 2;
  const selectedComments = comments
    .filter((comment) => comment?.body)
    .slice(0, Math.max(1, Math.min(MAX_COMMENTS, Math.floor(maxComments) || 3)));

  const measureCanvas = createCanvas(width, 10);
  const measure = measureCanvas.getContext('2d');

  const titleText = String(thread?.title || 'Reddit thread').trim();
  measure.font = 'bold 32px "Segoe UI", Arial, sans-serif';
  const titleLines = wrapLines(measure, titleText, contentWidth, 4);
  const titleHeight = titleLines.length * 39;

  measure.font = '20px "Segoe UI", Arial, sans-serif';
  const commentLayouts = selectedComments.map((comment) => {
    const bodyLines = wrapLines(measure, comment.body, contentWidth - 58, 7);
    return { ...comment, bodyLines, height: 54 + bodyLines.length * 29 + 24 };
  });

  const commentHeight = commentLayouts.reduce((total, comment) => total + comment.height, 0);
  const emptyHeight = commentLayouts.length === 0 ? 70 : 0;
  const height = Math.max(
    520,
    108 + titleHeight + 74 + commentHeight + emptyHeight + 96,
  );

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);

  const panel = ctx.createLinearGradient(0, 0, width, height);
  panel.addColorStop(0, palette.panel);
  panel.addColorStop(1, palette.background);
  roundedRect(ctx, 18, 18, width - 36, height - 36, 26);
  ctx.fillStyle = panel;
  ctx.fill();
  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1;
  ctx.stroke();

  // Reddit-style header rail.
  ctx.fillStyle = palette.accent;
  ctx.beginPath();
  ctx.arc(padding + 12, 58, 13, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = palette.text;
  ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`r/${String(thread?.subreddit || 'reddit')}`, padding + 34, 59);

  ctx.fillStyle = palette.muted;
  ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('REDDIT THREAD', width - padding, 59);

  const titleY = 100;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = palette.text;
  ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
  for (let index = 0; index < titleLines.length; index += 1) {
    ctx.fillText(titleLines[index], padding, titleY + index * 39);
  }

  const metaY = titleY + titleHeight + 14;
  ctx.fillStyle = palette.muted;
  ctx.font = '18px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`u/${thread?.author || 'unknown'}  ·  live public comments`, padding, metaY);

  ctx.strokeStyle = palette.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, metaY + 38);
  ctx.lineTo(width - padding, metaY + 38);
  ctx.stroke();

  let cursor = metaY + 68;

  if (commentLayouts.length === 0) {
    ctx.fillStyle = palette.muted;
    ctx.font = '20px "Segoe UI", Arial, sans-serif';
    ctx.fillText('No public comments were available in this thread.', padding, cursor + 12);
    cursor += 70;
  }

  for (const comment of commentLayouts) {
    drawAvatar(ctx, comment.author, padding + 18, cursor + 22, 18, palette);

    ctx.fillStyle = palette.text;
    ctx.font = 'bold 19px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`u/${comment.author || 'unknown'}`, padding + 48, cursor + 5);

    ctx.fillStyle = palette.muted;
    ctx.font = '15px "Segoe UI", Arial, sans-serif';
    ctx.fillText('comment', padding + 48, cursor + 30);

    ctx.fillStyle = palette.text;
    ctx.font = '20px "Segoe UI", Arial, sans-serif';
    for (let index = 0; index < comment.bodyLines.length; index += 1) {
      ctx.fillText(comment.bodyLines[index], padding + 48, cursor + 56 + index * 29);
    }

    cursor += comment.height;
    ctx.strokeStyle = palette.line;
    ctx.beginPath();
    ctx.moveTo(padding + 48, cursor - 12);
    ctx.lineTo(width - padding, cursor - 12);
    ctx.stroke();
  }

  const footerY = height - 48;
  ctx.fillStyle = palette.muted;
  ctx.font = '15px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Live comments from Reddit', padding, footerY);
  ctx.textAlign = 'right';
  ctx.fillText('reddit.com', width - padding, footerY);

  return canvas.toBuffer('image/png');
}

module.exports = {
  CARD_THEMES,
  MAX_COMMENT_LENGTH,
  MAX_COMMENTS,
  REDDIT_USER_AGENT,
  fetchRedditThread,
  parseRedditPostUrl,
  parseRedditThread,
  renderRedditCard,
};
