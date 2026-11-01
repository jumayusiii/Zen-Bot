#!/usr/bin/env node
'use strict';

const { version } = require('../package.json');
const { getRelease, releaseMarkdown } = require('../src/lib/changelog');

const requested = (process.argv[2] || version).trim().replace(/^v/, '');
const release = getRelease(requested);

if (!release) {
  console.error(`[release] No changelog entry found for "${requested}".`);
  process.exit(1);
}

process.stdout.write(releaseMarkdown(release));
