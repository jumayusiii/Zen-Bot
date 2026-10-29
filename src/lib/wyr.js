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

function randomQuestion(random = Math.random, excludeIndex = null) {
  const available = QUESTIONS.map((question, index) => ({ question, index }))
    .filter((entry) => entry.index !== excludeIndex);
  const pool = available.length > 0
    ? available
    : QUESTIONS.map((question, index) => ({ question, index }));
  const picked = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];

  return { ...picked.question, index: picked.index };
}

/** Creates a short-lived in-memory vote. */
function createSession(random = Math.random, now = Date.now()) {
  cleanSessions(now);
  const question = randomQuestion(random);
  const session = {
    id: crypto.randomUUID(),
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
  SESSION_TTL_MS,
  castVote,
  createSession,
  getSession,
  randomQuestion,
  resetSessions,
  tally,
};
