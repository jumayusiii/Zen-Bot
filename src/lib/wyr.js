const crypto = require('node:crypto');

const QUESTIONS = Object.freeze([
  { a: 'Have unlimited pizza for a year', b: 'Have unlimited tacos for a year' },
  { a: 'Always be 10 minutes early', b: 'Always be 10 minutes late' },
  { a: 'Live without music', b: 'Live without movies' },
  { a: 'Have a personal chef', b: 'Have a personal driver' },
  { a: 'Explore space', b: 'Explore the deepest ocean' },
  { a: 'Speak every language', b: 'Play every instrument' },
  { a: 'Have a pet dragon', b: 'Have a pet unicorn' },
  { a: 'Never lose your keys again', b: 'Never lose your phone again' },
  { a: 'Only eat sweet food', b: 'Only eat salty food' },
  { a: 'Be able to fly', b: 'Be able to turn invisible' },
]);

const QUESTIONS_DE = Object.freeze([
  { a: 'Ein Jahr lang unbegrenzt Pizza', b: 'Ein Jahr lang unbegrenzt Tacos' },
  { a: 'Immer 10 Minuten zu früh sein', b: 'Immer 10 Minuten zu spät sein' },
  { a: 'Ohne Musik leben', b: 'Ohne Filme leben' },
  { a: 'Einen persönlichen Koch haben', b: 'Einen persönlichen Fahrer haben' },
  { a: 'Den Weltraum erkunden', b: 'Die tiefste Stelle des Ozeans erkunden' },
  { a: 'Jede Sprache sprechen', b: 'Jedes Instrument spielen' },
  { a: 'Einen Drachen als Haustier haben', b: 'Ein Einhorn als Haustier haben' },
  { a: 'Nie wieder den Schlüssel verlieren', b: 'Nie wieder das Handy verlieren' },
  { a: 'Nur noch Süßes essen', b: 'Nur noch Salziges essen' },
  { a: 'Fliegen können', b: 'Unsichtbar werden können' },
]);

const SESSION_TTL_MS = 60 * 60 * 1000;
const MAX_SESSIONS = 300;
const sessions = new Map();

function cleanSessions(now = Date.now()) {
  for (const [id, session] of sessions) {
    if (now - session.createdAt > SESSION_TTL_MS) sessions.delete(id);
  }

  while (sessions.size > MAX_SESSIONS) {
    sessions.delete(sessions.keys().next().value);
  }
}

function randomQuestion(random = Math.random, excludeIndex = null, language = 'en') {
  const questions = String(language ?? '').toLowerCase().startsWith('de')
    ? QUESTIONS_DE
    : QUESTIONS;
  const available = questions.map((question, index) => ({ question, index }))
    .filter((entry) => entry.index !== excludeIndex);
  const pool = available.length > 0
    ? available
    : questions.map((question, index) => ({ question, index }));
  const picked = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];

  return { ...picked.question, index: picked.index };
}

/** Creates a short-lived in-memory vote. */
function createSession(random = Math.random, now = Date.now(), language = 'en') {
  cleanSessions(now);
  const question = randomQuestion(random, null, language);
  const session = {
    id: crypto.randomUUID(),
    language: String(language ?? '').toLowerCase().startsWith('de') ? 'de' : 'en',
    ...question,
    votes: new Map(),
    createdAt: now,
  };

  sessions.set(session.id, session);
  return session;
}

function getSession(id, now = Date.now()) {
  const session = sessions.get(String(id));
  if (!session) return null;
  if (now - session.createdAt > SESSION_TTL_MS) {
    sessions.delete(session.id);
    return null;
  }
  return session;
}

function tally(session) {
  let a = 0;
  let b = 0;

  for (const choice of session.votes.values()) {
    if (choice === 'a') a += 1;
    else if (choice === 'b') b += 1;
  }

  return { a, b, total: a + b };
}

/**
 * Records or changes one user's vote. Returns null when the round expired.
 */
function castVote(id, userId, choice, now = Date.now()) {
  const session = getSession(id, now);
  if (!session) return null;
  if (choice !== 'a' && choice !== 'b') throw new Error('Vote must be a or b.');

  const previous = session.votes.get(String(userId)) ?? null;
  session.votes.set(String(userId), choice);

  return {
    session,
    counts: tally(session),
    previous,
    changed: previous !== choice,
  };
}

function resetSessions() {
  sessions.clear();
}

module.exports = {
  QUESTIONS,
  QUESTIONS_DE,
  SESSION_TTL_MS,
  castVote,
  createSession,
  getSession,
  randomQuestion,
  resetSessions,
  tally,
};
