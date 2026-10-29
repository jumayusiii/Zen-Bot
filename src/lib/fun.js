const FACTS = Object.freeze([
  'Honey can last for thousands of years without spoiling.',
  'Octopuses have three hearts and blue blood.',
  'A day on Venus is longer than a year on Venus.',
  'Sharks existed before trees did.',
  'The Eiffel Tower can grow about 15 cm taller in hot weather.',
  'Bananas are berries, but strawberries are not.',
  'Wombat droppings are cube-shaped.',
  'A group of flamingos is called a flamboyance.',
  'Sea otters hold hands while sleeping so they do not drift apart.',
  'Lightning is roughly five times hotter than the surface of the Sun.',
  'The shortest recorded war lasted about 38 minutes.',
  'The Moon drifts about 3.8 cm farther from Earth every year.',
  'Mars is home to Olympus Mons, the tallest volcano in the solar system.',
  'The first computer bug was a real moth found in a relay in 1947.',
  'The dot over the letters i and j is called a tittle.',
  'Cows form close friendships and can become stressed when separated.',
  'Antarctica is the largest desert on Earth; the Sahara is the largest hot desert.',
  'A jiffy is a real unit of time used in physics and computing.',
  'The unicorn is the national animal of Scotland.',
  'A group of crows is called a murder.',
  'Earth has more trees than the Milky Way has stars, by current estimates.',
  'A human heart beats roughly 100,000 times a day.',
  'A blue whale heart can weigh around 180 kg.',
  'The first webcam watched a coffee pot at Cambridge University.',
  'Nintendo was founded in 1889 as a playing-card company.',
  'The word "robot" comes from the Czech word robota, meaning forced labor.',
  'The Eiffel Tower was originally meant to be a temporary structure.',
  'Some turtles can absorb oxygen through their cloaca.',
  'A "moment" was a medieval unit of time equal to about 90 seconds.',
  'The average person walks the equivalent of several times around the world in a lifetime.',
]);

const VERDICTS = Object.freeze([
  { min: 90, label: 'Soulmates', emoji: '💞' },
  { min: 75, label: 'Perfect match', emoji: '💘' },
  { min: 60, label: 'Strong connection', emoji: '💖' },
  { min: 40, label: 'Worth a shot', emoji: '✨' },
  { min: 25, label: 'Just friends', emoji: '🤝' },
  { min: 0, label: 'Not meant to be', emoji: '💔' },
]);

const COMPLIMENTS = Object.freeze([
  'You make every room a little brighter.',
  'Your energy is genuinely contagious.',
  'You have excellent taste.',
  'You are the kind of person who makes teamwork easy.',
  'Your curiosity is one of your best traits.',
  'You always know how to make someone laugh.',
  'You handle challenges with real grace.',
  'Your ideas are worth listening to.',
  'You bring out the best in the people around you.',
  'You are more capable than you give yourself credit for.',
  'Your kindness does not go unnoticed.',
  'You have a talent for making things feel possible.',
  'You are a great person to have in a server.',
  'Your creativity is seriously underrated.',
  'You make ordinary moments feel fun.',
  'You are doing better than you think.',
  'Your patience is impressive.',
  'You have a genuinely good heart.',
  'You are the reason someone smiled today.',
  'You bring good vibes wherever you go.',
]);

const RATE_VERDICTS = Object.freeze([
  { min: 90, label: 'Certified elite', emoji: '🏆' },
  { min: 75, label: 'Very good', emoji: '🔥' },
  { min: 60, label: 'Solid', emoji: '👍' },
  { min: 40, label: 'Mid', emoji: '😐' },
  { min: 25, label: 'Needs work', emoji: '📉' },
  { min: 0, label: 'Not it', emoji: '💀' },
]);

function hashString(value) {
  let hash = 2_166_136_261;

  for (const character of String(value)) {
    hash ^= character.codePointAt(0);
    hash = Math.imul(hash, 16_777_619);
  }

  return hash >>> 0;
}

/**
 * A deterministic, symmetric compatibility score. The same pair always gets
 * the same playful result, regardless of who runs the command.
 *
 * @param {string} firstId
 * @param {string} secondId
 * @returns {number} 0–100
 */
function shipScore(firstId, secondId) {
  const key = [String(firstId), String(secondId)].sort().join(':');
  return hashString(key) % 101;
}

function shipVerdict(score) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  return VERDICTS.find((verdict) => value >= verdict.min) ?? VERDICTS[VERDICTS.length - 1];
}

/**
 * @param {() => number} [random]
 * @param {number|null} [excludeIndex]
 * @returns {{text: string, index: number}}
 */
function randomFact(random = Math.random, excludeIndex = null) {
  const pool = FACTS
    .map((text, index) => ({ text, index }))
    .filter((fact) => fact.index !== excludeIndex);

  const index = Math.min(
    pool.length - 1,
    Math.floor(Math.min(0.999999, Math.max(0, random())) * pool.length),
  );

  return pool[index];
}

/**
 * A deterministic 0–100 rating. The same normalized input always gets the
 * same playful score, regardless of who runs the command.
 *
 * @param {string} value
 * @returns {number}
 */
function rateThing(value) {
  return hashString(String(value ?? '').trim().toLowerCase()) % 101;
}

function rateVerdict(score) {
  const value = Math.max(0, Math.min(100, Number(score) || 0));
  return RATE_VERDICTS.find((verdict) => value >= verdict.min) ?? RATE_VERDICTS[RATE_VERDICTS.length - 1];
}

/**
 * @param {() => number} [random]
 * @param {number|null} [excludeIndex]
 * @returns {{text: string, index: number}}
 */
function randomCompliment(random = Math.random, excludeIndex = null) {
  const pool = COMPLIMENTS
    .map((text, index) => ({ text, index }))
    .filter((compliment) => compliment.index !== excludeIndex);

  const index = Math.min(
    pool.length - 1,
    Math.floor(Math.min(0.999999, Math.max(0, random())) * pool.length),
  );

  return pool[index];
}

module.exports = {
  COMPLIMENTS,
  FACTS,
  RATE_VERDICTS,
  VERDICTS,
  randomCompliment,
  randomFact,
  rateThing,
  rateVerdict,
  shipScore,
  shipVerdict,
};
