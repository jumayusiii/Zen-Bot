const assert = require('node:assert/strict');
const test = require('node:test');

const config = require('../src/lib/config');

test('presence defaults to the command directory and can be overridden', () => {
  const previous = process.env.PRESENCE_TEXT;

  try {
    delete process.env.PRESENCE_TEXT;
    assert.equal(config.presenceText(), 'use /help!');

    process.env.PRESENCE_TEXT = '  Playing with the community  ';
    assert.equal(config.presenceText(), 'Playing with the community');
  } finally {
    if (previous === undefined) delete process.env.PRESENCE_TEXT;
    else process.env.PRESENCE_TEXT = previous;
  }
});
