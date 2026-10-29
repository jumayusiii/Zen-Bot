const MAX_ROUNDS = 5;

const WORDS = Object.freeze([
  { word: 'DISCORD', hint: 'Where this bot lives' },
  { word: 'JAVASCRIPT', hint: 'The language this bot is written in' },
  { word: 'HABBO', hint: 'The community this bot watches' },
  { word: 'MINIGAME', hint: 'A small game like this one' },
  { word: 'LEVEL', hint: 'Chat XP unlocks this' },
  { word: 'MODERATION', hint: 'Keeping the server friendly' },
  { word: 'REMINDER', hint: 'A nudge at the right time' },
  { word: 'BANNER', hint: 'The wide image at the top of a server' },
  { word: 'PUZZLE', hint: 'A brain teaser' },
  { word: 'ACHIEVEMENT', hint: 'A milestone worth celebrating' },
  { word: 'COMMUNITY', hint: 'The people in a server' },
  { word: 'COMPUTER', hint: 'It runs the bot' },
  { word: 'KEYBOARD', hint: 'You type on it' },
  { word: 'LIGHTNING', hint: 'Fast and bright' },
  { word: 'GALAXY', hint: 'A huge group of stars' },
  { word: 'PENGUIN', hint: 'A flightless bird' },
  { word: 'AVATAR', hint: 'Your profile picture' },
  { word: 'EMBED', hint: 'The clean card this game uses' },
]);

function randomIndex(length, random) {
  return Math.min(length - 1, Math.floor(Math.min(0.999999, Math.max(0, random())) * length));
}

/**
 * Picks a word, optionally avoiding the previous round's answer.
 *
 * @param {() => number} [random]
 * @param {string|null} [excludeWord]
 * @returns {{word: string, hint: string}}
 */
function randomWord(random = Math.random, excludeWord = null) {
  const excluded = String(excludeWord ?? '').toUpperCase();
  const pool = WORDS.filter((entry) => entry.word !== excluded);
  const source = pool.length > 0 ? pool : WORDS;
  return { ...source[randomIndex(source.length, random)] };
}

/**
 * Shuffles the letters and guarantees a different order when possible.
 *
 * @param {string} word
 * @param {() => number} [random]
 * @returns {string}
 */
function scrambleWord(word, random = Math.random) {
  const original = String(word ?? '').toUpperCase();
  const letters = [...original];
  if (letters.length < 2) return original;

  for (let attempt = 0; attempt < 12; attempt += 1) {
    for (let index = letters.length - 1; index > 0; index -= 1) {
      const swap = randomIndex(index + 1, random);
      [letters[index], letters[swap]] = [letters[swap], letters[index]];
    }

    const scrambled = letters.join('');
    if (scrambled !== original) return scrambled;
  }

  return `${original.slice(1)}${original[0]}`;
}

/**
 * Builds four unique answer buttons, including the real word, in a shuffled
 * order.
 *
 * @param {string} word
 * @param {() => number} [random]
 * @returns {string[]}
 */
function buildChoices(word, random = Math.random) {
  const answer = String(word ?? '').toUpperCase();
  const pool = WORDS.map((entry) => entry.word).filter((candidate) => candidate !== answer);
  const start = randomIndex(pool.length, random);
  const choices = [answer];

  for (let offset = 0; offset < pool.length && choices.length < 4; offset += 1) {
    const candidate = pool[(start + offset) % pool.length];
    if (!choices.includes(candidate)) choices.push(candidate);
  }

  for (let index = choices.length - 1; index > 0; index -= 1) {
    const swap = randomIndex(index + 1, random);
    [choices[index], choices[swap]] = [choices[swap], choices[index]];
  }

  return choices;
}

/**
 * Creates one fresh scramble round. The answer is the index of the correct
 * word in `choices`, so the command never needs to leak a separate id.
 *
 * @param {() => number} [random]
 * @param {string|null} [excludeWord]
 */
function createRound(random = Math.random, excludeWord = null) {
  const entry = randomWord(random, excludeWord);
  const choices = buildChoices(entry.word, random);

  return {
    word: entry.word,
    hint: entry.hint,
    scrambled: scrambleWord(entry.word, random),
    choices,
    answer: choices.indexOf(entry.word),
  };
}

module.exports = {
  MAX_ROUNDS,
  WORDS,
  buildChoices,
  createRound,
  randomWord,
  scrambleWord,
};
