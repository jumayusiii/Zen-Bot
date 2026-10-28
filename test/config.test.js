const assert = require('node:assert/strict');
const test = require('node:test');

const config = require('../src/lib/config');

test('self-host settings fall back to the habbo.gd defaults', () => {
  delete process.env.SITE_URL;
  delete process.env.SITE_NAME;
  delete process.env.SITE_LOGO_URL;
  delete process.env.PRESENCE_TEXT;

  assert.equal(config.siteUrl(), 'https://habbo.gd');
  assert.equal(config.siteHost(), 'habbo.gd');
  assert.equal(config.siteName(), 'habbo.gd');
  assert.equal(config.siteLogoUrl(), 'https://cdn.habbo.gd/cms/habbo/logo.png');
  assert.equal(config.siteLogoFilename(), 'logo.png');
  assert.equal(config.presenceText(), 'I am Legend.');
});

test('site and presence can be changed without editing code', () => {
  process.env.SITE_URL = 'https://Example.com/community/';
  process.env.SITE_NAME = 'Example Community';
  process.env.SITE_LOGO_URL = 'https://example.com/assets/mark.webp';
  process.env.PRESENCE_TEXT = 'Playing with the community';

  assert.equal(config.siteUrl(), 'https://example.com/community');
  assert.equal(config.siteHost(), 'example.com');
  assert.equal(config.siteName(), 'Example Community');
  assert.equal(config.siteLogoUrl(), 'https://example.com/assets/mark.webp');
  assert.equal(config.siteLogoFilename(), 'mark.webp');
  assert.equal(config.presenceText(), 'Playing with the community');

  delete process.env.SITE_URL;
  delete process.env.SITE_NAME;
  delete process.env.SITE_LOGO_URL;
  delete process.env.PRESENCE_TEXT;
});

test('a blank logo disables attachments and invalid URLs are ignored', () => {
  process.env.SITE_URL = 'https://example.com';
  process.env.SITE_LOGO_URL = '';

  assert.equal(config.siteLogoUrl(), null);
  assert.equal(config.siteLogoFilename(), null);

  process.env.SITE_URL = 'javascript:alert(1)';
  assert.equal(config.siteUrl(), 'https://habbo.gd');

  delete process.env.SITE_URL;
  delete process.env.SITE_LOGO_URL;
});
