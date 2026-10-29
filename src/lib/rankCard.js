const WIDTH = 900;
const HEIGHT = 280;
const AVATAR_CENTER = { x: 132, y: 140 };
const AVATAR_RADIUS = 66;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

let canvasModule = null;

function canvasApi() {
  if (!canvasModule) canvasModule = require('@napi-rs/canvas');
  return canvasModule;
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatNumber(value) {
  return Math.max(0, Math.floor(number(value))).toLocaleString('en-US');
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

function fitText(ctx, text, maxWidth) {
  const value = String(text ?? '');
  if (ctx.measureText(value).width <= maxWidth) return value;

  const ellipsis = '…';
  let trimmed = value;
  while (trimmed.length > 1 && ctx.measureText(`${trimmed}${ellipsis}`).width > maxWidth) {
    trimmed = trimmed.slice(0, -1);
  }

  return `${trimmed}${ellipsis}`;
}

async function fetchAvatar(url) {
  if (!url) return null;

  try {
    const signal =
      typeof AbortSignal?.timeout === 'function' ? AbortSignal.timeout(8000) : undefined;
    const response = await fetch(url, { signal });
    if (!response.ok) return null;

    const type = response.headers.get('content-type') || '';
    if (type && !type.startsWith('image/')) return null;

    const length = Number(response.headers.get('content-length') || 0);
    if (length > MAX_AVATAR_BYTES) return null;

    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

function drawAvatar(ctx, image, displayName) {
  const { x, y } = AVATAR_CENTER;
  const radius = AVATAR_RADIUS;

  ctx.save();
  ctx.shadowColor = 'rgba(109, 94, 252, 0.55)';
  ctx.shadowBlur = 24;
  ctx.strokeStyle = '#8f83ff';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();

  if (image) {
    const size = radius * 2;
    const scale = Math.max(size / image.width, size / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    ctx.drawImage(image, x - width / 2, y - height / 2, width, height);
  } else {
    const fill = ctx.createLinearGradient(x - radius, y - radius, x + radius, y + radius);
    fill.addColorStop(0, '#6d5efc');
    fill.addColorStop(1, '#ff6fb5');
    ctx.fillStyle = fill;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);

    const initial = String(displayName ?? '?').trim().charAt(0).toUpperCase() || '?';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 62px "Segoe UI", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initial, x, y + 2);
  }

  ctx.restore();
}

/**
 * Builds a self-contained rank card. Rendering is asynchronous because the
 * avatar is downloaded and decoded first; callers can fall back to text when
 * the image cannot be produced.
 *
 * @param {object} input
 * @param {string} [input.displayName]
 * @param {string} [input.username]
 * @param {string|null} [input.avatarUrl]
 * @param {number} [input.level]
 * @param {number|null} [input.rank]
 * @param {number} [input.totalUsers]
 * @param {number} [input.xpIntoLevel]
 * @param {number} [input.xpNeeded]
 * @param {number} [input.totalXp]
 * @returns {Promise<Buffer>}
 */
async function renderRankCard({
  displayName = 'Member',
  username = 'member',
  avatarUrl = null,
  level = 0,
  rank = null,
  totalUsers = 0,
  xpIntoLevel = 0,
  xpNeeded = 100,
  totalXp = 0,
} = {}) {
  const { createCanvas, loadImage } = canvasApi();
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, '#171827');
  background.addColorStop(0.55, '#211b36');
  background.addColorStop(1, '#2d1f3d');

  ctx.save();
  roundedRect(ctx, 0, 0, WIDTH, HEIGHT, 28);
  ctx.fillStyle = background;
  ctx.fill();
  ctx.clip();

  ctx.globalAlpha = 0.18;
  ctx.fillStyle = '#6d5efc';
  ctx.beginPath();
  ctx.arc(790, -20, 230, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ff6fb5';
  ctx.beginPath();
  ctx.arc(40, 300, 170, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.restore();

  roundedRect(ctx, 1, 1, WIDTH - 2, HEIGHT - 2, 27);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
  ctx.lineWidth = 2;
  ctx.stroke();

  const avatarBuffer = await fetchAvatar(avatarUrl);
  let avatarImage = null;

  if (avatarBuffer) {
    try {
      avatarImage = await loadImage(avatarBuffer);
    } catch {
      avatarImage = null;
    }
  }

  drawAvatar(ctx, avatarImage, displayName);

  const name = String(displayName || username || 'Member');
  const handle = String(username || 'member').replace(/^@/, '');

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px "Segoe UI", Arial, sans-serif';
  ctx.fillText(fitText(ctx, name, 410), 226, 92);

  ctx.fillStyle = '#aaa7bd';
  ctx.font = '20px "Segoe UI", Arial, sans-serif';
  ctx.fillText(fitText(ctx, `@${handle}`, 410), 226, 126);

  const safeLevel = Math.max(0, Math.floor(number(level)));
  const safeRank = Number.isFinite(Number(rank)) && Number(rank) > 0
    ? Math.floor(Number(rank))
    : null;
  const members = Math.max(0, Math.floor(number(totalUsers)));
  const into = Math.max(0, Math.floor(number(xpIntoLevel)));
  const needed = Math.max(0, Math.floor(number(xpNeeded)));
  const total = Math.max(0, Math.floor(number(totalXp)));
  const ratio = needed === 0 ? 1 : Math.min(1, into / needed);
  const remaining = needed === 0 ? 0 : Math.max(0, needed - into);

  ctx.textAlign = 'right';
  ctx.fillStyle = '#aaa7bd';
  ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
  ctx.fillText('RANK', 842, 58);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px "Segoe UI", Arial, sans-serif';
  ctx.fillText(safeRank ? `#${safeRank}` : '—', 842, 106);

  ctx.fillStyle = '#aaa7bd';
  ctx.font = '16px "Segoe UI", Arial, sans-serif';
  ctx.fillText(members > 0 ? `of ${formatNumber(members)}` : 'unranked', 842, 130);

  const pillWidth = 154;
  const pillHeight = 38;
  const pillX = 688;
  const pillY = 146;
  const pill = ctx.createLinearGradient(pillX, pillY, pillX + pillWidth, pillY + pillHeight);
  pill.addColorStop(0, '#6d5efc');
  pill.addColorStop(1, '#a75efc');

  roundedRect(ctx, pillX, pillY, pillWidth, pillHeight, 19);
  ctx.fillStyle = pill;
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`LEVEL ${safeLevel}`, pillX + pillWidth / 2, pillY + pillHeight / 2 + 1);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#8f8ca6';
  ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
  ctx.fillText('PROGRESS', 226, 198);

  ctx.textAlign = 'right';
  ctx.font = '13px "Segoe UI", Arial, sans-serif';
  ctx.fillText(
    needed === 0 ? 'MAX LEVEL' : `${formatNumber(into)} / ${formatNumber(needed)} XP`,
    842,
    198,
  );

  const barX = 226;
  const barY = 210;
  const barWidth = 616;
  const barHeight = 16;
  const barRadius = 8;

  roundedRect(ctx, barX, barY, barWidth, barHeight, barRadius);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.09)';
  ctx.fill();

  if (ratio > 0) {
    const fillWidth = Math.max(barHeight, barWidth * ratio);
    const fill = ctx.createLinearGradient(barX, barY, barX + barWidth, barY);
    fill.addColorStop(0, '#6d5efc');
    fill.addColorStop(0.6, '#9b6dff');
    fill.addColorStop(1, '#ff6fb5');

    roundedRect(ctx, barX, barY, fillWidth, barHeight, barRadius);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = '#8f8ca6';
  ctx.font = '14px "Segoe UI", Arial, sans-serif';
  ctx.fillText(`TOTAL ${formatNumber(total)} XP`, 226, 252);

  ctx.textAlign = 'right';
  ctx.fillText(
    needed === 0 ? 'MAXIMUM LEVEL' : `NEXT LEVEL ${formatNumber(remaining)} XP`,
    842,
    252,
  );

  return canvas.toBuffer('image/png');
}

module.exports = { CARD_HEIGHT: HEIGHT, CARD_WIDTH: WIDTH, renderRankCard };
