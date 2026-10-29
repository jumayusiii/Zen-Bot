const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { Collection } = require('discord.js');
const test = require('node:test');

const rank = require('../src/commands/levels/rank');
const levelsCommand = require('../src/commands/levels/levels');

async function withLevelsFile(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'legend-level-commands-'));
  process.env.LEVELS_FILE = path.join(directory, 'levels.json');

  try {
    await run();
  } finally {
    delete process.env.LEVELS_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

const USER_ID = '500000000000000001';
const GUILD_ID = '500000000000000002';

function fakeUser() {
  return {
    id: USER_ID,
    username: 'tester',
    displayName: 'Tester',
    displayAvatarURL: () => null,
  };
}

function fakeMember() {
  return {
    ...fakeUser(),
    displayName: 'Tester',
  };
}

function fakeGuild() {
  const member = fakeMember();
  const user = fakeUser();

  return {
    id: GUILD_ID,
    name: 'Cloud Cord',
    iconURL: () => null,
    members: {
      cache: new Collection([[USER_ID, member]]),
      fetch: async () => member,
    },
    user,
    member,
  };
}

function fakeInteraction(guild, user, member) {
  const captured = {};

  return {
    captured,
    guild,
    guildId: guild.id,
    user,
    member,
    client: {
      user: {
        username: 'TestBot',
        displayAvatarURL: () => 'https://cdn.example/bot.png',
      },
    },
    options: {
      getUser: () => null,
    },
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

test('/rank renders an image attachment and level details', async () => {
  await withLevelsFile(async () => {
    const directory = path.dirname(process.env.LEVELS_FILE);
    await fs.writeFile(
      process.env.LEVELS_FILE,
      JSON.stringify({
        version: 1,
        users: [
          {
            guildId: GUILD_ID,
            userId: USER_ID,
            username: 'Tester',
            xp: 1500,
            lastXpAt: Date.now(),
          },
        ],
      }),
      'utf8',
    );

    const guild = fakeGuild();
    const user = fakeUser();
    const interaction = fakeInteraction(guild, user, guild.member);

    await rank.execute(interaction);

    const payload = interaction.captured.editReply;
    assert.equal(interaction.captured.deferred, true);
    assert.equal(payload.files.length, 1);
    assert.match(payload.embeds[0].data.image.url, /^attachment:\/\//);
    assert.deepEqual(
      payload.embeds[0].data.fields.map((field) => field.name),
      ['⭐ Level', '🏆 Rank', '✨ Total XP'],
    );

    await fs.rm(directory, { recursive: true, force: true });
  });
});

test('/levels shows ranked members with medals', async () => {
  await withLevelsFile(async () => {
    await fs.writeFile(
      process.env.LEVELS_FILE,
      JSON.stringify({
        version: 1,
        users: [
          { guildId: GUILD_ID, userId: 'user-a', username: 'Alpha', xp: 900, lastXpAt: 1 },
          { guildId: GUILD_ID, userId: USER_ID, username: 'Tester', xp: 500, lastXpAt: 2 },
        ],
      }),
      'utf8',
    );

    const guild = fakeGuild();
    const user = fakeUser();
    const interaction = fakeInteraction(guild, user, guild.member);

    await levelsCommand.execute(interaction);

    const payload = interaction.captured.reply;
    const fields = payload.embeds[0].data.fields;

    assert.equal(fields.length, 2);
    assert.match(fields[0].name, /🥇 #1/);
    assert.match(fields[0].name, /Alpha/);
    assert.match(fields[1].name, /🥈 #2/);
    assert.match(fields[1].value, /Level/);
  });
});
