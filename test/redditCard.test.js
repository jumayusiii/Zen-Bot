const assert = require('node:assert/strict');
const test = require('node:test');

const {
  fetchRedditThread,
  parseRedditPostUrl,
  parseRedditThread,
  renderRedditCard,
} = require('../src/lib/redditCard');
const { SocialMediaError } = require('../src/lib/socialMedia');

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <category term="AskReddit" label="r/AskReddit"/>
  <entry>
    <author><name>/u/Poster</name><uri>https://www.reddit.com/user/Poster</uri></author>
    <content type="html">&amp;#32; submitted by &amp;#32; &lt;a href=&quot;https://www.reddit.com/user/Poster&quot;&gt; /u/Poster &lt;/a&gt;</content>
    <id>t3_abc123</id>
    <link href="https://www.reddit.com/r/AskReddit/comments/abc123/example_thread/"/>
    <published>2026-11-02T12:00:00+00:00</published>
    <title>What is the funniest thing you have seen at work?</title>
  </entry>
  <entry>
    <author><name>/u/FirstCommenter</name></author>
    <content type="html">&lt;!-- SC_OFF --&gt;&lt;div class=&quot;md&quot;&gt;&lt;p&gt;The first &amp;#39;funny&amp;#39; comment.&lt;/p&gt;&lt;/div&gt;&lt;!-- SC_ON --&gt;</content>
    <id>t1_comment_one</id>
    <link href="https://www.reddit.com/r/AskReddit/comments/abc123/example_thread/comment_one/"/>
    <title>/u/FirstCommenter on the thread</title>
  </entry>
  <entry>
    <author><name>/u/FirstCommenter</name></author>
    <content type="html">&lt;div class=&quot;md&quot;&gt;&lt;p&gt;A duplicate author reply.&lt;/p&gt;&lt;/div&gt;</content>
    <id>t1_comment_duplicate</id>
    <link href="https://www.reddit.com/r/AskReddit/comments/abc123/example_thread/comment_duplicate/"/>
    <title>duplicate</title>
  </entry>
  <entry>
    <author><name>/u/AutoModerator</name></author>
    <content type="html">&lt;div class=&quot;md&quot;&gt;&lt;p&gt;Automated rules reply.&lt;/p&gt;&lt;/div&gt;</content>
    <id>t1_comment_automod</id>
    <link href="https://www.reddit.com/r/AskReddit/comments/abc123/example_thread/comment_automod/"/>
    <title>automod</title>
  </entry>
  <entry>
    <author><name>/u/SecondCommenter</name></author>
    <content type="html">&lt;div class=&quot;md&quot;&gt;&lt;p&gt;A second useful comment with enough words to render.&lt;/p&gt;&lt;/div&gt;</content>
    <id>t1_comment_two</id>
    <link href="https://www.reddit.com/r/AskReddit/comments/abc123/example_thread/comment_two/"/>
    <title>second</title>
  </entry>
</feed>`;

const thread = parseRedditThread(SAMPLE_XML, { maxComments: 2 });

test('parseRedditPostUrl accepts full Reddit thread URLs and rejects unsafe input', () => {
  const parsed = parseRedditPostUrl(
    'https://www.reddit.com/r/AskReddit/comments/abc123/example_thread/?utm_source=share',
  );

  assert.equal(parsed.subreddit, 'askreddit');
  assert.equal(parsed.id, 'abc123');
  assert.equal(parsed.url, 'https://www.reddit.com/r/askreddit/comments/abc123/');

  assert.throws(
    () => parseRedditPostUrl('https://redd.it/abc123'),
    (error) => error instanceof SocialMediaError && error.code === 'invalid',
  );
  assert.throws(
    () => parseRedditPostUrl('https://example.com/r/AskReddit/comments/abc123/'),
    (error) => error instanceof SocialMediaError && error.code === 'invalid',
  );
  assert.throws(
    () => parseRedditPostUrl('https://www.reddit.com/r/notasafesub/comments/abc123/'),
    (error) => error instanceof SocialMediaError && error.code === 'invalid',
  );
});

test('parseRedditThread extracts the post, unique public comments and plain text', () => {
  assert.equal(thread.title, 'What is the funniest thing you have seen at work?');
  assert.equal(thread.author, 'Poster');
  assert.equal(thread.subreddit, 'askreddit');
  assert.equal(thread.comments.length, 2);
  assert.deepEqual(thread.comments.map((comment) => comment.author), [
    'FirstCommenter',
    'SecondCommenter',
  ]);
  assert.match(thread.comments[0].body, /The first 'funny' comment\./);
  assert.doesNotMatch(thread.comments[0].body, /<|&lt;|SC_OFF/);
});

test('fetchRedditThread requests the public comment RSS feed', async () => {
  let requested = null;
  const result = await fetchRedditThread('https://www.reddit.com/r/AskReddit/comments/abc123/example/', {
    fetchImpl: async (url) => {
      requested = url;
      return {
        ok: true,
        status: 200,
        text: async () => SAMPLE_XML,
      };
    },
  });

  assert.equal(
    requested,
    'https://www.reddit.com/r/askreddit/comments/abc123/.rss?limit=100&sort=top',
  );
  assert.equal(result.comments.length, 2);
});

test('renderRedditCard produces a PNG and changes with the theme', async () => {
  const dark = await renderRedditCard({ thread, comments: thread.comments, theme: 'dark' });
  const light = await renderRedditCard({ thread, comments: thread.comments, theme: 'light' });

  assert.equal(dark.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.equal(light.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.ok(dark.length > 5000);
  assert.ok(light.length > 5000);
  assert.notDeepEqual(dark, light);
});
