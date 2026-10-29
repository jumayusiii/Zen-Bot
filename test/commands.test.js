const assert = require('node:assert/strict');
const { Collection } = require('discord.js');
const test = require('node:test');

const { loadCommands } = require('../src/handlers/commandHandler');

test('all commands load with valid names, descriptions and unique registrations', () => {
  const registry = new Collection();
  const originalLog = console.log;
  console.log = () => {};
  const count = loadCommands(registry);
  console.log = originalLog;

  assert.equal(count, registry.size);
  assert.equal(registry.size, 48);

  for (const name of [
    'uptime',
    'poll',
    'remind',
    'reminders',
    'roleinfo',
    'sitestatus',
    'helplist',
    'trivia',
    'tictactoe',
    'roll',
    'serverbanner',
    'invite',
    'timestamp',
    'choose',
    'higherlower',
    'ship',
    'fact',
    'hangman',
    'blackjack',
    'rank',
    'levels',
    'mute',
    'unmute',
    'kick',
    'ban',
    'unban',
    'levelreward',
    'compliment',
    'rate',
    'guessnumber',
    'reaction',
    'ping',
    'modlog',
    'welcome',
    'leave',
    'slots',
    'joke',
    'wouldyourather',
  ]) {
    assert.ok(registry.has(name), `expected /${name} to load`);
  }

  for (const [name, command] of registry) {
    assert.match(name, /^[\w-]{1,32}$/);
    assert.equal(typeof command.execute, 'function');
    const data = command.data.toJSON();
    assert.equal(data.name, name);
    assert.ok(data.description.length > 0 && data.description.length <= 100);
  }

  assert.equal(registry.get('poll').beta, true);
  assert.equal(registry.get('remind').beta, true);
  assert.equal(registry.get('reminders').beta, true);
  assert.equal(registry.get('roleinfo').beta, true);
  assert.equal(registry.get('trivia').beta, true);
  assert.equal(registry.get('tictactoe').beta, true);
  assert.equal(registry.get('roll').beta, true);
  assert.equal(registry.get('higherlower').beta, true);
  assert.equal(registry.get('hangman').beta, true);
  assert.equal(registry.get('blackjack').beta, true);
  assert.equal(registry.get('modlog').beta, true);
  assert.equal(registry.get('welcome').beta, true);
  assert.equal(registry.get('leave').beta, true);
  assert.equal(registry.get('slots').beta, true);
  assert.equal(registry.get('joke').beta, true);
  assert.equal(registry.get('wouldyourather').beta, true);
  assert.equal(registry.get('ship').beta, undefined);
  assert.equal(registry.get('fact').beta, undefined);
  assert.equal(registry.get('rank').beta, undefined);
  assert.equal(registry.get('levels').beta, undefined);
  assert.equal(registry.get('choose').beta, undefined);
  assert.equal(registry.get('timestamp').beta, undefined);
  assert.equal(registry.get('serverbanner').beta, undefined);
  assert.equal(registry.get('invite').beta, undefined);
  assert.equal(registry.get('uptime').beta, undefined);
  assert.equal(registry.get('poll').data.toJSON().options.length, 2);
  assert.equal(registry.get('remind').data.toJSON().options.length, 3);
  assert.equal(registry.get('reminders').data.toJSON().options.length, 0);
  assert.equal(registry.get('roleinfo').data.toJSON().options.length, 1);
  assert.equal(registry.get('trivia').data.toJSON().options.length, 0);
  assert.equal(registry.get('tictactoe').data.toJSON().options.length, 0);
  assert.equal(registry.get('roll').data.toJSON().options.length, 1);
  assert.equal(registry.get('serverbanner').data.toJSON().options.length, 0);
  assert.equal(registry.get('invite').data.toJSON().options.length, 0);
  assert.equal(registry.get('timestamp').data.toJSON().options.length, 1);
  assert.equal(registry.get('choose').data.toJSON().options.length, 2);
  assert.equal(registry.get('higherlower').data.toJSON().options.length, 0);
  assert.equal(registry.get('ship').data.toJSON().options.length, 2);
  assert.equal(registry.get('fact').data.toJSON().options.length, 0);
  assert.equal(registry.get('hangman').data.toJSON().options.length, 0);
  assert.equal(registry.get('blackjack').data.toJSON().options.length, 0);
  assert.equal(registry.get('rank').data.toJSON().options.length, 1);
  assert.equal(registry.get('levels').data.toJSON().options.length, 0);
  assert.equal(registry.get('mute').data.toJSON().options.length, 3);
  assert.equal(registry.get('unmute').data.toJSON().options.length, 2);
  assert.equal(registry.get('kick').data.toJSON().options.length, 2);
  assert.equal(registry.get('ban').data.toJSON().options.length, 4);
  assert.equal(registry.get('unban').data.toJSON().options.length, 2);
  assert.equal(registry.get('levelreward').data.toJSON().options.length, 3);
  assert.equal(registry.get('compliment').data.toJSON().options.length, 1);
  assert.equal(registry.get('rate').data.toJSON().options.length, 1);
  assert.equal(registry.get('guessnumber').data.toJSON().options.length, 1);
  assert.equal(registry.get('reaction').data.toJSON().options.length, 0);
  assert.equal(registry.get('ping').data.toJSON().options.length, 0);
  assert.equal(registry.get('modlog').data.toJSON().options.length, 2);
  assert.equal(registry.get('welcome').data.toJSON().options.length, 4);
  assert.equal(registry.get('leave').data.toJSON().options.length, 4);
  assert.equal(registry.get('slots').data.toJSON().options.length, 0);
  assert.equal(registry.get('joke').data.toJSON().options.length, 0);
  assert.equal(registry.get('wouldyourather').data.toJSON().options.length, 0);
});
