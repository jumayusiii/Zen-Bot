const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const languageCommand = require('../src/commands/moderation/language');
const { getGuildLanguage } = require('../src/lib/i18n');

async function withLanguageFile(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'zen-language-command-'));
  process.env.LANGUAGES_FILE = path.join(directory, 'languages.json');

  try {
    await run();
  } finally {
    delete process.env.LANGUAGES_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function fakeInteraction({ permissions = true, customId = null } = {}) {
  const captured = {};

  return {
    captured,
    customId,
    guild: { id: 'guild-1', name: 'Test Server' },
    user: { id: 'user-1', username: 'tester' },
    memberPermissions: { has: () => permissions },
    client: {
      user: {
        username: 'TestBot',
        displayAvatarURL: () => 'https://cdn.example/bot.png',
      },
    },
    async reply(payload) {
      captured.reply = payload;
    },
    async update(payload) {
      captured.update = payload;
    },
  };
}

test('/language shows the current language with English and Deutsch buttons', async () => {
  await withLanguageFile(async () => {
    const interaction = fakeInteraction();
    await languageCommand.execute(interaction);

    const embed = interaction.captured.reply.embeds[0].data;
    const buttons = interaction.captured.reply.components[0].components;

    assert.equal(embed.title, 'Language');
    assert.equal(embed.fields[0].value, '**English**');
    assert.equal(buttons.length, 2);
    assert.equal(buttons[0].data.custom_id, 'language:set:en');
    assert.equal(buttons[0].data.disabled, true);
    assert.equal(buttons[1].data.custom_id, 'language:set:de');
    assert.equal(buttons[1].data.disabled, false);
  });
});

test('/language saves German from a button and updates the menu in German', async () => {
  await withLanguageFile(async () => {
    const interaction = fakeInteraction({ customId: 'language:set:de' });
    await languageCommand.handleComponent(interaction);

    const embed = interaction.captured.update.embeds[0].data;
    const buttons = interaction.captured.update.components[0].components;

    assert.equal(embed.title, 'Sprache');
    assert.equal(embed.fields[0].value, '**Deutsch**');
    assert.equal(buttons[1].data.disabled, true);
    assert.equal(await getGuildLanguage('guild-1'), 'de');
  });
});

test('/language rejects members without Manage Server', async () => {
  await withLanguageFile(async () => {
    const interaction = fakeInteraction({ permissions: false });
    await languageCommand.execute(interaction);

    assert.equal(interaction.captured.reply.flags, 64);
    assert.match(interaction.captured.reply.content, /Manage Server/);
  });
});
