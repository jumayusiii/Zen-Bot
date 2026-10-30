const assert = require('node:assert/strict');
const test = require('node:test');

const fortuneCommand = require('../src/commands/fun/fortunecookie');
const topicCommand = require('../src/commands/fun/topic');
const { FORTUNES, randomFortune } = require('../src/lib/fortunes');
const { TOPICS, categoryFor, randomTopic } = require('../src/lib/topics');

const USER_ID = '940000000000000001';
const OTHER_ID = '940000000000000002';

const client = {
  user: {
    username: 'TestBot',
    displayAvatarURL: () => 'https://cdn.example/bot.png',
  },
};

function commandInteraction({ userId = USER_ID, theme = null } = {}) {
  const captured = {};

  return {
    captured,
    client,
    user: { id: userId, username: 'tester' },
    options: {
      getString: (name) => (name === 'theme' ? theme : null),
    },
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
    user: { id: userId, username: 'tester' },
    async reply(payload) {
      captured.reply = payload;
    },
    async update(payload) {
      captured.update = payload;
    },
  };
}

test('fortune picks avoid the previous cookie and draw unique lucky numbers', () => {
  const first = randomFortune(() => 0);
  assert.equal(first.index, 0);
  assert.equal(first.text, FORTUNES[0].text);
  assert.equal(first.luckyNumbers.length, 6);
  assert.equal(new Set(first.luckyNumbers).size, 6);
  assert.deepEqual(first.luckyNumbers, [1, 2, 3, 4, 5, 6]);

  const next = randomFortune(() => 0, first.index);
  assert.notEqual(next.index, first.index);
  assert.ok(next.luckyNumbers.every((number) => number >= 1 && number <= 49));
});

test('/fortunecookie posts a compact result and only its owner can reroll', async () => {
  const start = commandInteraction();
  await fortuneCommand.execute(start);

  const initial = start.captured.reply;
  const fields = initial.embeds[0].data.fields;
  assert.equal(fields.length, 3);
  assert.ok(fields.every((field) => field.inline === true));
  assert.equal(fields[0].name, '🧭 Theme');
  assert.match(fields[1].value, /`\d{2}`/);
  assert.match(fields[1].value, /`\d{2}`/);

  const buttonId = initial.components[0].components[0].data.custom_id;
  assert.match(buttonId, /^fortunecookie:again:/);

  const stranger = componentInteraction(buttonId, OTHER_ID);
  await fortuneCommand.handleComponent(stranger);
  assert.match(stranger.captured.reply.content, /Only the person/);

  const owner = componentInteraction(buttonId);
  await fortuneCommand.handleComponent(owner);
  assert.ok(owner.captured.update);
  assert.match(owner.captured.update.embeds[0].data.title, /Fortune cookie/);
});

test('topics can be filtered by theme and avoid the previous prompt', () => {
  const food = randomTopic(() => 0, { category: 'food' });
  assert.equal(food.category, 'food');
  assert.equal(food.meta.label, 'Food');

  const next = randomTopic(() => 0, { category: 'food', excludeIndex: food.index });
  assert.notEqual(next.index, food.index);
  assert.equal(next.category, 'food');

  assert.equal(categoryFor('not-a-theme'), null);
  assert.ok(TOPICS.every((topic) => categoryFor(topic.category)));
});

test('/topic keeps the selected theme when shuffled and locks the controls', async () => {
  const start = commandInteraction({ theme: 'food' });
  await topicCommand.execute(start);

  const initial = start.captured.reply;
  const fields = initial.embeds[0].data.fields;
  assert.equal(fields.length, 2);
  assert.ok(fields.every((field) => field.inline === true));
  assert.equal(fields[0].value, '🍜 Food');

  const description = initial.embeds[0].data.description;
  assert.ok(TOPICS.some((topic) => topic.category === 'food' && description.includes(topic.text)));

  const buttonId = initial.components[0].components[0].data.custom_id;
  assert.match(buttonId, /:food$/);

  const stranger = componentInteraction(buttonId, OTHER_ID);
  await topicCommand.handleComponent(stranger);
  assert.match(stranger.captured.reply.content, /Only the person/);

  const owner = componentInteraction(buttonId);
  await topicCommand.handleComponent(owner);
  assert.equal(owner.captured.update.embeds[0].data.fields[0].value, '🍜 Food');
});
