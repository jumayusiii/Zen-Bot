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
  assert.equal(registry.size, 15);

  for (const name of ['uptime', 'poll', 'remind', 'sitestatus', 'helplist']) {
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
  assert.equal(registry.get('uptime').beta, undefined);
  assert.equal(registry.get('poll').data.toJSON().options.length, 2);
  assert.equal(registry.get('remind').data.toJSON().options.length, 3);
});
