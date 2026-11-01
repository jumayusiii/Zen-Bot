const fs = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');
const {
  CARD_THEMES,
  DEFAULT_THEME_ID,
  isCardTheme,
} = require('./cardThemes');

const DEFAULT_FILE = path.join(__dirname, '..', '..', 'data', 'economy.json');
const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const STREAK_WINDOW_MS = 48 * 60 * 60 * 1000;
const DAILY_BASE = 100;
const DAILY_STREAK_BONUS = 25;
const DAILY_MAX_STREAK_BONUS = 150;
const LEVEL_COIN_BASE = 25;
const LEVEL_COIN_STEP = 5;
const LEVEL_COIN_MAX = 250;
const MAX_GRANT = 100_000;
const MAX_BALANCE = 1_000_000_000;
const MAX_ENTRIES = 50_000;
const MAX_STREAK = 3650;
const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);

let stateQueue = Promise.resolve();

function economyFile() {
  return process.env.ECONOMY_FILE
    ? path.resolve(process.env.ECONOMY_FILE)
    : DEFAULT_FILE;
}

function cleanText(value, maxLength) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function wholeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : fallback;
}

/** Coins paid for reaching a single level. */
function coinsForLevel(level) {
  const normalized = Math.max(1, wholeNumber(level, 1));
  return Math.min(LEVEL_COIN_MAX, LEVEL_COIN_BASE + (normalized - 1) * LEVEL_COIN_STEP);
}

/** Coins for every level gained, so a multi-level award is fully paid. */
function coinsForLevelRange(fromLevel, toLevel) {
  const from = wholeNumber(fromLevel);
  const to = Math.max(from, wholeNumber(toLevel));
  let total = 0;

  for (let level = from + 1; level <= to; level += 1) {
    total += coinsForLevel(level);
  }

  return total;
}

function normalizeOwned(value) {
  const owned = new Set([DEFAULT_THEME_ID]);
  if (Array.isArray(value)) {
    for (const id of value) {
      if (isCardTheme(id)) owned.add(id);
    }
  }
  return [...owned];
}

function normalizeAccount(value) {
  if (!value || typeof value !== 'object') return null;

  const guildId = cleanText(value.guildId, 32);
  const userId = cleanText(value.userId, 32);
  if (!guildId || !userId) return null;

  const owned = normalizeOwned(value.owned);
  const theme = isCardTheme(value.theme) && owned.includes(value.theme)
    ? value.theme
    : DEFAULT_THEME_ID;

  return {
    guildId,
    userId,
    balance: Math.min(MAX_BALANCE, wholeNumber(value.balance)),
    lastDailyAt: wholeNumber(value.lastDailyAt),
    dailyStreak: Math.min(MAX_STREAK, wholeNumber(value.dailyStreak)),
    owned,
    theme,
    updatedAt: wholeNumber(value.updatedAt),
  };
}

function emptyAccount(guildId, userId) {
  return {
    guildId,
    userId,
    balance: 0,
    lastDailyAt: 0,
    dailyStreak: 0,
    owned: [DEFAULT_THEME_ID],
    theme: DEFAULT_THEME_ID,
    updatedAt: 0,
  };
}

function cloneAccount(entry) {
  if (!entry) return null;
  return { ...entry, owned: [...entry.owned] };
}

async function readState() {
  try {
    const parsed = JSON.parse(await fs.readFile(economyFile(), 'utf8'));
    const values = Array.isArray(parsed) ? parsed : parsed?.users;
    if (!Array.isArray(values)) throw new Error('economy file has an unexpected shape');

    const unique = new Map();
    for (const value of values) {
      const entry = normalizeAccount(value);
      if (!entry) continue;
      unique.set(`${entry.guildId}:${entry.userId}`, entry);
    }

    return { version: 1, users: [...unique.values()] };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[economy] Could not read ${economyFile()}: ${error.message}`);
    }
    return { version: 1, users: [] };
  }
}

async function replaceFile(temporary, file) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      await fs.rename(temporary, file);
      return;
    } catch (error) {
      if (!RETRYABLE_RENAME_CODES.has(error.code) || attempt >= 4) throw error;
      await delay(25 * (attempt + 1));
    }
  }
}

async function writeState(state) {
  if (state.users.length > MAX_ENTRIES) {
    state.users = state.users
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, MAX_ENTRIES);
  }

  const file = economyFile();
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });

  try {
    await fs.writeFile(
      temporary,
      `${JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        users: state.users,
      }, null, 2)}\n`,
      'utf8',
    );
    await replaceFile(temporary, file);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

function withQueuedState(operation) {
  const run = stateQueue.then(async () => {
    const state = await readState();
    const outcome = await operation(state);
    if (outcome.write !== false) await writeState(state);
    return outcome.value;
  });

  stateQueue = run.catch(() => {});
  return run;
}

function findOrCreate(state, guildId, userId) {
  let entry = state.users.find(
    (candidate) => candidate.guildId === guildId && candidate.userId === userId,
  );

  if (!entry) {
    entry = emptyAccount(guildId, userId);
    state.users.push(entry);
  }

  return entry;
}

function accountError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/**
 * Returns a member's guild wallet. Missing accounts are represented by the
 * default free theme and a zero balance without creating a file entry.
 *
 * @param {string} guildId
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getAccount(guildId, userId) {
  const state = await readState();
  const entry = state.users.find(
    (candidate) => candidate.guildId === guildId && candidate.userId === userId,
  );

  return cloneAccount(entry) ?? emptyAccount(cleanText(guildId, 32), cleanText(userId, 32));
}

/**
 * Claims the once-per-day reward and advances the streak when the previous
 * claim was within 48 hours.
 *
 * @param {{guildId: string, userId: string, now?: number}} input
 * @returns {Promise<{claimed: boolean, amount: number, streak: number, balance: number, nextAt: number, reason?: string}>}
 */
async function claimDaily({ guildId, userId, now = Date.now() }) {
  const guildKey = cleanText(guildId, 32);
  const userKey = cleanText(userId, 32);
  if (!guildKey || !userKey) throw new Error('A guild and user are required to claim daily coins.');

  const timestamp = Number.isFinite(now) ? now : Date.now();

  return withQueuedState((state) => {
    const entry = findOrCreate(state, guildKey, userKey);
    const nextAt = entry.lastDailyAt > 0 ? entry.lastDailyAt + DAILY_COOLDOWN_MS : 0;

    if (entry.lastDailyAt > 0 && timestamp - entry.lastDailyAt < DAILY_COOLDOWN_MS) {
      return {
        write: false,
        value: {
          claimed: false,
          reason: 'cooldown',
          amount: 0,
          streak: entry.dailyStreak,
          balance: entry.balance,
          nextAt,
        },
      };
    }

    const continued = entry.lastDailyAt > 0
      && timestamp - entry.lastDailyAt <= STREAK_WINDOW_MS;
    const streak = continued ? Math.min(MAX_STREAK, entry.dailyStreak + 1) : 1;
    const amount = DAILY_BASE + Math.min(
      DAILY_MAX_STREAK_BONUS,
      Math.max(0, streak - 1) * DAILY_STREAK_BONUS,
    );

    entry.balance = Math.min(MAX_BALANCE, entry.balance + amount);
    entry.lastDailyAt = timestamp;
    entry.dailyStreak = streak;
    entry.updatedAt = timestamp;

    return {
      value: {
        claimed: true,
        amount,
        streak,
        balance: entry.balance,
        nextAt: timestamp + DAILY_COOLDOWN_MS,
      },
    };
  });
}

/**
 * Credits the coins earned by reaching one or more new levels.
 *
 * @param {{guildId: string, userId: string, fromLevel: number, toLevel: number, now?: number}} input
 * @returns {Promise<{awarded: boolean, amount: number, balance: number|null}>}
 */
async function awardLevelCoins({ guildId, userId, fromLevel, toLevel, now = Date.now() }) {
  const amount = coinsForLevelRange(fromLevel, toLevel);
  const guildKey = cleanText(guildId, 32);
  const userKey = cleanText(userId, 32);
  if (!guildKey || !userKey) throw new Error('A guild and user are required to award level coins.');

  if (amount <= 0) return { awarded: false, amount: 0, balance: null };

  const timestamp = Number.isFinite(now) ? now : Date.now();

  return withQueuedState((state) => {
    const entry = findOrCreate(state, guildKey, userKey);
    const before = entry.balance;
    entry.balance = Math.min(MAX_BALANCE, entry.balance + amount);
    entry.updatedAt = timestamp;

    return {
      value: {
        awarded: entry.balance > before,
        amount: entry.balance - before,
        balance: entry.balance,
      },
    };
  });
}

/**
 * Adds an admin grant to a wallet, capped by the maximum balance.
 *
 * @param {{guildId: string, userId: string, amount: number, now?: number}} input
 * @returns {Promise<{requested: number, amount: number, balance: number, capped: boolean}>}
 */
async function grantCoins({ guildId, userId, amount, now = Date.now() }) {
  const requested = Math.floor(Number(amount));
  if (!Number.isFinite(requested) || requested <= 0) {
    throw accountError('invalid_amount', 'Choose at least 1 coin to grant.');
  }
  if (requested > MAX_GRANT) {
    throw accountError('amount_too_large', `A single grant can add at most ${MAX_GRANT} coins.`);
  }

  const guildKey = cleanText(guildId, 32);
  const userKey = cleanText(userId, 32);
  if (!guildKey || !userKey) throw new Error('A guild and user are required to grant coins.');

  const timestamp = Number.isFinite(now) ? now : Date.now();

  return withQueuedState((state) => {
    const entry = findOrCreate(state, guildKey, userKey);
    const before = entry.balance;
    entry.balance = Math.min(MAX_BALANCE, entry.balance + requested);
    entry.updatedAt = timestamp;

    return {
      write: entry.balance > before,
      value: {
        requested,
        amount: entry.balance - before,
        balance: entry.balance,
        capped: entry.balance - before < requested,
      },
    };
  });
}

/**
 * Buys a theme, deducts its price and equips it immediately.
 *
 * @param {{guildId: string, userId: string, themeId: string, now?: number}} input
 * @returns {Promise<{theme: object, balance: number, owned: string[]}>}
 */
async function buyTheme({ guildId, userId, themeId, now = Date.now() }) {
  const theme = CARD_THEMES.find((candidate) => candidate.id === themeId);
  if (!theme) throw accountError('unknown_theme', 'Choose a theme from the shop.');
  if (theme.price <= 0) throw accountError('free_theme', 'That theme is free and already yours.');

  const guildKey = cleanText(guildId, 32);
  const userKey = cleanText(userId, 32);
  if (!guildKey || !userKey) throw new Error('A guild and user are required to buy a theme.');

  const timestamp = Number.isFinite(now) ? now : Date.now();

  return withQueuedState((state) => {
    const entry = findOrCreate(state, guildKey, userKey);
    if (entry.owned.includes(theme.id)) {
      throw accountError('already_owned', 'You already own that theme.');
    }
    if (entry.balance < theme.price) {
      const error = accountError('insufficient', `You need ${theme.price} coins to buy ${theme.name}.`);
      error.balance = entry.balance;
      throw error;
    }

    entry.balance -= theme.price;
    entry.owned.push(theme.id);
    entry.theme = theme.id;
    entry.updatedAt = timestamp;

    return {
      value: {
        theme,
        balance: entry.balance,
        owned: [...entry.owned],
      },
    };
  });
}

/**
 * Equips a theme that the member already owns.
 *
 * @param {{guildId: string, userId: string, themeId: string, now?: number}} input
 * @returns {Promise<{theme: object, balance: number}>}
 */
async function setCardTheme({ guildId, userId, themeId, now = Date.now() }) {
  const theme = CARD_THEMES.find((candidate) => candidate.id === themeId);
  if (!theme) throw accountError('unknown_theme', 'Choose a theme from the card catalog.');

  const guildKey = cleanText(guildId, 32);
  const userKey = cleanText(userId, 32);
  if (!guildKey || !userKey) throw new Error('A guild and user are required to select a theme.');

  const timestamp = Number.isFinite(now) ? now : Date.now();

  return withQueuedState((state) => {
    const entry = findOrCreate(state, guildKey, userKey);
    if (!entry.owned.includes(theme.id)) {
      throw accountError('not_owned', `You do not own ${theme.name}. Buy it in /shop first.`);
    }

    entry.theme = theme.id;
    entry.updatedAt = timestamp;

    return { value: { theme, balance: entry.balance } };
  });
}

module.exports = {
  DAILY_BASE,
  DAILY_COOLDOWN_MS,
  DAILY_MAX_STREAK_BONUS,
  DAILY_STREAK_BONUS,
  LEVEL_COIN_BASE,
  LEVEL_COIN_MAX,
  LEVEL_COIN_STEP,
  MAX_BALANCE,
  MAX_GRANT,
  STREAK_WINDOW_MS,
  awardLevelCoins,
  buyTheme,
  claimDaily,
  coinsForLevel,
  coinsForLevelRange,
  economyFile,
  getAccount,
  grantCoins,
  setCardTheme,
};
