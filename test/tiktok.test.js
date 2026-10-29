const assert = require('node:assert/strict');
const test = require('node:test');

const {
  TikTokError,
  downloadTikTokVideo,
  fetchTikTokInfo,
  formatCount,
  normalizeApiPayload,
  parseTikTokUrl,
} = require('../src/lib/tiktok');

const VIDEO_URL = 'https://www.tiktok.com/@scout2015/video/6718335390845095173';

function apiPayload(overrides = {}) {
  return {
    code: 0,
    msg: 'success',
    data: {
      id: '6718335390845095173',
      title: 'Scramble &amp; guess &#39;my name&#39;',
      duration: 10,
      play: 'https://v16.tiktokcdn.example/video.mp4',
      size: 2953029,
      play_count: 159702,
      digg_count: 35202,
      comment_count: 5716,
      share_count: 1518,
      music_info: { title: 'original sound - tiffanie.yunque' },
      author: {
        unique_id: 'scout2015',
        nickname: 'Scout, Suki & Stella',
        avatar: 'https://cdn.example/avatar.jpg',
      },
      ...overrides,
    },
  };
}

function jsonResponse(payload) {
  return {
    ok: true,
    status: 200,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => payload,
  };
}

test('parseTikTokUrl accepts full, mobile, photo and short links', () => {
  assert.ok(parseTikTokUrl(VIDEO_URL));
  assert.ok(parseTikTokUrl('https://m.tiktok.com/@user/video/123456789?is_from_webapp=1'));
  assert.ok(parseTikTokUrl('https://www.tiktok.com/@user/photo/123456789/'));
  assert.ok(parseTikTokUrl('  https://vm.tiktok.com/ZMabc123/  '));

  const full = parseTikTokUrl(VIDEO_URL);
  assert.equal(full.videoId, '6718335390845095173');
  assert.equal(full.short, false);
  assert.equal(full.href, VIDEO_URL);

  const short = parseTikTokUrl('https://www.tiktok.com/t/ZMabc123/?_r=1');
  assert.equal(short.short, true);
  assert.equal(short.videoId, null);
  assert.equal(short.href, 'https://www.tiktok.com/t/ZMabc123');
});

test('parseTikTokUrl rejects lookalike hosts, profiles and non-http links', () => {
  for (const input of [
    'https://tiktok.com.evil.example/@a/video/123456789',
    'https://example.com/@a/video/123456789',
    'https://www.tiktok.com/@a',
    'ftp://www.tiktok.com/@a/video/123456789',
    '',
    null,
  ]) {
    assert.equal(parseTikTokUrl(input), null, `expected ${String(input)} to be rejected`);
  }
});

test('normalizeApiPayload maps metadata, stats and the direct video file', () => {
  const info = normalizeApiPayload(apiPayload());

  assert.equal(info.id, '6718335390845095173');
  assert.equal(info.kind, 'video');
  assert.equal(info.title, "Scramble & guess 'my name'");
  assert.equal(info.author.username, 'scout2015');
  assert.equal(info.author.nickname, 'Scout, Suki & Stella');
  assert.equal(info.author.url, 'https://www.tiktok.com/@scout2015');
  assert.equal(info.durationSeconds, 10);
  assert.equal(info.videoUrl, 'https://v16.tiktokcdn.example/video.mp4');
  assert.equal(info.sizeBytes, 2953029);
  assert.deepEqual(info.stats, { views: 159702, likes: 35202, comments: 5716, shares: 1518 });
  assert.equal(info.music, 'original sound - tiffanie.yunque');
});

test('normalizeApiPayload prefers an HD file and supports photo posts', () => {
  const hd = normalizeApiPayload(apiPayload({ hdplay: 'https://cdn.example/hd.mp4', hd_size: 5200000 }));
  assert.equal(hd.videoUrl, 'https://cdn.example/hd.mp4');
  assert.equal(hd.sizeBytes, 5200000);

  const photo = normalizeApiPayload(apiPayload({
    play: undefined,
    wmplay: undefined,
    images: ['https://cdn.example/one.jpg', 'https://cdn.example/two.jpg'],
  }));
  assert.equal(photo.kind, 'images');
  assert.equal(photo.images.length, 2);
  assert.equal(photo.cover, 'https://cdn.example/one.jpg');
});

test('normalizeApiPayload rejects unavailable posts', () => {
  for (const payload of [null, {}, { code: -1, msg: 'Url parsing is failed' }, { code: 0, data: {} }]) {
    assert.throws(
      () => normalizeApiPayload(payload),
      (error) => error instanceof TikTokError && error.code === 'unavailable',
    );
  }
});

test('fetchTikTokInfo resolves short links through the API and enforces the link', async () => {
  const calls = [];
  const info = await fetchTikTokInfo('https://vm.tiktok.com/ZMabc123/', {
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return jsonResponse(apiPayload());
    },
  });

  assert.equal(info.sourceUrl, 'https://vm.tiktok.com/ZMabc123');
  assert.equal(info.shortLink, true);
  assert.match(calls[0].url, /^https:\/\/www\.tikwm\.com\/api\/\?url=https%3A%2F%2Fvm\.tiktok\.com%2FZMabc123&hd=1$/);
  assert.equal(calls[0].options.headers['user-agent'].includes('ZenBot'), true);

  await assert.rejects(
    fetchTikTokInfo('https://example.com/not-tiktok', { fetchImpl: async () => jsonResponse(apiPayload()) }),
    (error) => error instanceof TikTokError && error.code === 'invalid',
  );
});

test('fetchTikTokInfo reports API failures instead of leaking the payload', async () => {
  await assert.rejects(
    fetchTikTokInfo(VIDEO_URL, {
      fetchImpl: async () => jsonResponse({ code: -1, msg: 'Url parsing is failed' }),
    }),
    (error) => error instanceof TikTokError && error.code === 'unavailable' && !error.message.includes('parsing'),
  );

  await assert.rejects(
    fetchTikTokInfo(VIDEO_URL, { fetchImpl: async () => ({ ok: false, status: 502 }) }),
    (error) => error instanceof TikTokError && error.code === 'unavailable',
  );

  await assert.rejects(
    fetchTikTokInfo(VIDEO_URL, { fetchImpl: async () => { throw new Error('offline'); } }),
    (error) => error instanceof TikTokError && error.code === 'unavailable',
  );
});

test('downloadTikTokVideo returns the buffer and enforces size and type limits', async () => {
  const bytes = Buffer.from('fake-mp4-bytes');
  const okResponse = {
    ok: true,
    url: 'https://cdn.example/video.mp4',
    headers: new Headers({
      'content-type': 'video/mp4',
      'content-length': String(bytes.length),
    }),
    arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
  };

  const downloaded = await downloadTikTokVideo('https://cdn.example/video.mp4', {
    fetchImpl: async () => okResponse,
  });
  assert.equal(downloaded.bytes, bytes.length);
  assert.equal(downloaded.contentType, 'video/mp4');
  assert.deepEqual(downloaded.buffer, bytes);

  await assert.rejects(
    downloadTikTokVideo('https://cdn.example/video.mp4', {
      fetchImpl: async () => ({
        ...okResponse,
        headers: new Headers({ 'content-type': 'video/mp4', 'content-length': '1030' }),
      }),
      maxBytes: 1024,
    }),
    (error) => error instanceof TikTokError && error.code === 'too_large',
  );

  await assert.rejects(
    downloadTikTokVideo('https://cdn.example/video.mp4', {
      fetchImpl: async () => ({
        ...okResponse,
        headers: new Headers({ 'content-type': 'text/html' }),
      }),
    }),
    (error) => error instanceof TikTokError && error.code === 'download_failed',
  );
});

test('downloadTikTokVideo refuses private and non-HTTPS media hosts', async () => {
  let calls = 0;

  for (const url of ['http://cdn.example/video.mp4', 'https://127.0.0.1/video.mp4', 'https://[::1]/video.mp4']) {
    await assert.rejects(
      downloadTikTokVideo(url, { fetchImpl: async () => { calls += 1; } }),
      (error) => error instanceof TikTokError && error.code === 'unavailable',
    );
  }

  assert.equal(calls, 0);
});

test('formatCount renders compact counts for the embed', () => {
  assert.equal(formatCount(0), '0');
  assert.equal(formatCount(999), '999');
  assert.equal(formatCount(1000), '1K');
  assert.equal(formatCount(1240), '1.2K');
  assert.equal(formatCount(159702), '160K');
  assert.equal(formatCount(1500000), '1.5M');
  assert.equal(formatCount(2300000000), '2.3B');
  assert.equal(formatCount('nope'), '0');
});
