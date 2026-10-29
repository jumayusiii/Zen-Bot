const assert = require('node:assert/strict');
const test = require('node:test');

const trivia = require('../src/commands/minigames/trivia');

const client = {
  user: {
    username: 'TestBot',
    displayAvatarURL: () => 'https://cdn.example/bot.png',
  },
};

function chatInteraction(userId) {
  const captured = {};

  return {
    captured,
    client,
    user: { id: userId, username: 'Player' },
    async reply(payload) {
      captured.reply = payload;
    },
  };
}

function componentInteraction(customId, userId) {
  const captured = {};

  return {
    captured,
    customId,
    client,
    user: { id: userId, username: 'Player' },
    async reply(payload) {
      captured.reply = payload;
    },
    async update(payload) {
      captured.update = payload;
    },
  };
}

function gameIdFrom(payload) {
  return payload.components[0].components[0].data.custom_id.split(':')[2];
}

test('/trivia shows one refresh after an answer and changes the question each time', async () => {
  const start = chatInteraction('owner-1');
  await trivia.execute(start);

  const initial = start.captured.reply;
  assert.equal(initial.components.length, 1);
  const gameId = gameIdFrom(initial);
  const firstQuestion = initial.embeds[0].data.title;

  const answer = componentInteraction(`trivia:answer:${gameId}:0`, 'owner-1');
  await trivia.handleComponent(answer);

  const answered = answer.captured.update;
  assert.equal(answered.components.length, 2);
  assert.deepEqual(
    answered.embeds[0].data.fields.map((field) => field.name),
    ['Choices', '📊 Score', '🔁 Refreshes'],
  );
  assert.match(answered.embeds[0].data.fields[2].value, /\*\*5\*\* of \*\*5\*\* left/);

  const next = componentInteraction(`trivia:next:${gameId}`, 'owner-1');
  await trivia.handleComponent(next);

  const refreshed = next.captured.update;
  assert.equal(refreshed.components.length, 1);
  assert.notEqual(refreshed.embeds[0].data.title, firstQuestion);
  assert.match(refreshed.embeds[0].data.fields[2].value, /\*\*4\*\* of \*\*5\*\* left/);
});

test('/trivia stops refreshing after five rerolls', async () => {
  const start = chatInteraction('owner-2');
  await trivia.execute(start);

  const gameId = gameIdFrom(start.captured.reply);
  const answer = componentInteraction(`trivia:answer:${gameId}:0`, 'owner-2');
  await trivia.handleComponent(answer);

  let latest = answer.captured.update;

  for (let round = 0; round < trivia.MAX_REFRESHES; round += 1) {
    const next = componentInteraction(`trivia:next:${gameId}`, 'owner-2');
    await trivia.handleComponent(next);
    assert.ok(next.captured.update, `refresh ${round + 1} should update the report`);

    const answered = componentInteraction(`trivia:answer:${gameId}:0`, 'owner-2');
    await trivia.handleComponent(answered);
    latest = answered.captured.update;
  }

  assert.match(latest.embeds[0].data.fields[2].value, /\*\*0\*\* of \*\*5\*\* left/);
  assert.equal(latest.components[1].components[0].data.disabled, true);

  const blocked = componentInteraction(`trivia:next:${gameId}`, 'owner-2');
  await trivia.handleComponent(blocked);
  assert.match(blocked.captured.reply.content, /used all \*\*5\*\* refreshes/);
});

test('/trivia keeps each round private to the player who started it', async () => {
  const start = chatInteraction('owner-3');
  await trivia.execute(start);

  const gameId = gameIdFrom(start.captured.reply);
  const stranger = componentInteraction(`trivia:answer:${gameId}:0`, 'someone-else');
  await trivia.handleComponent(stranger);

  assert.match(stranger.captured.reply.content, /belongs to someone else/);

  const owner = componentInteraction(`trivia:answer:${gameId}:0`, 'owner-3');
  await trivia.handleComponent(owner);
  const repeat = componentInteraction(`trivia:answer:${gameId}:1`, 'owner-3');
  await trivia.handleComponent(repeat);

  assert.match(repeat.captured.reply.content, /already answered/);
});
