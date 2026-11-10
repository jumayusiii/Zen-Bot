const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const settings = require('../src/lib/levelSettings');

const GUILD_ID = '1558612109976408094';

async function withSettingsFile(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'zen-level-settings-'));
  process.env.LEVEL_SETTINGS_FILE = path.join(directory, 'level-settings.json');
  process.env.LANGUAGES_FILE = path.join(directory, 'languages.json');
  process.env.MODERATION_LOG_FILE = path.join(directory, 'moderation-logs.json');
  settings.resetLevelSettingsCache();

  try {
    await run();
  } finally {
    delete process.env.LEVEL_SETTINGS_FILE;
    delete process.env.LANGUAGES_FILE;
    delete process.env.MODERATION_LOG_FILE;
    settings.resetLevelSettingsCache();
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('the level system defaults to enabled and persists a per-server disable', async () => {
  await withSettingsFile(async () => {
    assert.equal(settings.getLevelSystemSettings(GUILD_ID).enabled, true);
    assert.equal(settings.isLevelSystemDisabled(GUILD_ID), false);
    assert.equal(settings.isLevelSystemDisabled('500000000000000002'), false);

    const disabled = await settings.setLevelSystemEnabled(GUILD_ID, false, 'admin-1');
    assert.equal(disabled.changed, true);
    assert.equal(settings.isLevelSystemDisabled(GUILD_ID), true);
    assert.equal(settings.isLevelSystemDisabled('500000000000000002'), false);

    const saved = JSON.parse(await fs.readFile(process.env.LEVEL_SETTINGS_FILE, 'utf8'));
    assert.equal(saved.guilds[GUILD_ID].enabled, false);
    assert.equal(saved.guilds[GUILD_ID].updatedBy, 'admin-1');

    settings.resetLevelSettingsCache();
    assert.equal(settings.isLevelSystemDisabled(GUILD_ID), true);

    const enabled = await settings.setLevelSystemEnabled(GUILD_ID, true, 'admin-2');
    assert.equal(enabled.changed, true);
    assert.equal(settings.isLevelSystemDisabled(GUILD_ID), false);

    settings.resetLevelSettingsCache();
    assert.equal(settings.isLevelSystemDisabled(GUILD_ID), false);
  });
});

test('repeating a setting does not rewrite the switch', async () => {
  await withSettingsFile(async () => {
    assert.equal((await settings.setLevelSystemEnabled(GUILD_ID, false, 'admin-1')).changed, true);
    assert.equal((await settings.setLevelSystemEnabled(GUILD_ID, false, 'admin-1')).changed, false);
    assert.equal((await settings.setLevelSystemEnabled(GUILD_ID, true, 'admin-1')).changed, true);
    assert.equal((await settings.setLevelSystemEnabled(GUILD_ID, true, 'admin-1')).changed, false);
  });
});

test('a missing server cannot change the level settings', async () => {
  await assert.rejects(
    () => settings.setLevelSystemEnabled('', false),
    /server/i,
  );
});
