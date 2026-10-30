const assert = require('node:assert/strict');
const test = require('node:test');

const memory = require('../src/commands/minigames/memory');
const {
  START_LENGTH,
  SYMBOLS,
  createSequence,
  extendSequence,
  isCorrectStep,
  symbolById,
} = require('../src/lib/memory');

const USER_ID = '950000000000000001';
const OTHER_ID = '950000000000000002';

const client = {
  user: {
    username: 'TestBot',
    displayAvatarURL: () => 'https://cdn.example/bot.png',
  },
};

function chatInteraction(userId = USER_ID) {
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

function componentInteraction(customId, userId = USER_ID) {
  const captured = {};

  return {
    captured,
    client,
    customId,
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

function sequenceFrom(payload) {
  const description = payload.embeds[0].data.description;
  const line = description.split('\n').find((entry) => entry.startsWith('## ')) ?? '';
  const pattern = new RegExp(SYMBOLS.map((symbol) => symbol.emoji).join('|'), 'gu');
  const matches = line.match(pattern) ?? [];

  return matches.map((emoji) => SYMBOLS.find((symbol) => symbol.emoji === emoji).id);
}

test('memory sequences grow and steps are checked without leaking state', () => {
  const sequence = createSequence(4, () => 0);
  assert.equal(sequence.length, 4);
  assert.ok(sequence.every((id) => symbolById(id)));

  const longer = extendSequence(sequence, () => 0.5);
  assert.equal(longer.length, 5);
  assert.equal(isCorrectStep(longer, 0, sequence[0]), true);
  assert.equal(isCorrectStep(longer, 0, 'nope'), false);
  assert.equal(isCorrectStep(longer, 99, sequence[0]), false);
  assert.throws(() => extendSequence([], () => 0), TypeError);
});

test('/memory hides the sequence after start and advances after a full repeat', async () => {
  const start = chatInteraction();
  await memory.execute(start);

  const initial = start.captured.reply;
  const gameId = gameIdFrom(initial);
  const sequence = sequenceFrom(initial);

  assert.equal(initial.embeds[0].data.title, 'Memory · Round 1');
  assert.equal(sequence.length, START_LENGTH);
  assert.equal(initial.components[0].components[0].data.custom_id, `memory:ready:${gameId}`);

  const stranger = componentInteraction(`memory:ready:${gameId}`, OTHER_ID);
  await memory.handleComponent(stranger);
  assert.match(stranger.captured.reply.content, /belongs to someone else/);

  const ready = componentInteraction(`memory:ready:${gameId}`);
  await memory.handleComponent(ready);
  const input = ready.captured.update;

  assert.equal(input.components[0].components.length, 4);
  assert.doesNotMatch(input.embeds[0].data.description, /##/);
  assert.match(input.embeds[0].data.description, /Step 1 of 3/);

  let latest = input;
  for (const symbolId of sequence) {
    const press = componentInteraction(`memory:press:${gameId}:${symbolId}`);
    await memory.handleComponent(press);
    latest = press.captured.update;
  }

  assert.equal(latest.embeds[0].data.title, 'Memory · Round 2');
  assert.equal(latest.embeds[0].data.fields[1].value, '**1**');
  assert.equal(sequenceFrom(latest).length, START_LENGTH + 1);
  assert.equal(latest.components[0].components[0].data.custom_id, `memory:ready:${gameId}`);
});

test('a wrong symbol ends the round and Play again starts a fresh sequence', async () => {
  const start = chatInteraction();
  await memory.execute(start);

  const initial = start.captured.reply;
  const gameId = gameIdFrom(initial);
  const sequence = sequenceFrom(initial);

  const ready = componentInteraction(`memory:ready:${gameId}`);
  await memory.handleComponent(ready);

  const wrong = SYMBOLS.find((symbol) => symbol.id !== sequence[0]);
  const press = componentInteraction(`memory:press:${gameId}:${wrong.id}`);
  await memory.handleComponent(press);

  const over = press.captured.update;
  assert.equal(over.embeds[0].data.title, 'Memory · game over');
  assert.match(over.embeds[0].data.description, /Not quite/);
  assert.equal(over.components[0].components[0].data.custom_id, `memory:again:${gameId}`);

  const again = componentInteraction(`memory:again:${gameId}`);
  await memory.handleComponent(again);
  const restarted = again.captured.update;

  assert.equal(restarted.embeds[0].data.title, 'Memory · Round 1');
  assert.equal(restarted.embeds[0].data.fields[1].value, '**0**');
  assert.equal(sequenceFrom(restarted).length, START_LENGTH);
});
