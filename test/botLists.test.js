const assert = require('node:assert/strict');
const { Collection } = require('discord.js');
const test = require('node:test');

const { DISCORDBOTLIST_URL, TOPGG_URL, syncBotLists } = require('../src/lib/botLists');

function fakeClient(guilds = []) {
  return {
    application: { id: '1564936469305364480' },
    guilds: {
      cache: new Collection(guilds.map((guild, index) => [`guild-${index}`, guild])),
    },
  };
}

test('syncBotLists makes no requests when no list tokens are configured', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok: true, status: 200 };
  };

  const results = await syncBotLists({
    client: fakeClient([{ memberCount: 10 }]),
    env: {},
    fetchImpl,
  });

  assert.deepEqual(results, []);
  assert.equal(calls, 0);
});

test('syncBotLists posts guild counts to both configured lists', async () => {
  const calls = [];

  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, status: 200 };
  };

  const results = await syncBotLists({
    client: fakeClient([{ memberCount: 12 }, { memberCount: 30 }]),
    env: { TOPGG_TOKEN: 'top-token', DISCORDBOTLIST_TOKEN: 'list-token' },
    fetchImpl,
  });

  assert.equal(calls.length, 2);

  const topgg = calls.find((call) => call.url === TOPGG_URL('1564936469305364480'));
  assert.ok(topgg);
  assert.equal(topgg.options.headers.Authorization, 'top-token');
  assert.deepEqual(JSON.parse(topgg.options.body), { server_count: 2 });

  const list = calls.find((call) => call.url === DISCORDBOTLIST_URL('1564936469305364480'));
  assert.ok(list);
  assert.equal(list.options.headers.Authorization, 'list-token');
  assert.deepEqual(JSON.parse(list.options.body), { guilds: 2, users: 42 });

  assert.deepEqual(results, [
    { service: 'top.gg', ok: true, status: 200 },
    { service: 'Discord Bot List', ok: true, status: 200 },
  ]);
});

test('syncBotLists reports HTTP and network failures without throwing', async () => {
  const httpFailure = await syncBotLists({
    client: fakeClient(),
    env: { TOPGG_TOKEN: 'top-token' },
    fetchImpl: async () => ({ ok: false, status: 429 }),
  });

  assert.deepEqual(httpFailure, [{ service: 'top.gg', ok: false, status: 429 }]);

  const networkFailure = await syncBotLists({
    client: fakeClient(),
    env: { DISCORDBOTLIST_TOKEN: 'list-token' },
    fetchImpl: async () => {
      throw new TypeError('network down');
    },
  });

  assert.deepEqual(networkFailure, [
    { service: 'Discord Bot List', ok: false, error: 'TypeError' },
  ]);
});
