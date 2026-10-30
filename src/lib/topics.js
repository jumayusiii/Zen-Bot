const TOPIC_CATEGORIES = Object.freeze([
  { id: 'icebreaker', label: 'Icebreaker', emoji: '💬' },
  { id: 'hypothetical', label: 'Hypothetical', emoji: '🌀' },
  { id: 'nostalgia', label: 'Nostalgia', emoji: '📼' },
  { id: 'creative', label: 'Creative', emoji: '🎨' },
  { id: 'food', label: 'Food', emoji: '🍜' },
]);

const TOPICS = Object.freeze([
  { text: 'What is a small thing that instantly improves your day?', category: 'icebreaker' },
  { text: 'If someone visited your town for one day, where would you take them?', category: 'icebreaker' },
  { text: 'What is a hobby you have always wanted to try?', category: 'icebreaker' },
  { text: 'What is the best piece of advice you have received recently?', category: 'icebreaker' },
  { text: 'You can instantly master one skill. What do you choose?', category: 'hypothetical' },
  { text: 'You get one extra hour every day that nobody else notices. How do you use it?', category: 'hypothetical' },
  { text: 'You can teleport anywhere for lunch. Where do you go?', category: 'hypothetical' },
  { text: 'Your life gets a soundtrack. What song plays when you enter a room?', category: 'hypothetical' },
  { text: 'What game or show defined your childhood?', category: 'nostalgia' },
  { text: 'What is a snack that instantly takes you back?', category: 'nostalgia' },
  { text: 'What was your first online username, and what does it mean now?', category: 'nostalgia' },
  { text: 'Which year of your life would you revisit for a week?', category: 'nostalgia' },
  { text: 'Describe your week as a movie title.', category: 'creative' },
  { text: 'If your mood had a color palette, what would it look like today?', category: 'creative' },
  { text: 'You have to design a new holiday. What is it called and how is it celebrated?', category: 'creative' },
  { text: 'What would your personal mascot be, and why?', category: 'creative' },
  { text: 'What is a meal you could eat every week without getting tired of it?', category: 'food' },
  { text: 'What is the most underrated topping?', category: 'food' },
  { text: 'If you opened a tiny restaurant, what would be the only thing on the menu?', category: 'food' },
  { text: 'What food combination sounds wrong but tastes right?', category: 'food' },
]);

function rollIndex(random, length) {
  const value = Math.min(0.999999, Math.max(0, Number(random()) || 0));
  return Math.floor(value * length);
}

function categoryFor(id) {
  return TOPIC_CATEGORIES.find((category) => category.id === id) ?? null;
}

/**
 * Picks a conversation starter, optionally from one theme and avoiding the
 * previous prompt.
 *
 * @param {() => number} [random]
 * @param {{category?: string|null, excludeIndex?: number|null}} [options]
 * @returns {{text: string, category: string, index: number, meta: object}}
 */
function randomTopic(random = Math.random, options = {}) {
  const { category = null, excludeIndex = null } = options;
  const meta = categoryFor(category);
  const pool = TOPICS
    .map((topic, index) => ({ topic, index }))
    .filter((entry) => !meta || entry.topic.category === meta.id);
  const available = pool.filter((entry) => entry.index !== excludeIndex);
  const source = available.length > 0 ? available : pool;
  const picked = source[rollIndex(random, source.length)];

  return {
    ...picked.topic,
    index: picked.index,
    meta: categoryFor(picked.topic.category),
  };
}

module.exports = { TOPIC_CATEGORIES, TOPICS, categoryFor, randomTopic };
