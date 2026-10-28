const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const DEFAULT_FILE = path.join(__dirname, '..', '..', 'data', 'polls.json');
const MAX_OPTIONS = 5;
const MAX_POLLS = 200;
const OPEN_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
const CLOSED_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const RETRYABLE_RENAME_CODES = new Set(['EPERM', 'EBUSY', 'EACCES']);

let stateQueue = Promise.resolve();

function pollsFile() {
  return process.env.POLLS_FILE
    ? path.resolve(process.env.POLLS_FILE)
    : DEFAULT_FILE;
}

function cleanText(value, maxLength) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function normalizePoll(value) {
  if (!value || typeof value !== 'object') return null;

  const id = cleanText(value.id, 64);
  const ownerId = cleanText(value.ownerId, 32);
  const question = cleanText(value.question, 200);
  const createdAt = Number(value.createdAt);

  if (!id || !ownerId || !question || !Number.isFinite(createdAt)) return null;

  const options = Array.isArray(value.options)
    ? value.options
        .slice(0, MAX_OPTIONS)
        .map((option) => ({
          label: cleanText(option?.label, 80),
          voters: [...new Set(
            (Array.isArray(option?.voters) ? option.voters : [])
              .map((voter) => cleanText(voter, 32))
              .filter(Boolean),
          )],
        }))
        .filter((option) => option.label)
    : [];

  if (options.length < 2) return null;

  return {
    id,
    messageId: cleanText(value.messageId, 32) || null,
    channelId: cleanText(value.channelId, 32) || null,
    guildId: cleanText(value.guildId, 32) || null,
    ownerId,
    question,
    options,
    createdAt,
    closedAt: Number.isFinite(Number(value.closedAt)) && Number(value.closedAt) > 0
      ? Number(value.closedAt)
      : null,
  };
}

async function readState() {
  try {
    const parsed = JSON.parse(await fs.readFile(pollsFile(), 'utf8'));
    const values = Array.isArray(parsed) ? parsed : parsed?.polls;
    if (!Array.isArray(values)) throw new Error('poll file has an unexpected shape');

    const unique = new Map();
    for (const value of values) {
      const poll = normalizePoll(value);
      if (poll && !unique.has(poll.id)) unique.set(poll.id, poll);
    }

    return { version: 1, polls: [...unique.values()] };
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn(`[polls] Could not read ${pollsFile()}: ${error.message}`);
    }
    return { version: 1, polls: [] };
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

function pruneState(state, now = Date.now()) {
  state.polls = state.polls
    .filter((poll) => {
      const age = now - poll.createdAt;
      return poll.closedAt
        ? age <= CLOSED_RETENTION_MS
        : age <= OPEN_RETENTION_MS;
    })
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_POLLS);
}

async function writeState(state) {
  pruneState(state);

  const file = pollsFile();
  const temporary = `${file}.${process.pid}.tmp`;
  await fs.mkdir(path.dirname(file), { recursive: true });

  try {
    await fs.writeFile(
      temporary,
      `${JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        polls: state.polls,
      }, null, 2)}\n`,
      'utf8',
    );
    await replaceFile(temporary, file);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

/**
 * Serializes poll reads and writes. Votes are read-modify-write operations, so
 * two people clicking at the same moment must not overwrite each other.
 *
 * @template T
 * @param {(state: {version: number, polls: object[]}) => Promise<T>|T} operation
 * @param {boolean} [write]
 * @returns {Promise<T>}
 */
function withState(operation, write = true) {
  const run = stateQueue.then(async () => {
    const state = await readState();
    const result = await operation(state);
    if (write) await writeState(state);
    return result;
  });

  stateQueue = run.catch(() => {});
  return run;
}

function clonePoll(poll) {
  if (!poll) return null;
  return {
    ...poll,
    options: poll.options.map((option) => ({ ...option, voters: [...option.voters] })),
  };
}

function uniqueLabels(labels) {
  const seen = new Set();
  const values = [];

  for (const label of labels) {
    const cleaned = cleanText(label, 80);
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    values.push(cleaned);
    if (values.length === MAX_OPTIONS) break;
  }

  return values;
}

/**
 * Creates a poll before its Discord message exists. The message/channel ids are
 * attached once the reply has been sent.
 *
 * @param {{channelId?: string, guildId?: string, ownerId: string, question: string, labels: string[]}} input
 * @returns {Promise<object>}
 */
async function createPoll(input) {
  const labels = uniqueLabels(input.labels ?? []);
  if (labels.length < 2) throw new Error('A poll needs at least two different options.');

  const poll = {
    id: crypto.randomUUID(),
    messageId: null,
    channelId: input.channelId || null,
    guildId: input.guildId || null,
    ownerId: String(input.ownerId),
    question: cleanText(input.question, 200),
    options: labels.map((label) => ({ label, voters: [] })),
    createdAt: Date.now(),
    closedAt: null,
  };

  if (!poll.question) throw new Error('The poll question cannot be empty.');

  await withState((state) => {
    state.polls.push(poll);
  });

  return clonePoll(poll);
}

async function attachPollMessage(pollId, messageId, channelId) {
  return withState((state) => {
    const poll = state.polls.find((item) => item.id === pollId);
    if (!poll) return null;

    poll.messageId = String(messageId);
    poll.channelId = String(channelId);
    return clonePoll(poll);
  });
}

async function getPoll(pollId) {
  return withState((state) => clonePoll(
    state.polls.find((item) => item.id === pollId),
  ), false);
}

/**
 * Records a single-choice vote. Clicking the selected option again removes the
 * vote, which makes the buttons forgiving without allowing multi-select.
 *
 * @param {string} pollId
 * @param {string} userId
 * @param {number} optionIndex
 * @returns {Promise<{poll: object|null, action: 'added'|'removed'|'invalid'|'closed'}>}
 */
async function recordVote(pollId, userId, optionIndex) {
  return withState((state) => {
    const poll = state.polls.find((item) => item.id === pollId);
    if (!poll) return { poll: null, action: 'invalid' };
    if (poll.closedAt) return { poll: clonePoll(poll), action: 'closed' };
    if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= poll.options.length) {
      return { poll: clonePoll(poll), action: 'invalid' };
    }

    const existingIndex = poll.options.findIndex((option) => option.voters.includes(userId));
    if (existingIndex === optionIndex) {
      poll.options[optionIndex].voters = poll.options[optionIndex].voters.filter((id) => id !== userId);
      return { poll: clonePoll(poll), action: 'removed' };
    }

    for (const option of poll.options) {
      option.voters = option.voters.filter((id) => id !== userId);
    }
    poll.options[optionIndex].voters.push(userId);

    return { poll: clonePoll(poll), action: 'added' };
  });
}

/**
 * Closes a poll. Only its creator may close it.
 *
 * @param {string} pollId
 * @param {string} userId
 * @returns {Promise<{poll: object|null, error: 'not_found'|'forbidden'|null}>}
 */
async function closePoll(pollId, userId) {
  return withState((state) => {
    const poll = state.polls.find((item) => item.id === pollId);
    if (!poll) return { poll: null, error: 'not_found' };
    if (poll.ownerId !== userId) return { poll: clonePoll(poll), error: 'forbidden' };

    if (!poll.closedAt) poll.closedAt = Date.now();
    return { poll: clonePoll(poll), error: null };
  });
}

async function deletePoll(pollId) {
  return withState((state) => {
    state.polls = state.polls.filter((poll) => poll.id !== pollId);
  });
}

module.exports = {
  MAX_OPTIONS,
  attachPollMessage,
  closePoll,
  createPoll,
  deletePoll,
  getPoll,
  pollsFile,
  recordVote,
};
