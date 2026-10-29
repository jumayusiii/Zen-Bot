const JOKES = Object.freeze([
  {
    setup: 'Why do programmers prefer dark mode?',
    punchline: 'Because light attracts bugs.',
  },
  {
    setup: 'Why did the developer go broke?',
    punchline: 'Because they used up all their cache.',
  },
  {
    setup: 'How many programmers does it take to change a light bulb?',
    punchline: 'None. That is a hardware problem.',
  },
  {
    setup: 'Why was the JavaScript developer sad?',
    punchline: 'Because they did not know how to null their feelings.',
  },
  {
    setup: 'What is a programmer’s favourite hangout spot?',
    punchline: 'The foo bar.',
  },
  {
    setup: 'Why do Java developers wear glasses?',
    punchline: 'Because they do not C sharp.',
  },
  {
    setup: 'What did the ocean say to the beach?',
    punchline: 'Nothing. It just waved.',
  },
  {
    setup: 'Why did the scarecrow win an award?',
    punchline: 'Because it was outstanding in its field.',
  },
  {
    setup: 'What do you call a fake noodle?',
    punchline: 'An impasta.',
  },
  {
    setup: 'Why did the coffee file a police report?',
    punchline: 'It got mugged.',
  },
  {
    setup: 'What did the zero say to the eight?',
    punchline: 'Nice belt.',
  },
  {
    setup: 'Why did the bicycle fall over?',
    punchline: 'Because it was two tired.',
  },
]);

/**
 * Picks a joke, optionally avoiding the one that was just shown.
 *
 * @param {() => number} [random]
 * @param {number|null} [excludeIndex]
 */
function randomJoke(random = Math.random, excludeIndex = null) {
  const available = JOKES.map((joke, index) => ({ joke, index }))
    .filter((entry) => entry.index !== excludeIndex);

  const pool = available.length > 0
    ? available
    : JOKES.map((joke, index) => ({ joke, index }));
  const picked = pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];

  return { ...picked.joke, index: picked.index };
}

module.exports = { JOKES, randomJoke };
