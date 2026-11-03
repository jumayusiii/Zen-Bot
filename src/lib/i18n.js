const fs = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const DEFAULT_FILE = path.join(__dirname, '..', '..', 'data', 'languages.json');
const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = Object.freeze(['en', 'de']);
const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);

const LANGUAGES = Object.freeze([
  { id: 'en', native: 'English', flag: '🇬🇧' },
  { id: 'de', native: 'Deutsch', flag: '🇩🇪' },
]);

const MESSAGES = Object.freeze({
  en: {
    language: {
      section: 'Settings',
      title: 'Language',
      description: 'Choose the language Zen uses in this server.',
      current: 'Current language',
      coverage: 'Translated so far',
      coverageValue: 'Help tabs · Wallets · Rich list · This menu',
      footer: 'Managed by {user}',
      permission: 'You need the **Manage Server** permission to change the language.',
      guildOnly: 'Language is stored per server. Run `/language` in a server channel.',
    },
    help: {
      section: 'Command Directory',
      overviewTitle: 'Everything the bot can do',
      overviewSummary: '**{total} commands**, grouped into tabs. Pick a category below.',
      overviewNote: '{beta} beta commands · /changelog for release notes · 🧪 marks beta',
      categoryCount: '{count} commands · {beta} in beta',
      more: '…and more',
      moreValue: '**{count}** more commands are available in this category.',
      footer: 'Requested by {user}',
      tabs: {
        overview: 'Overview',
        fun: 'Fun',
        images: 'Images',
        moderation: 'Moderation',
        minigames: 'Minigames',
        levels: 'Levels',
        economy: 'Economy',
        social: 'Social',
        utility: 'Utilities',
        other: 'Other',
      },
      categories: {
        fun: {
          title: 'Fun commands',
          description: 'Quick commands for a laugh and a short break.',
        },
        images: {
          title: 'Images',
          description: 'Animal memes, xkcd comics, editable captions and Reddit thread cards, with fonts, colours and themes.',
        },
        moderation: {
          title: 'Moderation',
          description: 'Permission-aware tools for mutes, kicks, bans and reversals.',
        },
        minigames: {
          title: 'Minigames',
          description: 'Playable rounds against the bot, with live buttons.',
        },
        levels: {
          title: 'Levels & rank',
          description: 'Chat XP, customizable rank cards and the server leaderboard.',
        },
        economy: {
          title: 'Economy & shop',
          description: 'Daily, work and heist coins, coin wagers, blackjack bets, the rich list, rank card themes and your inventory.',
        },
        social: {
          title: 'Social & media',
          description: 'Hugs, head pats, high fives and live Bluesky, Reddit, TikTok and YouTube lookups.',
        },
        utility: {
          title: 'Utilities',
          description: 'Server tools, image grabbers, reminders, monitoring and diagnostics.',
        },
        other: {
          title: 'Other commands',
          description: 'Commands that do not belong to a named category yet.',
        },
      },
    },
    balance: {
      title: "{user}'s wallet",
      description: '**{user}** has **{coins}** coins ready to spend.',
      empty: '**{user}** has no coins yet. Claim the first daily reward with `/daily`.',
      balance: 'Balance',
      rank: 'Server rank',
      streak: 'Daily streak',
      theme: 'Card theme',
      unranked: '**Unranked**',
      rankOf: '**#{rank}** of **{total}**',
      day: '**{count}** day',
      days: '**{count}** days',
      coins: 'coins',
      footer: 'Per-server wallet · ranked among funded wallets · /ecoleaderboard',
    },
    leaderboard: {
      title: '{server} leaderboard',
      empty: 'No one has coins yet. Earn some with `/daily`, `/work` or `/steal`.',
      summary: 'Top **{shown}** of **{total}** funded wallets.',
      rank: 'Your rank',
      rankValue: '**#{rank}** of **{total}** · **{coins}** coins',
      footer: 'Per-server wallets · /daily · /work · /steal · top 10',
    },
  },
  de: {
    language: {
      section: 'Einstellungen',
      title: 'Sprache',
      description: 'Wähle die Sprache, die Zen in diesem Server verwendet.',
      current: 'Aktuelle Sprache',
      coverage: 'Bereits übersetzt',
      coverageValue: 'Hilfe-Tabs · Geldbörsen · Rangliste · Dieses Menü',
      footer: 'Verwaltet von {user}',
      permission: 'Du benötigst die Berechtigung **Server verwalten**, um die Sprache zu ändern.',
      guildOnly: 'Die Sprache wird pro Server gespeichert. Führe `/language` in einem Serverchannel aus.',
    },
    help: {
      section: 'Befehlsverzeichnis',
      overviewTitle: 'Alles, was der Bot kann',
      overviewSummary: '**{total} Befehle**, nach Kategorien sortiert. Wähle unten eine Kategorie.',
      overviewNote: '{beta} Beta-Befehle · /changelog für Versionshinweise · 🧪 markiert Beta',
      categoryCount: '{count} Befehle · {beta} in Beta',
      more: '…und mehr',
      moreValue: '**{count}** weitere Befehle sind in dieser Kategorie verfügbar.',
      footer: 'Angefragt von {user}',
      tabs: {
        overview: 'Übersicht',
        fun: 'Fun',
        images: 'Bilder',
        moderation: 'Moderation',
        minigames: 'Minigames',
        levels: 'Level',
        economy: 'Wirtschaft',
        social: 'Social',
        utility: 'Werkzeuge',
        other: 'Sonstiges',
      },
      categories: {
        fun: {
          title: 'Fun-Befehle',
          description: 'Kurze Befehle für ein Lachen und eine kleine Pause.',
        },
        images: {
          title: 'Bilder',
          description: 'Tiermemes, xkcd-Comics, bearbeitbare Captions und Reddit-Karten mit Schriften, Farben und Themes.',
        },
        moderation: {
          title: 'Moderation',
          description: 'Berechtigungsbasierte Werkzeuge für Mutes, Kicks, Bans und Rücknahmen.',
        },
        minigames: {
          title: 'Minigames',
          description: 'Spielrunden gegen den Bot mit Live-Buttons.',
        },
        levels: {
          title: 'Level & Rang',
          description: 'Chat-XP, anpassbare Rank Cards und die Server-Rangliste.',
        },
        economy: {
          title: 'Wirtschaft & Shop',
          description: 'Münzen durch Daily, Arbeit und Heists, Wetten, Blackjack, die Rangliste, Kartenthemes und dein Inventar.',
        },
        social: {
          title: 'Social & Medien',
          description: 'Umarmungen, Kopftätscheln, High Fives und Live-Lookups für Bluesky, Reddit, TikTok und YouTube.',
        },
        utility: {
          title: 'Werkzeuge',
          description: 'Servertools, Bildabrufe, Erinnerungen, Monitoring und Diagnose.',
        },
        other: {
          title: 'Weitere Befehle',
          description: 'Befehle, die noch keiner Kategorie zugeordnet sind.',
        },
      },
    },
    balance: {
      title: 'Geldbörse von {user}',
      description: '**{user}** hat **{coins}** Münzen zum Ausgeben.',
      empty: '**{user}** hat noch keine Münzen. Hole die erste tägliche Belohnung mit `/daily` ab.',
      balance: 'Guthaben',
      rank: 'Server-Rang',
      streak: 'Tagesstreak',
      theme: 'Kartenthema',
      unranked: '**Nicht platziert**',
      rankOf: '**#{rank}** von **{total}**',
      day: '**{count}** Tag',
      days: '**{count}** Tage',
      coins: 'Münzen',
      footer: 'Guthaben pro Server · Rang unter Geldbörsen mit Münzen · /ecoleaderboard',
    },
    leaderboard: {
      title: 'Rangliste von {server}',
      empty: 'Noch hat niemand Münzen. Verdiene welche mit `/daily`, `/work` oder `/steal`.',
      summary: 'Die **{shown}** reichsten von **{total}** Geldbörsen.',
      rank: 'Dein Rang',
      rankValue: '**#{rank}** von **{total}** · **{coins}** Münzen',
      footer: 'Guthaben pro Server · /daily · /work · /steal · Top 10',
    },
  },
});

let stateQueue = Promise.resolve();

function languagesFile() {
  return process.env.LANGUAGES_FILE
    ? path.resolve(process.env.LANGUAGES_FILE)
    : DEFAULT_FILE;
}

function cleanText(value, maxLength) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

/** Accepts the values Discord or a config may send and maps them to a catalog. */
function normalizeLanguage(value) {
  const key = String(value ?? '').trim().toLowerCase().replace(/_/g, '-');
  if (!key) return DEFAULT_LANGUAGE;
  if (key === 'de' || key.startsWith('de-') || key === 'german' || key === 'deutsch') return 'de';
  return DEFAULT_LANGUAGE;
}

function languageName(language) {
  const id = normalizeLanguage(language);
  return LANGUAGES.find((entry) => entry.id === id)?.native ?? 'English';
}

function lookup(catalog, key) {
  return String(key)
    .split('.')
    .reduce((value, part) => (value && typeof value === 'object' ? value[part] : undefined), catalog);
}

/**
 * Looks up a translated string, falling back to English and then to a caller
 * supplied default. `{name}` placeholders are replaced from `vars`.
 *
 * @param {string} language
 * @param {string} key
 * @param {Record<string, string|number>} [vars]
 * @param {string} [fallback]
 * @returns {string}
 */
function t(language, key, vars = {}, fallback = key) {
  const id = normalizeLanguage(language);
  const value = lookup(MESSAGES[id], key);

  if (typeof value !== 'string') {
    const english = lookup(MESSAGES.en, key);
    return typeof english === 'string' ? interpolate(english, vars) : fallback;
  }

  return interpolate(value, vars);
}

function interpolate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (match, name) => (
    vars[name] === undefined || vars[name] === null ? match : String(vars[name])
  ));
}

function normalizeEntry(value) {
  if (!value || typeof value !== 'object') return null;

  const guildId = cleanText(value.guildId, 32);
  if (!guildId) return null;

  return {
    guildId,
    language: normalizeLanguage(value.language),
    updatedBy: cleanText(value.updatedBy, 32) || null,
    updatedAt: Number(value.updatedAt) || 0,
  };
}

async function readState() {
  try {
    const parsed = JSON.parse(await fs.readFile(languagesFile(), 'utf8'));
    const values = Array.isArray(parsed) ? parsed : parsed?.guilds;
    if (!Array.isArray(values)) throw new Error('language file has an unexpected shape');

    const unique = new Map();
    for (const value of values) {
      const entry = normalizeEntry(value);
      if (!entry) continue;
      unique.set(entry.guildId, entry);
    }

    return { version: 1, guilds: [...unique.values()] };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[i18n] Could not read ${languagesFile()}: ${error.message}`);
    }
    return { version: 1, guilds: [] };
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
  const file = languagesFile();
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });

  try {
    await fs.writeFile(
      temporary,
      `${JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        guilds: state.guilds,
      }, null, 2)}\n`,
      'utf8',
    );
    await replaceFile(temporary, file);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

function withState(operation) {
  const run = stateQueue.then(async () => {
    const state = await readState();
    const value = await operation(state);
    await writeState(state);
    return value;
  });

  stateQueue = run.catch(() => {});
  return run;
}

/** Returns the saved language for a server, defaulting to English. */
async function getGuildLanguage(guildId) {
  const key = cleanText(guildId, 32);
  if (!key) return DEFAULT_LANGUAGE;

  const state = await readState();
  const entry = state.guilds.find((candidate) => candidate.guildId === key);
  return entry?.language ?? DEFAULT_LANGUAGE;
}

/**
 * Saves a server language and returns the normalized value.
 *
 * @param {string} guildId
 * @param {string} language
 * @param {{updatedBy?: string|null, now?: number}} [options]
 * @returns {Promise<{guildId: string, language: string, updatedBy: string|null, updatedAt: number}>}
 */
async function setGuildLanguage(guildId, language, { updatedBy = null, now = Date.now() } = {}) {
  const key = cleanText(guildId, 32);
  if (!key) throw new Error('A server is required to save a language.');

  const entry = {
    guildId: key,
    language: normalizeLanguage(language),
    updatedBy: cleanText(updatedBy, 32) || null,
    updatedAt: Number.isFinite(now) ? now : Date.now(),
  };

  return withState((state) => {
    state.guilds = state.guilds.filter((candidate) => candidate.guildId !== key);
    state.guilds.push(entry);
    return { ...entry };
  });
}

module.exports = {
  DEFAULT_LANGUAGE,
  LANGUAGES,
  MESSAGES,
  SUPPORTED_LANGUAGES,
  getGuildLanguage,
  languageName,
  languagesFile,
  normalizeLanguage,
  setGuildLanguage,
  t,
};
