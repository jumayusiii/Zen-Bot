const assert = require('node:assert/strict');
const test = require('node:test');

const { createEmbed } = require('../src/lib/embeds');

const client = {
  user: {
    username: 'Zen',
    displayAvatarURL: () => 'https://cdn.example/zen.png',
  },
};

test('embeds are compact by default', () => {
  const embed = createEmbed(client, {
    title: '  Compact card  ',
    description: '  First line\n\n\n\nSecond line  ',
    fields: [
      { name: '  Kept  ', value: '  one line  ', inline: true },
      { name: 'Empty', value: '   ' },
    ],
    footer: 'Requested by Tester',
  });
  const data = embed.data;

  assert.equal(data.title, 'Compact card');
  assert.equal(data.description, 'First line\n\nSecond line');
  assert.equal(data.author, undefined);
  assert.equal(data.footer.text, 'Requested by Tester  •  v1.19.0-beta.20');
  assert.equal(data.footer.iconURL, undefined);
  assert.equal(data.footer.icon_url, undefined);
  assert.equal(data.fields.length, 1);
  assert.equal(data.fields[0].name, 'Kept');
  assert.equal(data.fields[0].value, 'one line');
});

test('an explicit author is still available when a command needs one', () => {
  const embed = createEmbed(client, { title: 'Test', author: 'Custom header' });

  assert.equal(embed.data.author.name, 'Custom header');
  assert.equal(embed.data.author.icon_url, 'https://cdn.example/zen.png');
});
