const assert = require('node:assert/strict');
const test = require('node:test');
const { createCanvas } = require('@napi-rs/canvas');

const {
  CAPTION_COLORS,
  CAPTION_SIZES,
  CAPTION_STYLES,
  renderCaptionImage,
  wrapText,
} = require('../src/lib/caption');

function sourceImage(width = 900, height = 600) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1b1c2a');
  gradient.addColorStop(1, '#50345e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  return canvas.toBuffer('image/png');
}

test('renderCaptionImage draws top and bottom text as a PNG', async () => {
  const buffer = await renderCaptionImage({
    image: sourceImage(),
    top: 'When the code works',
    bottom: 'But you do not know why',
    style: 'classic',
    color: 'white',
    size: 'large',
    uppercase: true,
  });

  assert.equal(buffer.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
  assert.ok(buffer.length > 5000);
});

test('caption styles, colours and sizes are exposed for the command choices', () => {
  assert.deepEqual(
    CAPTION_STYLES.map((entry) => entry.value),
    ['classic', 'clean', 'boxed', 'subtle'],
  );
  assert.deepEqual(
    CAPTION_COLORS.map((entry) => entry.value),
    ['white', 'black', 'yellow', 'mint', 'pink'],
  );
  assert.deepEqual(
    CAPTION_SIZES.map((entry) => entry.value),
    ['small', 'medium', 'large'],
  );
});

test('wrapText limits lines and adds an ellipsis when text is clipped', () => {
  const canvas = createCanvas(400, 100);
  const ctx = canvas.getContext('2d');
  ctx.font = '24px "Segoe UI", Arial, sans-serif';

  const lines = wrapText(ctx, 'one two three four five six seven eight nine ten', 120);
  assert.ok(lines.length <= 3);
  assert.ok(lines[lines.length - 1].endsWith('…'));

  assert.deepEqual(wrapText(ctx, '', 120), []);
});

test('renderCaptionImage rejects an empty image buffer', async () => {
  await assert.rejects(
    renderCaptionImage({ image: Buffer.alloc(0), top: 'hello' }),
    /Upload a PNG/,
  );
});
