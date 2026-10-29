const assert = require('node:assert/strict');
const { ChannelType, Collection } = require('discord.js');
const test = require('node:test');

const servericon = require('../src/commands/utility/servericon');
const serverinfo = require('../src/commands/utility/serverinfo');

const GUILD_ID = '1308833568914407495';

function fakeGuild() {
  const channels = new Collection([
    ['text-1', { type: ChannelType.GuildText }],
    ['voice-1', { type: ChannelType.GuildVoice }],
  ]);

  return {
    id: GUILD_ID,
    name: 'Cloud Cord',
    description: 'A test server',
    icon: 'icon-hash',
    banner: null,
    createdTimestamp: Date.now() - 86_400_000,
    memberCount: 42,
    premiumSubscriptionCount: 2,
    premiumTier: 1,
    verificationLevel: 1,
    preferredLocale: 'en-US',
    roles: { cache: new Collection([['role-1', {}]]) },
    channels: { cache: channels },
    members: { me: { displayColor: 0x6d5efc } },
    fetchOwner: async () => ({ toString: () => '<@1308833568914407496>' }),
    iconURL: () => 'https://cdn.example/icon.png',
    bannerURL: () => null,
  };
}

function fakeInteraction(client) {
  const captured = {};

  return {
    captured,
    guild: null,
    guildId: GUILD_ID,
    client,
    user: { username: 'Tester' },
    async deferReply() {
      captured.deferred = true;
    },
    async reply(payload) {
      captured.reply = payload;
    },
    async editReply(payload) {
      captured.editReply = payload;
    },
  };
}

test('/serverinfo fetches an uncached guild instead of rejecting the interaction', async () => {
  const guild = fakeGuild();
  const client = {
    user: { username: 'TestBot', displayAvatarURL: () => 'https://cdn.example/bot.png' },
    guilds: {
      cache: new Collection(),
      fetch: async (id) => {
        assert.equal(id, GUILD_ID);
        return guild;
      },
    },
  };

  const interaction = fakeInteraction(client);
  await serverinfo.execute(interaction);

  assert.equal(interaction.captured.deferred, true);
  assert.equal(interaction.captured.reply, undefined);
  assert.equal(interaction.captured.editReply.embeds.length, 1);
  assert.equal(interaction.captured.editReply.embeds[0].data.title, 'Cloud Cord');
});

test('/servericon fetches an uncached guild and still builds size controls', async () => {
  const guild = fakeGuild();
  const client = {
    user: { username: 'TestBot', displayAvatarURL: () => 'https://cdn.example/bot.png' },
    guilds: {
      cache: new Collection(),
      fetch: async () => guild,
    },
  };

  const interaction = fakeInteraction(client);
  await servericon.execute(interaction);

  assert.equal(interaction.captured.reply.content, undefined);
  assert.equal(interaction.captured.reply.embeds.length, 1);
  assert.equal(
    interaction.captured.reply.embeds[0].data.image.url,
    'https://cdn.example/icon.png',
  );
  assert.equal(interaction.captured.reply.components.length, 2);
});
