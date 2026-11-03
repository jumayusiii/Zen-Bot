const { DEFAULT_THEME_ID, getCardTheme } = require('./cardThemes');
const { t } = require('./i18n');

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

function formatNumber(value, language = 'en') {
  const locale = language === 'de' ? 'de-DE' : 'en-US';
  return Math.max(0, Math.floor(number(value))).toLocaleString(locale);
}

function seeded(index, salt = 1) {
  const value = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return value - Math.floor(value);
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

function drawPattern(ctx, pattern, decor) {
  ctx.save();
  ctx.globalAlpha = 0.18;

  if (pattern === 'waves') {
    for (let band = 0; band < 3; band += 1) {
      const y = 190 + band * 34;
      ctx.fillStyle = decor[band % decor.length];
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(180, y - 36, 360, y + 34, 560, y - 6);
      ctx.bezierCurveTo(700, y - 32, 810, y + 20, WIDTH, y - 8);
      ctx.lineTo(WIDTH, HEIGHT);
      ctx.lineTo(0, HEIGHT);
      ctx.closePath();
      ctx.fill();
    }
  } else if (pattern === 'stars') {
    ctx.fillStyle = '#ffffff';
    for (let index = 0; index < 54; index += 1) {
      const x = 20 + seeded(index, 1) * (WIDTH - 40);
      const y = 12 + seeded(index, 2) * (HEIGHT - 24);
      const radius = 0.7 + seeded(index, 3) * 1.8;
      ctx.globalAlpha = 0.2 + seeded(index, 4) * 0.5;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = decor[0];
    ctx.beginPath();
    ctx.arc(770, 20, 190, 0, Math.PI * 2);
    ctx.fill();
  } else if (pattern === 'leaves') {
    for (let index = 0; index < 22; index += 1) {
      const x = 24 + seeded(index, 5) * (WIDTH - 48);
      const y = 18 + seeded(index, 6) * (HEIGHT - 36);
      const angle = seeded(index, 7) * Math.PI;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = decor[index % decor.length];
      ctx.beginPath();
      ctx.ellipse(0, 0, 9 + seeded(index, 8) * 12, 4 + seeded(index, 9) * 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (pattern === 'petals') {
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = decor[0];
    ctx.beginPath();
    ctx.arc(760, 30, 170, 0, Math.PI * 2);
    ctx.fill();

    for (let index = 0; index < 28; index += 1) {
      const x = 20 + seeded(index, 13) * (WIDTH - 40);
      const y = 12 + seeded(index, 14) * (HEIGHT - 24);
      const radius = 5 + seeded(index, 15) * 7;

      ctx.save();
      ctx.globalAlpha = 0.14 + seeded(index, 16) * 0.22;
      ctx.translate(x, y);
      ctx.rotate(-0.7 + seeded(index, 17) * 1.4);
      ctx.fillStyle = decor[index % decor.length];
      ctx.beginPath();
      ctx.ellipse(0, 0, radius, radius * 0.46, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  } else if (pattern === 'grid') {
    ctx.globalAlpha = 0.12;
    ctx.strokeStyle = decor[0];
    ctx.lineWidth = 1;

    for (let x = 0; x <= WIDTH; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, HEIGHT);
      ctx.stroke();
    }

    for (let y = 0; y <= HEIGHT; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }

    ctx.globalAlpha = 0.13;
    ctx.fillStyle = decor[1];
    ctx.beginPath();
    ctx.arc(790, 20, 190, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = decor[0];
    ctx.beginPath();
    ctx.arc(70, 280, 150, 0, Math.PI * 2);
    ctx.fill();
  } else if (pattern === 'embers') {
    for (let index = 0; index < 46; index += 1) {
      const x = 12 + seeded(index, 18) * (WIDTH - 24);
      const y = HEIGHT - 6 - seeded(index, 19) * (HEIGHT - 18);
      const radius = 0.8 + seeded(index, 20) * 2.7;

      ctx.globalAlpha = 0.12 + seeded(index, 21) * 0.34;
      ctx.fillStyle = decor[index % decor.length];
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 0.1;
    ctx.fillStyle = decor[0];
    ctx.beginPath();
    ctx.ellipse(450, HEIGHT + 30, 430, 100, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (pattern === 'snow') {
    for (let index = 0; index < 34; index += 1) {
      const x = 18 + seeded(index, 22) * (WIDTH - 36);
      const y = 12 + seeded(index, 23) * (HEIGHT - 24);
      const radius = 2.4 + seeded(index, 24) * 4.4;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(seeded(index, 25) * Math.PI);
      ctx.globalAlpha = 0.16 + seeded(index, 26) * 0.34;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.1;

      for (let arm = 0; arm < 3; arm += 1) {
        ctx.beginPath();
        ctx.moveTo(-radius, 0);
        ctx.lineTo(radius, 0);
        ctx.stroke();
        ctx.rotate(Math.PI / 3);
      }

      ctx.restore();
    }

    ctx.globalAlpha = 0.1;
    ctx.fillStyle = decor[0];
    ctx.beginPath();
    ctx.arc(780, 20, 170, 0, Math.PI * 2);
    ctx.fill();
  } else if (pattern === 'confetti') {
    for (let index = 0; index < 30; index += 1) {
      const x = 18 + seeded(index, 10) * (WIDTH - 36);
      const y = 14 + seeded(index, 11) * (HEIGHT - 28);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(seeded(index, 12) * Math.PI);
      ctx.fillStyle = decor[index % decor.length];
      ctx.fillRect(-3, -6, 6, 12);
      ctx.restore();
    }
  } else if (pattern === 'sun') {
    ctx.fillStyle = decor[0];
    ctx.beginPath();
    ctx.arc(800, -10, 210, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = decor[1];
    ctx.beginPath();
    ctx.arc(30, 310, 170, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = decor[0];
    ctx.beginPath();
    ctx.arc(790, -20, 230, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = decor[1];
    ctx.beginPath();
    ctx.arc(40, 300, 170, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
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

function drawAvatar(ctx, image, displayName, palette) {
  const { x, y } = AVATAR_CENTER;
  const radius = AVATAR_RADIUS;

  ctx.save();
  ctx.shadowColor = palette.shadow;
  ctx.shadowBlur = 24;
  ctx.strokeStyle = palette.accent;
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
    fill.addColorStop(0, palette.pill[0]);
    fill.addColorStop(1, palette.pill[1]);
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
 * @param {string} [input.theme] theme id from cardThemes
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
  theme = DEFAULT_THEME_ID,
  language = 'en',
} = {}) {
  const { createCanvas, loadImage } = canvasApi();
  const palette = getCardTheme(theme).colors;
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  const background = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, palette.background[0]);
  background.addColorStop(0.55, palette.background[1]);
  background.addColorStop(1, palette.background[2]);

  ctx.save();
  roundedRect(ctx, 0, 0, WIDTH, HEIGHT, 28);
  ctx.fillStyle = background;
  ctx.fill();
  ctx.clip();
  drawPattern(ctx, getCardTheme(theme).pattern, palette.decor);

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

  drawAvatar(ctx, avatarImage, displayName, palette);

  const name = String(displayName || username || 'Member');
  const handle = String(username || 'member').replace(/^@/, '');

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 38px "Segoe UI", Arial, sans-serif';
  ctx.fillText(fitText(ctx, name, 410), 226, 92);

  ctx.fillStyle = palette.muted;
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
  ctx.fillStyle = palette.muted;
  ctx.font = 'bold 14px "Segoe UI", Arial, sans-serif';
  ctx.fillText(t(language, 'levels.card.canvas.rank'), 842, 58);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 44px "Segoe UI", Arial, sans-serif';
  ctx.fillText(safeRank ? `#${safeRank}` : '—', 842, 106);

  ctx.fillStyle = palette.muted;
  ctx.font = '16px "Segoe UI", Arial, sans-serif';
  ctx.fillText(
    members > 0
      ? t(language, 'levels.card.canvas.of', { count: formatNumber(members, language) })
      : t(language, 'levels.card.canvas.unranked'),
    842,
    130,
  );

  const pillWidth = 154;
  const pillHeight = 38;
  const pillX = 688;
  const pillY = 146;
  const pill = ctx.createLinearGradient(pillX, pillY, pillX + pillWidth, pillY + pillHeight);
  pill.addColorStop(0, palette.pill[0]);
  pill.addColorStop(1, palette.pill[1]);

  roundedRect(ctx, pillX, pillY, pillWidth, pillHeight, 19);
  ctx.fillStyle = pill;
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px "Segoe UI", Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    t(language, 'levels.card.canvas.level', { level: safeLevel }),
    pillX + pillWidth / 2,
    pillY + pillHeight / 2 + 1,
  );

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = palette.dim;
  ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
  ctx.fillText(t(language, 'levels.card.canvas.progress'), 226, 198);

  ctx.textAlign = 'right';
  ctx.font = '13px "Segoe UI", Arial, sans-serif';
  ctx.fillText(
    needed === 0
      ? t(language, 'levels.card.canvas.maxLevel')
      : t(language, 'levels.card.canvas.xp', {
        into: formatNumber(into, language),
        needed: formatNumber(needed, language),
      }),
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
    fill.addColorStop(0, palette.bar[0]);
    fill.addColorStop(0.6, palette.bar[1]);
    fill.addColorStop(1, palette.bar[2]);

    roundedRect(ctx, barX, barY, fillWidth, barHeight, barRadius);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  ctx.textAlign = 'left';
  ctx.fillStyle = palette.dim;
  ctx.font = '14px "Segoe UI", Arial, sans-serif';
  ctx.fillText(
    t(language, 'levels.card.canvas.total', { total: formatNumber(total, language) }),
    226,
    252,
  );

  ctx.textAlign = 'right';
  ctx.fillText(
    needed === 0
      ? t(language, 'levels.card.canvas.maximum')
      : t(language, 'levels.card.canvas.next', {
        remaining: formatNumber(remaining, language),
      }),
    842,
    252,
  );

  return canvas.toBuffer('image/png');
}

module.exports = { CARD_HEIGHT: HEIGHT, CARD_WIDTH: WIDTH, renderRankCard };
