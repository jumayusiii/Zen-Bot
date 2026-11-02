const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_CAPTION_TEXT_LENGTH = 120;
const MAX_CAPTION_WIDTH = 1600;
const MAX_CAPTION_HEIGHT = 1600;
const MAX_LINES = 3;

const CAPTION_STYLES = Object.freeze([
  { name: 'Classic meme (outlined)', value: 'classic' },
  { name: 'Clean shadow', value: 'clean' },
  { name: 'Boxed', value: 'boxed' },
  { name: 'Subtle', value: 'subtle' },
]);

const CAPTION_COLORS = Object.freeze([
  { name: 'White', value: 'white', fill: '#ffffff' },
  { name: 'Black', value: 'black', fill: '#111111' },
  { name: 'Yellow', value: 'yellow', fill: '#ffe066' },
  { name: 'Mint', value: 'mint', fill: '#8fffd2' },
  { name: 'Pink', value: 'pink', fill: '#ff9ac9' },
]);

const CAPTION_SIZES = Object.freeze([
  { name: 'Small', value: 'small', scale: 0.055 },
  { name: 'Medium', value: 'medium', scale: 0.075 },
  { name: 'Large', value: 'large', scale: 0.095 },
]);

let canvasModule = null;

function canvasApi() {
  if (!canvasModule) canvasModule = require('@napi-rs/canvas');
  return canvasModule;
}

function selected(list, value, fallback) {
  return list.find((entry) => entry.value === value) ?? list.find((entry) => entry.value === fallback) ?? list[0];
}

function cleanCaption(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_CAPTION_TEXT_LENGTH);
}

function wrapText(ctx, text, maxWidth, maxLines = MAX_LINES) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const lines = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;

    if (ctx.measureText(candidate).width <= maxWidth || !current) {
      current = candidate;
      continue;
    }

    lines.push(current);
    current = word;

    if (lines.length === maxLines - 1) break;
  }

  if (lines.length < maxLines && current) lines.push(current);

  const consumed = lines.join(' ').split(/\s+/).length;
  if (consumed < words.length) {
    let last = lines[lines.length - 1] || '';
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1);
    }
    lines[lines.length - 1] = `${last.trimEnd()}…`;
  }

  return lines;
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawBlock(ctx, lines, blockY, canvas, options) {
  const { style, color, fontSize } = options;
  const lineHeight = fontSize * 1.13;
  const maxWidth = canvas.width * 0.9;
  const measured = lines.map((line) => ctx.measureText(line).width);
  const widest = Math.max(...measured, 1);

  if (style === 'boxed') {
    const paddingX = fontSize * 0.32;
    const paddingY = fontSize * 0.2;
    const boxWidth = Math.min(canvas.width - 36, widest + paddingX * 2);
    const boxHeight = lines.length * lineHeight + paddingY * 2;
    const boxX = (canvas.width - boxWidth) / 2;
    const boxY = blockY - paddingY;

    ctx.save();
    ctx.fillStyle = color.value === 'black' ? 'rgba(255, 255, 255, 0.88)' : 'rgba(10, 12, 16, 0.74)';
    roundedRect(ctx, boxX, boxY, boxWidth, boxHeight, Math.max(10, fontSize * 0.18));
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.lineJoin = 'round';
  ctx.miterLimit = 2;
  ctx.font = `${style === 'classic' ? 'bold' : '600'} ${fontSize}px ${
    style === 'classic' ? '"Impact", "Arial Black", "Segoe UI", sans-serif' : '"Segoe UI", Arial, sans-serif'
  }`;
  ctx.fillStyle = color.fill;

  if (style === 'classic') {
    ctx.strokeStyle = color.value === 'black' ? '#ffffff' : '#000000';
    ctx.lineWidth = Math.max(4, fontSize * 0.13);
    for (let index = 0; index < lines.length; index += 1) {
      const x = canvas.width / 2;
      const y = blockY + index * lineHeight;
      ctx.strokeText(lines[index], x, y, maxWidth);
    }
  } else if (style === 'clean') {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = Math.max(4, fontSize * 0.12);
    ctx.shadowOffsetY = Math.max(1, fontSize * 0.04);
  } else if (style === 'subtle') {
    ctx.globalAlpha = 0.92;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.72)';
    ctx.shadowBlur = 2;
  }

  for (let index = 0; index < lines.length; index += 1) {
    ctx.fillText(lines[index], canvas.width / 2, blockY + index * lineHeight, maxWidth);
  }

  ctx.restore();
}

/**
 * Draws customizable top and bottom text onto an uploaded image.
 * The image is scaled down to a safe canvas size while keeping its ratio.
 *
 * @param {object} input
 * @param {Buffer} input.image
 * @param {string} [input.top]
 * @param {string} [input.bottom]
 * @param {string} [input.style] classic, clean, boxed or subtle
 * @param {string} [input.color] white, black, yellow, mint or pink
 * @param {string} [input.size] small, medium or large
 * @param {boolean} [input.uppercase]
 * @returns {Promise<Buffer>}
 */
async function renderCaptionImage({
  image,
  top = '',
  bottom = '',
  style = 'classic',
  color = 'white',
  size = 'medium',
  uppercase = true,
} = {}) {
  if (!Buffer.isBuffer(image) || image.length === 0) {
    throw new Error('Upload a PNG, JPEG or WebP image to caption.');
  }

  const { createCanvas, loadImage } = canvasApi();
  const decoded = await loadImage(image);
  const sourceWidth = Math.max(1, decoded.width);
  const sourceHeight = Math.max(1, decoded.height);
  const scale = Math.min(1, MAX_CAPTION_WIDTH / sourceWidth, MAX_CAPTION_HEIGHT / sourceHeight);
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(decoded, 0, 0, width, height);

  const styleOption = selected(CAPTION_STYLES, style, 'classic');
  const colorOption = selected(CAPTION_COLORS, color, 'white');
  const sizeOption = selected(CAPTION_SIZES, size, 'medium');
  const fontSize = Math.max(20, Math.min(110, Math.round(width * sizeOption.scale)));
  const margin = Math.max(18, Math.round(Math.min(width, height) * 0.045));

  ctx.font = `${styleOption.value === 'classic' ? 'bold' : '600'} ${fontSize}px ${
    styleOption.value === 'classic'
      ? '"Impact", "Arial Black", "Segoe UI", sans-serif'
      : '"Segoe UI", Arial, sans-serif'
  }`;

  const transform = (value) => {
    const text = cleanCaption(value);
    return uppercase ? text.toUpperCase() : text;
  };

  const topText = transform(top);
  const bottomText = transform(bottom);
  const topLines = topText ? wrapText(ctx, topText, width * 0.9) : [];
  const bottomLines = bottomText ? wrapText(ctx, bottomText, width * 0.9) : [];

  if (topLines.length > 0) {
    drawBlock(ctx, topLines, margin, canvas, {
      style: styleOption.value,
      color: colorOption,
      fontSize,
    });
  }

  if (bottomLines.length > 0) {
    const blockHeight = bottomLines.length * fontSize * 1.13;
    drawBlock(ctx, bottomLines, height - margin - blockHeight, canvas, {
      style: styleOption.value,
      color: colorOption,
      fontSize,
    });
  }

  return canvas.toBuffer('image/png');
}

module.exports = {
  CAPTION_COLORS,
  CAPTION_SIZES,
  CAPTION_STYLES,
  MAX_CAPTION_TEXT_LENGTH,
  MAX_IMAGE_BYTES,
  renderCaptionImage,
  wrapText,
};
