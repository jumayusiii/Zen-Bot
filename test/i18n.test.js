const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  getGuildLanguage,
  languagesFile,
  normalizeLanguage,
  setGuildLanguage,
  t,
} = require('../src/lib/i18n');

async function withLanguageFile(run) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'zen-language-'));
  process.env.LANGUAGES_FILE = path.join(directory, 'languages.json');

  try {
    await run(process.env.LANGUAGES_FILE);
  } finally {
    delete process.env.LANGUAGES_FILE;
    await fs.rm(directory, { recursive: true, force: true });
  }
}

test('normalizeLanguage maps Discord locales and German names', () => {
  assert.equal(normalizeLanguage('de'), 'de');
  assert.equal(normalizeLanguage('de-DE'), 'de');
  assert.equal(normalizeLanguage('de_AT'), 'de');
  assert.equal(normalizeLanguage('German'), 'de');
  assert.equal(normalizeLanguage('deutsch'), 'de');
  assert.equal(normalizeLanguage('en-US'), 'en');
  assert.equal(normalizeLanguage('fr'), 'en');
  assert.equal(normalizeLanguage(null), 'en');
});

test('translations interpolate placeholders and fall back to English', () => {
  assert.equal(t('de', 'language.title'), 'Sprache');
  assert.equal(t('en', 'language.title'), 'Language');
  assert.equal(t('fr', 'language.title'), 'Language');
  assert.equal(t('de', 'language.footer', { user: 'Ada' }), 'Verwaltet von Ada');
  assert.equal(t('en', 'balance.day', { count: 1 }), '**1** day');
  assert.equal(t('de', 'balance.days', { count: 3 }), '**3** Tage');
  assert.equal(t('de', 'not.a.key', {}, 'Fallback'), 'Fallback');
});

test('language lookups are cached and writes refresh the cache', async () => {
  await withLanguageFile(async () => {
    await setGuildLanguage('guild-cache', 'de');

    const originalReadFile = fs.readFile;
    let reads = 0;
    fs.readFile = (...args) => {
      reads += 1;
      return originalReadFile(...args);
    };

    try {
      assert.equal(await getGuildLanguage('guild-cache'), 'de');
      assert.equal(await getGuildLanguage('guild-cache'), 'de');
      assert.equal(reads, 0);
    } finally {
      fs.readFile = originalReadFile;
    }

    await setGuildLanguage('guild-cache', 'en');
    assert.equal(await getGuildLanguage('guild-cache'), 'en');
  });
});

test('language settings default to English and stay per server', async () => {
  await withLanguageFile(async (file) => {
    assert.equal(await getGuildLanguage('guild-1'), 'en');

    const saved = await setGuildLanguage('guild-1', 'de', { updatedBy: 'user-1' });
    assert.equal(saved.language, 'de');
    assert.equal(await getGuildLanguage('guild-1'), 'de');
    assert.equal(await getGuildLanguage('guild-2'), 'en');

    await setGuildLanguage('guild-2', 'en');
    await setGuildLanguage('guild-1', 'english');
    assert.equal(await getGuildLanguage('guild-1'), 'en');

    const stored = JSON.parse(await fs.readFile(file, 'utf8'));
    assert.equal(stored.guilds.length, 2);
    assert.ok(stored.guilds.some((entry) => entry.guildId === 'guild-1' && entry.language === 'en'));
    assert.equal(languagesFile(), file);
  });
});
