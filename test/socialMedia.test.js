const assert = require('node:assert/strict');
const test = require('node:test');

const {
  SocialMediaError,
  decodeEntities,
  fetchBluesky,
  fetchReddit,
  fetchYouTube,
  formatCount,
  isSafeSubreddit,
  parseBlueskyHandle,
  parseRedditAtom,
  parseSubreddit,
  parseYouTubeUrl,
} = require('../src/lib/socialMedia');

const BSKY_PROFILE = {
  did: 'did:plc:z72i7hdynmk6r22z27h6tvur',
  handle: 'bsky.app',
  displayName: 'Bluesky',
  description: 'official Bluesky account',
  avatar: 'https://cdn.bsky.app/avatar.png',
  followersCount: 35_446_405,
  followsCount: 32,
  postsCount: 901,
  createdAt: '2023-04-12T04:53:57.057Z',
};

const BSKY_FEED = {
  feed: [
    {
      post: {
        uri: 'at://did:plc:abc/app.bsky.feed.post/3mz263w23ik2f',
        author: {
          handle: 'bsky.app',
          displayName: 'Bluesky',
          avatar: 'https://cdn.bsky.app/avatar.png',
        },
        record: { text: 'A live post from Bluesky.', createdAt: '2026-10-29T21:03:42.780Z' },
        likeCount: 12,
        replyCount: 2,
        repostCount: 3,
        quoteCount: 1,
        embed: {
          images: [{ thumb: 'https://cdn.bsky.app/image.jpg' }],
        },
      },
    },
  ],
};

const REDDIT_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">
  <category term="aww" label="r/aww"/>
  <updated>2026-10-30T04:55:54+00:00</updated>
  <icon>https://www.redditstatic.com/icon.png</icon>
  <title>r/aww</title>
  <subtitle>Things that make you go AWW! &amp; more.</subtitle>
  <entry>
    <author><name>/u/AutoModerator</name><uri>https://www.reddit.com/user/AutoModerator</uri></author>
    <content type="html">&lt;p&gt;A pinned announcement.&lt;/p&gt;</content>
    <id>t3_pinned</id>
    <link href="https://www.reddit.com/r/aww/comments/pinned/announcement/" />
    <published>2023-10-06T14:35:17+00:00</published>
    <title>/r/aww is going OC-only</title>
  </entry>
  <entry>
    <author><name>/u/Photographer</name><uri>https://www.reddit.com/user/Photographer</uri></author>
    <content type="html">&lt;p&gt;A fresh photo.&lt;/p&gt;</content>
    <id>t3_fresh</id>
    <link href="https://www.reddit.com/r/aww/comments/fresh/a_fresh_photo/" />
    <media:thumbnail url="https://b.thumbs.redditmedia.com/photo.jpg?width=640&amp;crop=smart" />
    <published>2026-10-29T23:42:00+00:00</published>
    <title>A fresh photo &amp; a good dog</title>
  </entry>
</feed>`;

const YOUTUBE_PAYLOAD = {
  title: 'A useful video',
  author_name: 'Zen Channel',
  author_url: 'https://www.youtube.com/@zenchannel',
  thumbnail_url: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
};

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

function textResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({}),
    text: async () => body,
  };
}

test('parseBlueskyHandle accepts handles, @names and profile links', () => {
  assert.equal(parseBlueskyHandle('bsky.app'), 'bsky.app');
  assert.equal(parseBlueskyHandle('@Bsky.App'), 'bsky.app');
  assert.equal(
    parseBlueskyHandle('https://bsky.app/profile/bsky.app/post/3mz263w23ik2f'),
    'bsky.app',
  );
  assert.equal(parseBlueskyHandle('bsky.app/profile/bsky.app'), 'bsky.app');
  assert.equal(parseBlueskyHandle('not-a-handle'), null);
  assert.equal(parseBlueskyHandle('https://example.com/profile/bsky.app'), null);
  assert.equal(parseBlueskyHandle('bad..handle'), null);
});

test('parseSubreddit accepts names and URLs and normalizes case', () => {
  assert.equal(parseSubreddit('aww'), 'aww');
  assert.equal(parseSubreddit('r/Aww'), 'aww');
  assert.equal(parseSubreddit('https://www.reddit.com/r/aww/hot/'), 'aww');
  assert.equal(parseSubreddit('https://example.com/r/aww'), null);
  assert.equal(parseSubreddit('r/a'), null);
  assert.equal(isSafeSubreddit('aww'), true);
  assert.equal(isSafeSubreddit('nsfw'), false);
});

test('parseYouTubeUrl accepts standard, short and embedded links', () => {
  assert.deepEqual(parseYouTubeUrl('dQw4w9WgXcQ'), {
    id: 'dQw4w9WgXcQ',
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  });
  assert.equal(
    parseYouTubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10').id,
    'dQw4w9WgXcQ',
  );
  assert.equal(parseYouTubeUrl('https://youtu.be/dQw4w9WgXcQ').id, 'dQw4w9WgXcQ');
  assert.equal(parseYouTubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ').id, 'dQw4w9WgXcQ');
  assert.equal(parseYouTubeUrl('https://music.youtube.com/watch?v=dQw4w9WgXcQ').id, 'dQw4w9WgXcQ');
  assert.equal(parseYouTubeUrl('https://vimeo.com/123456789'), null);
  assert.equal(parseYouTubeUrl('too-short'), null);
  assert.equal(parseYouTubeUrl('https://www.youtube.com/playlist?list=PL123'), null);
});

test('parseRedditAtom maps entries, entities and thumbnails', () => {
  const feed = parseRedditAtom(REDDIT_XML);

  assert.equal(feed.subreddit, 'aww');
  assert.equal(feed.title, 'r/aww');
  assert.match(feed.description, /AWW! & more/);
  assert.equal(feed.entries.length, 2);
  assert.equal(feed.entries[1].title, 'A fresh photo & a good dog');
  assert.equal(feed.entries[1].author, 'Photographer');
  assert.equal(
    feed.entries[1].image,
    'https://b.thumbs.redditmedia.com/photo.jpg?width=640&crop=smart',
  );
  assert.equal(feed.entries[1].url, 'https://www.reddit.com/r/aww/comments/fresh/a_fresh_photo/');
});

test('fetchBluesky loads a live profile and latest post', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return jsonResponse(url.includes('getProfile') ? BSKY_PROFILE : BSKY_FEED);
  };

  const result = await fetchBluesky('bsky.app', { fetchImpl });

  assert.equal(result.profile.handle, 'bsky.app');
  assert.equal(result.profile.followers, 35_446_405);
  assert.equal(result.latestPost.text, 'A live post from Bluesky.');
  assert.equal(result.latestPost.likes, 12);
  assert.equal(result.latestPost.image, 'https://cdn.bsky.app/image.jpg');
  assert.match(calls[0], /getProfile\?actor=bsky\.app/);
  assert.match(calls[1], /getAuthorFeed\?actor=bsky\.app/);
});

test('fetchBluesky keeps the profile when the feed is unavailable', async () => {
  const fetchImpl = async (url) => (
    url.includes('getProfile') ? jsonResponse(BSKY_PROFILE) : jsonResponse({}, 500)
  );

  const result = await fetchBluesky('bsky.app', { fetchImpl });
  assert.equal(result.profile.handle, 'bsky.app');
  assert.equal(result.latestPost, null);
  assert.equal(result.postUnavailable, true);
});

test('fetchReddit picks a non-AutoModerator post from the public feed', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return textResponse(REDDIT_XML);
  };

  const result = await fetchReddit('aww', { fetchImpl, random: () => 0 });

  assert.equal(result.entry.author, 'Photographer');
  assert.equal(result.subreddit, 'aww');
  assert.match(calls[0], /reddit\.com\/r\/aww\/hot\/\.rss/);
});

test('fetchReddit rejects communities outside the SFW list', async () => {
  await assert.rejects(
    fetchReddit('notsafe', { fetchImpl: async () => textResponse(REDDIT_XML) }),
    (error) => error instanceof SocialMediaError && error.code === 'invalid',
  );
});

test('fetchYouTube resolves oEmbed metadata from a short link', async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    return jsonResponse(YOUTUBE_PAYLOAD);
  };

  const video = await fetchYouTube('https://youtu.be/dQw4w9WgXcQ', { fetchImpl });

  assert.equal(video.id, 'dQw4w9WgXcQ');
  assert.equal(video.title, 'A useful video');
  assert.equal(video.author, 'Zen Channel');
  assert.match(calls[0], /youtube\.com\/oembed\?url=https%3A%2F%2Fwww\.youtube\.com%2Fwatch%3Fv%3DdQw4w9WgXcQ/);
});

test('social-media helpers decode entities and format counts', () => {
  assert.equal(decodeEntities('a &amp; b &#39;c&#39;'), "a & b 'c'");
  assert.equal(formatCount(999), '999');
  assert.equal(formatCount(159_702), '160K');
  assert.equal(formatCount(1_250_000), '1.3M');
  assert.equal(formatCount(2_500_000_000), '2.5B');
  assert.equal(formatCount(0), '0');
});
