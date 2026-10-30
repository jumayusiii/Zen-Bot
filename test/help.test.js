const assert = require('node:assert/strict');
const { Collection } = require('discord.js');
const test = require('node:test');

const { buildHelpPayload, groupCommands, signature } = require('../src/lib/help');

const client = {
  user: {
    username: 'TestBot',
    displayAvatarURL: () => 'https://cdn.example/bot.png',
  },
};

function fakeCommand(name, category, { beta = false, options = [] } = {}) {
  return {
    category,
    beta,
    data: {
      name,
      description: `The ${name} command`,
      toJSON: () => ({ name, description: `The ${name} command`, options }),
    },
  };
}

function registry(...commands) {
  return new Collection(commands.map((command) => [command.data.name, command]));
}

const commands = registry(
  fakeCommand('meme', 'fun'),
  fakeCommand('trivia', 'minigames', { beta: true }),
  fakeCommand('sitestatus', 'utility'),
  fakeCommand('poll', 'utility', { beta: true }),
  fakeCommand('rank', 'levels'),
);

test('groupCommands sorts categories and omits empty groups', () => {
  const groups = groupCommands(commands);

  assert.deepEqual(groups.map((group) => group.meta.id), ['fun', 'minigames', 'levels', 'utility']);
  assert.deepEqual(groups[2].commands.map((command) => command.data.name), ['rank']);
  assert.deepEqual(groups[3].commands.map((command) => command.data.name), ['poll', 'sitestatus']);
});

test('signature renders required and optional options', () => {
  const command = fakeCommand('remind', 'utility', {
    options: [
      { name: 'when', required: true },
      { name: 'message', required: true },
      { name: 'where', required: false },
    ],
  });

  assert.equal(signature(command), '/remind <when> <message> [where]');
});

test('the overview has a tab for every category and the active tab is highlighted', () => {
  const payload = buildHelpPayload(client, commands, 'overview', 'Tester');
  const embed = payload.embeds[0];
  const buttons = payload.components[0].components;

  assert.equal(embed.data.title, 'Everything the bot can do');
  assert.match(embed.data.description, /\*\*5 commands\*\*/);
  assert.equal(buttons.length, 5);
  assert.equal(buttons[0].data.custom_id, 'helplist:view:overview');
  assert.equal(buttons[0].data.style, 1);
  assert.equal(buttons[1].data.custom_id, 'helplist:view:fun');
  assert.equal(buttons[3].data.custom_id, 'helplist:view:levels');
});

test('more than five tabs wrap onto a second button row', () => {
  const withModeration = registry(
    fakeCommand('meme', 'fun'),
    fakeCommand('ban', 'moderation'),
    fakeCommand('trivia', 'minigames', { beta: true }),
    fakeCommand('sitestatus', 'utility'),
    fakeCommand('rank', 'levels'),
  );
  const payload = buildHelpPayload(client, withModeration, 'overview', 'Tester');

  assert.equal(payload.components.length, 2);
  assert.equal(payload.components[0].components.length, 5);
  assert.equal(payload.components[1].components.length, 1);
  assert.equal(payload.components[0].components[2].data.custom_id, 'helplist:view:moderation');
  assert.equal(payload.components[1].components[0].data.custom_id, 'helplist:view:utility');
});

test('a category tab lists its commands and falls back to overview for unknown views', () => {
  const payload = buildHelpPayload(client, commands, 'utility', 'Tester');
  const embed = payload.embeds[0];

  assert.equal(embed.data.title, 'Utilities');
  assert.deepEqual(embed.data.fields.map((field) => field.name), [
    '**/poll**  ·  🧪',
    '**/sitestatus**',
  ]);

  const fallback = buildHelpPayload(client, commands, 'nope', 'Tester');
  assert.equal(fallback.embeds[0].data.title, 'Everything the bot can do');
});

test('image commands get their own tab with a dedicated view', () => {
  const withImages = registry(
    fakeCommand('meme', 'fun'),
    fakeCommand('cat', 'images'),
    fakeCommand('dog', 'images'),
  );
  const groups = groupCommands(withImages);

  assert.deepEqual(groups.map((group) => group.meta.id), ['fun', 'images']);

  const payload = buildHelpPayload(client, withImages, 'images', 'Tester');
  const embed = payload.embeds[0];
  assert.equal(embed.data.title, 'Images');
  assert.deepEqual(embed.data.fields.map((field) => field.name), [
    '**/cat**',
    '**/dog**',
  ]);
});

test('an empty registry still renders an overview without tabs', () => {
  const payload = buildHelpPayload(client, new Collection(), 'overview', 'Tester');

  assert.equal(payload.components.length, 0);
  assert.match(payload.embeds[0].data.description, /\*\*0 commands\*\*/);
});
