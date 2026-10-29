const assert = require('node:assert/strict');
const test = require('node:test');

const slots = require('../src/commands/minigames/slots');
const joke = require('../src/commands/fun/joke');
const wyr = require('../src/commands/minigames/wouldyourather');
const { SYMBOLS, evaluateSpin, pickSymbol, spinSlots } = require('../src/lib/slots');
const { JOKES, randomJoke } = require('../src/lib/jokes');
const wyrLib = require('../src/lib/wyr');

const USER_ID = '930000000000000001';

function fakeClient() {
  return {
    user: {
      username: 'TestBot',
      displayAvatarURL: () => 'https://cdn.example/bot.png',
    },
  };
}

function fakeInteraction(overrides = {}) {
  const captured = {};

  return {
    captured,
    user: { id: USER_ID, username: 'tester' },
    client: fakeClient(),
    options: {
      getString: () => null,
    },
    async reply(payload) {
      captured.reply = payload;
    },
    async update(payload) {
      captured.update = payload;
    },
    ...overrides,
  };
}

test('slot symbols are weighted and results are classified', () => {
  assert.equal(pickSymbol(() => 0).emoji, SYMBOLS[0].emoji);
  assert.equal(pickSymbol(() => 0.999).emoji, SYMBOLS.at(-1).emoji);
  assert.equal(spinSlots(() => 0).length, 3);

  const jackpot = evaluateSpin([SYMBOLS[0], SYMBOLS[0], SYMBOLS[0]]);
  assert.equal(jackpot.label, 'Jackpot');
  assert.equal(jackpot.matches, 3);

  const pair = evaluateSpin([SYMBOLS[0], SYMBOLS[0], SYMBOLS[1]]);
  assert.equal(pair.label, 'Two of a kind');
  assert.equal(pair.matches, 2);

  const none = evaluateSpin([SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]]);
  assert.equal(none.label, 'No match');
});

test('/slots posts a compact three-column result', async () => {
  const interaction = fakeInteraction();
  await slots.execute(interaction);

  const fields = interaction.captured.reply.embeds[0].data.fields;
  assert.equal(fields.length, 4);
  assert.ok(fields.slice(0, 3).every((field) => field.inline === true));
  assert.match(interaction.captured.reply.embeds[0].data.description, /🍒|🍋|🔔|⭐|💎|7️⃣/);
});

test('jokes avoid the previous joke and reveal on demand', async () => {
  const first = randomJoke(() => 0);
  const next = randomJoke(() => 0, first.index);
  assert.notEqual(next.index, first.index);
  assert.equal(JOKES.length > 1, true);

  const interaction = fakeInteraction();
  await joke.execute(interaction);
  const unrevealed = interaction.captured.reply;
  const revealId = unrevealed.components[0].components[0].data.custom_id;
  assert.match(revealId, /^joke:reveal:/);
  assert.equal(unrevealed.embeds[0].data.fields[0].name, '🙈 Punchline');

  const buttonInteraction = fakeInteraction({
    customId: revealId,
    user: { id: USER_ID, username: 'tester' },
  });
  await joke.handleComponent(buttonInteraction);
  assert.equal(buttonInteraction.captured.update.embeds[0].data.fields[0].name, '😂 Punchline');
  assert.equal(
    buttonInteraction.captured.update.components[0].components[0].data.label,
    'Another joke',
  );
});

test('would-you-rather votes update inline results', async () => {
  wyrLib.resetSessions();
  const interaction = fakeInteraction();
  await wyr.execute(interaction);

  const payload = interaction.captured.reply;
  const voteId = payload.components[0].components[0].data.custom_id;
  assert.match(voteId, /^wyr:vote:a:/);
  assert.equal(payload.embeds[0].data.fields.length, 3);
  assert.ok(payload.embeds[0].data.fields.every((field) => field.inline === true));

  const voteInteraction = fakeInteraction({ customId: voteId });
  await wyr.handleComponent(voteInteraction);

  const updated = voteInteraction.captured.update.embeds[0].data.fields;
  assert.match(updated[0].value, /1 vote/);
  assert.match(updated[0].value, /100%/);
  assert.match(updated[2].value, /\*\*1\*\* vote/);

  const sessionId = voteId.split(':').at(-1);
  const changed = wyrLib.castVote(sessionId, USER_ID, 'b');
  assert.equal(changed.counts.a, 0);
  assert.equal(changed.counts.b, 1);
  assert.equal(changed.changed, true);
});
