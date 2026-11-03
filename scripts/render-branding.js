#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { createCanvas, loadImage } = require('@napi-rs/canvas');

const BRANDING_DIR = path.resolve(__dirname, '..', 'assets', 'branding');

const TARGETS = [
  { source: 'zen-avatar.svg', output: 'zen-avatar-1024.png', width: 1024, height: 1024 },
  { source: 'zen-avatar.svg', output: 'zen-avatar-512.png', width: 512, height: 512 },
  { source: 'zen-banner.svg', output: 'zen-banner-1500x600.png', width: 1500, height: 600 },
  { source: 'zen-banner.svg', output: 'zen-banner-750x300.png', width: 750, height: 300 },
];

async function render(target) {
  const svg = fs.readFileSync(path.join(BRANDING_DIR, target.source));
  const image = await loadImage(svg);
  const canvas = createCanvas(target.width, target.height);
  const context = canvas.getContext('2d');

  context.drawImage(image, 0, 0, target.width, target.height);

  const output = path.join(BRANDING_DIR, target.output);
  fs.writeFileSync(output, canvas.toBuffer('image/png'));
  console.log(`[branding] ${target.output}  ${target.width}×${target.height}`);
}

(async () => {
  for (const target of TARGETS) {
    await render(target);
  }
})().catch((error) => {
  console.error(`[branding] ${error.message}`);
  process.exit(1);
});
