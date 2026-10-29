const assert = require('node:assert/strict');
const { Collection } = require('discord.js');
const test = require('node:test');

const {
  dmContextNote,
  guildFailureMessage,
  resolveGuild,
} = require('../src/lib/guilds');

function fakeClient({ cached = [], fetchable = [] } = {}) {
  const cache = new Collection(cached.map((guild) => [guild.id, guild]));
  const fetchMap = new Map(fetchable.map((guild) => [guild.id, guild]));

  return {
    guilds: {
      cache,
      fetch: async (id) => {
        if (fetchMap.has(id)) return fetchMap.get(id);
        throw new Error('Unknown Guild');
      },
    },
  };
}

const guild = { id: '1308833568914407495', name: 'Cloud Cord' };

test('a cached guild is returned without a fetch', async () => {
  let fetches = 0;
  const client = fakeClient({ cached: [guild] });
  client.guilds.fetch = async () => {
    fetches += 1;
    return guild;
  };

  const result = await resolveGuild({ guild, guildId: guild.id, client });

  assert.equal(result.guild, guild);
  assert.equal(result.source, 'context');
  assert.equal(fetches, 0);
});

test('a guild missing from cache is fetched by id', async () => {
  const client = fakeClient({ fetchable: [guild] });
  const result = await resolveGuild({ guild: null, guildId: guild.id, client });

  assert.equal(result.guild, guild);
  assert.equal(result.source, 'fetched');
});

test('a guild the bot is not in is reported instead of pretending it is a DM', async () => {
  const client = fakeClient();
  const result = await resolveGuild({ guild: null, guildId: '999999999999999999', client });

  assert.equal(result.guild, null);
  assert.equal(result.source, 'not_member');
  assert.match(guildFailureMessage(result.source), /not a member/);
});

test('a DM falls back to the bot only server', async () => {
  const client = fakeClient({ cached: [guild] });
  const result = await resolveGuild({ guild: null, guildId: null, client });

  assert.equal(result.guild, guild);
  assert.equal(result.source, 'dm');
  assert.match(dmContextNote(result.source, guild), /Cloud Cord/);
});

test('a DM with several servers asks for a channel instead of guessing', async () => {
  const client = fakeClient({
    cached: [guild, { id: '1308833568914407496', name: 'Another Server' }],
  });
  const result = await resolveGuild({ guild: null, guildId: null, client });

  assert.equal(result.guild, null);
  assert.equal(result.source, 'dm_ambiguous');
  assert.match(guildFailureMessage(result.source), /which server/);
});
