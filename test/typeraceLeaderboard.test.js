const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const leaderboard = require('../src/lib/typeraceLeaderboard');
const leaderboardCommand = require('../src/commands/minigames/typeraceleaderboard');
const typerace = require('../src/commands/minigames/typerace');

const USER_ID = '970000000000000001';

const client = {
  user: {
    username: 'TestBot',
    displayAvatarURL: () => 'https://cdn.example/bot.png',
  },
};

async function withLeaderboardFile(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'zen-typerace-'));
  process.env.TYPERACE_FILE = path.join(directory, 'typerace.json');

  try {
    await run();
  } finally {
    delete process.env.TYPERACE_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function chatInteraction({
  guildId = 'guild-1',
  guildName = 'Test Server',
  userId = USER_ID,
  username = 'Tester',
} = {}) {
  const captured = {};

  return {
    captured,
    client,
    guildId,
    guild: guildId ? { id: guildId, name: guildName } : null,
    user: { id: userId, username },
    member: { displayName: username },
    async reply(payload) {
      captured.reply = payload;
    },
  };
}

function componentInteraction(customId, userId = USER_ID) {
  const interaction = {
    client,
    customId,
    guildId: 'guild-1',
    user: { id: userId, username: 'Tester' },
    member: { displayName: 'Tester' },
    async showModal(modal) {
      this.modal = modal.toJSON();
    },
  };

  return interaction;
}

function modalInteraction(customId, typed, { guildId = 'guild-1', userId = USER_ID } = {}) {
  const captured = {};

  return {
    captured,
    client,
    customId,
    guildId,
    user: { id: userId, username: 'Nova' },
    member: { displayName: 'Nova' },
    fields: {
      getTextInputValue: (name) => (name === 'phrase' ? typed : ''),
    },
    async reply(payload) {
      captured.reply = payload;
    },
  };
}

test('Type Race keeps only the fastest time for each member and server', async () => {
  await withLeaderboardFile(async () => {
    const first = await leaderboard.recordRace({
      guildId: 'guild-1',
      userId: 'alpha',
      username: 'Alpha',
      elapsedMs: 4200,
      wpm: 40,
      phrase: 'clear mind, clean code',
      achievedAt: 1,
    });
    assert.equal(first.improved, true);
    assert.equal(first.entry.bestMs, 4200);

    const slower = await leaderboard.recordRace({
      guildId: 'guild-1',
      userId: 'alpha',
      username: 'Alpha',
      elapsedMs: 5000,
      wpm: 33,
      phrase: 'keep it simple',
      achievedAt: 2,
    });
    assert.equal(slower.improved, false);
    assert.equal(slower.entry.bestMs, 4200);

    const faster = await leaderboard.recordRace({
      guildId: 'guild-1',
      userId: 'alpha',
      username: 'Alpha',
      elapsedMs: 3800,
      wpm: 45,
      phrase: 'one step at a time',
      achievedAt: 3,
    });
    assert.equal(faster.improved, true);
    assert.equal(faster.previousBestMs, 4200);
    assert.equal(faster.entry.bestMs, 3800);

    await leaderboard.recordRace({
      guildId: 'guild-1',
      userId: 'beta',
      username: 'Beta',
      elapsedMs: 4000,
      wpm: 42,
      phrase: 'small wins count',
      achievedAt: 4,
    });
    await leaderboard.recordRace({
      guildId: 'guild-2',
      userId: 'gamma',
      username: 'Gamma',
      elapsedMs: 3000,
      wpm: 55,
      phrase: 'stay curious',
      achievedAt: 5,
    });

    const board = await leaderboard.getLeaderboard('guild-1');
    assert.equal(board.totalUsers, 2);
    assert.deepEqual(board.entries.map((entry) => entry.userId), ['alpha', 'beta']);
    assert.deepEqual(board.entries.map((entry) => entry.rank), [1, 2]);
    assert.equal(board.entries[0].bestMs, 3800);

    const standing = await leaderboard.getStanding('guild-1', 'beta');
    assert.equal(standing.rank, 2);
    assert.equal(standing.totalUsers, 2);

    const otherGuild = await leaderboard.getLeaderboard('guild-2');
    assert.equal(otherGuild.totalUsers, 1);
    assert.equal(otherGuild.entries[0].username, 'Gamma');
  });
});

test('Type Race rejects invalid scores and persists the board file', async () => {
  await withLeaderboardFile(async () => {
    await assert.rejects(
      leaderboard.recordRace({ guildId: 'guild-1', userId: 'alpha', elapsedMs: 0 }),
      RangeError,
    );
    await assert.rejects(
      leaderboard.recordRace({ guildId: '', userId: 'alpha', elapsedMs: 1000 }),
      /guild and user/,
    );

    await leaderboard.recordRace({
      guildId: 'guild-1',
      userId: 'alpha',
      username: 'Alpha',
      elapsedMs: 3200,
      wpm: 50,
      phrase: 'keep it simple',
      achievedAt: 10,
    });

    const saved = JSON.parse(await fs.readFile(leaderboard.leaderboardFile(), 'utf8'));
    assert.equal(saved.version, 1);
    assert.equal(saved.entries.length, 1);
    assert.equal(saved.entries[0].bestMs, 3200);
  });
});

test('/typerace saves a personal best and /typeraceleaderboard shows it', async () => {
  await withLeaderboardFile(async () => {
    const originalNow = Date.now;
    let now = 1_700_000_000_000;
    Date.now = () => now;

    try {
      const start = chatInteraction();
      await typerace.execute(start);

      const gameId = start.captured.reply.components[0].components[0].data.custom_id.split(':')[2];
      const button = componentInteraction(`typerace:start:${gameId}`);
      await typerace.handleComponent(button);

      const phrase = button.modal.components[0].components[0].label.replace(/^Type: /, '');
      now += 3500;

      const submit = modalInteraction(`typerace:submit:${gameId}`, phrase);
      await typerace.handleModalSubmit(submit);

      const result = submit.captured.reply;
      assert.match(result.embeds[0].data.description, /New personal best/);
      assert.match(result.embeds[0].data.description, /3\.5s/);

      const boardInteraction = chatInteraction({ userId: USER_ID, username: 'Nova' });
      await leaderboardCommand.execute(boardInteraction);

      const fields = boardInteraction.captured.reply.embeds[0].data.fields;
      assert.match(fields[0].value, /\*\*Nova\*\*/);
      assert.match(fields[0].value, /3\.5s/);
      assert.match(fields[1].value, /3\.5s/);
      assert.equal(fields[2].value, '**1**');
    } finally {
      Date.now = originalNow;
    }
  });
});

test('/typeraceleaderboard is server-only', async () => {
  const interaction = chatInteraction({ guildId: null });
  await leaderboardCommand.execute(interaction);

  assert.match(interaction.captured.reply.content, /per server/);
});
