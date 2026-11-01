const assert = require('node:assert/strict');
const test = require('node:test');

const {
  RELEASES,
  getRelease,
  releaseMarkdown,
} = require('../src/lib/changelog');

test('release lookup is exact and renders GitHub Markdown', () => {
  const release = getRelease('1.18.0-beta.2');

  assert.ok(release);
  assert.equal(release.title, 'Chat now pays coins');
  assert.equal(getRelease('v1.18.0-beta.2'), null);
  assert.equal(getRelease('9.9.9'), null);

  const markdown = releaseMarkdown(release);
  assert.match(markdown, /^# Zen 1\.18\.0-beta\.2/m);
  assert.match(markdown, /## Added/);
  assert.match(markdown, /## Improved/);
  assert.match(markdown, /## Install or upgrade/);
  assert.match(markdown, /Level-up announcements now show the coins added/);
});

test('every changelog entry has the fields a release body needs', () => {
  for (const release of RELEASES) {
    assert.match(release.version, /^\d+\.\d+\.\d+(?:-[\w.]+)?$/);
    assert.match(release.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(release.title.length > 0);
    assert.ok(release.summary.length > 0);
    assert.ok(Array.isArray(release.added));
    assert.ok(Array.isArray(release.improved));
    assert.ok(Array.isArray(release.fixed));
  }

  assert.equal(releaseMarkdown(null), '');
});
