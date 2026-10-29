const assert = require('node:assert/strict');
const test = require('node:test');

const wordscramble = require('../src/commands/minigames/wordscramble');
const {
  MAX_ROUNDS,
  WORDS,
  buildChoices,
  createRound,
  randomWord,
  scrambleWord,
} = require('../src/lib/wordScramble');

const USER_ID = '910000000000000001';
const client = {
  user: {
    username: 'TestBot',
    displayAvatarURL: () => 'https://cdn.example/bot.png',
  },
};

function fakeInteraction(overrides = {}) {
  const captured = {};

  return {
    captured,
    client,
    user: { id: USER_ID, username: 'tester' },
    async reply(payload) {
      captured.reply = payload;
    },
    async update(payload) {
      captured.update = payload;
    },
    ...overrides,
  };
}

function gameIdFrom(payload) {
  return payload.components[0].components[0].data.custom_id.split(':')[2];
}

test('randomWord respects the previous answer and scramble keeps every letter', () => {
  const word = randomWord(() => 0);
  assert.equal(word.word, WORDS[0].word);

  const next = randomWord(() => 0, word.word);
  assert.notEqual(next.word, word.word);

  for (const entry of WORDS) {
    const scrambled = scrambleWord(entry.word, () => 0.25);
    assert.equal(scrambled.length, entry.word.length);
    assert.deepEqual([...scrambled].sort(), [...entry.word].sort());
    assert.notEqual(scrambled, entry.word);
  }
});

test('buildChoices returns four unique words including the answer', () => {
  const choices = buildChoices('DISCORD', () => 0.4);

  assert.equal(choices.length, 4);
  assert.equal(new Set(choices).size, 4);
  assert.ok(choices.includes('DISCORD'));
});

test('createRound exposes a valid answer index', () => {
  const round = createRound(() => 0.5);

  assert.equal(round.choices[round.answer], round.word);
  assert.equal(round.scrambled.length, round.word.length);
  assert.ok(round.hint.length > 0);
});

test('/wordscramble answers in place, advances and locks the round to its owner', async () => {
  const start = fakeInteraction();
  await wordscramble.execute(start);

  const initial = start.captured.reply;
  const gameId = gameIdFrom(initial);
  const fields = initial.embeds[0].data.fields;

  assert.equal(fields.length, 3);
  assert.ok(fields.every((field) => field.inline === true));
  assert.equal(initial.components[0].components.length, 4);
  assert.equal(initial.components.length, 1);

  const answerId = initial.components[0].components[0].data.custom_id;
  const answer = fakeInteraction({ customId: answerId });
  await wordscramble.handleComponent(answer);

  const answered = answer.captured.update;
  assert.equal(answered.components[0].components[0].data.disabled, true);
  assert.match(answered.embeds[0].data.description, /Correct|Not quite/);
  assert.equal(answered.components[1].components[0].data.label.startsWith('Next word'), true);

  const stranger = fakeInteraction({
    customId: `wordscramble:next:${gameId}`,
    user: { id: '910000000000000002', username: 'stranger' },
  });
  await wordscramble.handleComponent(stranger);
  assert.match(stranger.captured.reply.content, /belongs to someone else/);

  const next = fakeInteraction({ customId: `wordscramble:next:${gameId}` });
  await wordscramble.handleComponent(next);
  assert.equal(next.captured.update.components.length, 1);
  assert.equal(next.captured.update.embeds[0].data.fields[1].value, `**2** / ${MAX_ROUNDS}`);
});
