const assert = require('node:assert/strict');
const test = require('node:test');

const typerace = require('../src/commands/minigames/typerace');
const {
  PHRASES,
  formatDuration,
  matchesPhrase,
  randomPhrase,
  rateTyping,
  typingSpeed,
} = require('../src/lib/typerace');

const USER_ID = '960000000000000001';
const OTHER_ID = '960000000000000002';

const client = {
  user: {
    username: 'TestBot',
    displayAvatarURL: () => 'https://cdn.example/bot.png',
  },
};

function chatInteraction() {
  const captured = {};

  return {
    captured,
    client,
    user: { id: USER_ID, username: 'Player' },
    async reply(payload) {
      captured.reply = payload;
    },
  };
}

function componentInteraction(customId, userId = USER_ID) {
  const captured = {};
  const interaction = {
    captured,
    client,
    customId,
    user: { id: userId, username: 'Player' },
    async reply(payload) {
      captured.reply = payload;
    },
    async showModal(modal) {
      this.modal = modal.toJSON();
    },
  };

  return interaction;
}

function modalInteraction(customId, typed, userId = USER_ID) {
  const captured = {};

  return {
    captured,
    client,
    customId,
    user: { id: userId, username: 'Player' },
    fields: {
      getTextInputValue: (name) => (name === 'phrase' ? typed : ''),
    },
    async reply(payload) {
      captured.reply = payload;
    },
  };
}

function gameIdFrom(payload) {
  return payload.components[0].components[0].data.custom_id.split(':')[2];
}

function phraseFrom(modal) {
  const label = modal.components[0].components[0].label;
  return label.replace(/^Type: /, '');
}

test('typing helpers normalize whitespace, score speed and rate results', () => {
  assert.equal(randomPhrase(() => 0).text, PHRASES[0]);
  assert.notEqual(randomPhrase(() => 0, 0).index, 0);
  assert.equal(matchesPhrase('  KEEP   IT   simple  ', 'keep it simple'), true);
  assert.equal(matchesPhrase('keep it simple!', 'keep it simple'), false);

  assert.equal(typingSpeed('abcde', 60000), 1);
  assert.equal(typingSpeed('abcde', 30000), 2);
  assert.equal(typingSpeed('abcde', 0), 0);
  assert.equal(formatDuration(4000), '4.0s');
  assert.equal(formatDuration(12000), '12s');
  assert.equal(rateTyping(95).label, 'Blazing');
  assert.equal(rateTyping(10).label, 'Warming up');
});

test('/typerace opens a modal, measures a correct run and offers a new phrase', async () => {
  const start = chatInteraction();
  await typerace.execute(start);

  const ready = start.captured.reply;
  const gameId = gameIdFrom(ready);
  assert.equal(ready.components[0].components[0].data.custom_id, `typerace:start:${gameId}`);

  const originalNow = Date.now;
  let now = 1_700_000_000_000;
  Date.now = () => now;

  try {
    const button = componentInteraction(`typerace:start:${gameId}`);
    await typerace.handleComponent(button);

    assert.ok(button.modal);
    assert.equal(button.modal.custom_id, `typerace:submit:${gameId}`);
    const phrase = phraseFrom(button.modal);
    assert.ok(PHRASES.includes(phrase));

    now += 4000;

    const submit = modalInteraction(`typerace:submit:${gameId}`, phrase.toUpperCase());
    await typerace.handleModalSubmit(submit);

    const result = submit.captured.reply;
    const fields = result.embeds[0].data.fields;
    assert.equal(result.embeds[0].data.title, 'Type Race · finished');
    assert.equal(fields[0].name, '⚡ Speed');
    assert.equal(fields[0].value, `**${typingSpeed(phrase, 4000)} WPM**`);
    assert.equal(fields[1].value, '4.0s');
    assert.equal(fields[2].value, 'Exact');

    const again = componentInteraction(`typerace:again:${gameId}`);
    await typerace.handleComponent(again);
    assert.ok(again.modal);
    assert.notEqual(phraseFrom(again.modal), phrase);
  } finally {
    Date.now = originalNow;
  }
});

test('/typerace reports a miss and rejects another player', async () => {
  const start = chatInteraction();
  await typerace.execute(start);

  const ready = start.captured.reply;
  const gameId = gameIdFrom(ready);

  const originalNow = Date.now;
  let now = 1_700_000_100_000;
  Date.now = () => now;

  try {
    const stranger = componentInteraction(`typerace:start:${gameId}`, OTHER_ID);
    await typerace.handleComponent(stranger);
    assert.match(stranger.captured.reply.content, /belongs to someone else/);

    const button = componentInteraction(`typerace:start:${gameId}`);
    await typerace.handleComponent(button);

    const phrase = phraseFrom(button.modal);
    now += 3000;

    const submit = modalInteraction(`typerace:submit:${gameId}`, `${phrase} bonus`);
    await typerace.handleModalSubmit(submit);

    const result = submit.captured.reply;
    assert.equal(result.embeds[0].data.title, 'Type Race · not quite');
    assert.equal(result.embeds[0].data.fields[0].value, 'Unranked');
    assert.equal(result.embeds[0].data.fields[2].value, 'Missed');
    assert.match(result.embeds[0].data.description, new RegExp(phrase));
  } finally {
    Date.now = originalNow;
  }
});
