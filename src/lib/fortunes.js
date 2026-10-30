const FORTUNES = Object.freeze([
  { text: 'A calm mind makes room for clear answers.', category: 'Wisdom' },
  { text: 'Small, steady steps finish long journeys.', category: 'Growth' },
  { text: 'The right question is often more useful than a quick answer.', category: 'Wisdom' },
  { text: 'You will find luck in the next thing you finish.', category: 'Luck' },
  { text: 'A kind word today will return when you need it.', category: 'Kindness' },
  { text: 'The door you keep avoiding may already be open.', category: 'Adventure' },
  { text: 'Good work speaks quietly and travels far.', category: 'Focus' },
  { text: 'What feels like a pause may be a change of direction.', category: 'Growth' },
  { text: 'Your patience is about to pay for itself.', category: 'Luck' },
  { text: 'Better to begin imperfectly than to wait perfectly.', category: 'Growth' },
  { text: 'A fresh idea arrives while you are doing something ordinary.', category: 'Adventure' },
  { text: 'Someone nearby is rooting for you more than you know.', category: 'Kindness' },
  { text: 'The simplest plan is the one that survives a busy week.', category: 'Focus' },
  { text: 'You are closer to a breakthrough than the last attempt suggests.', category: 'Growth' },
  { text: 'Leave a little space in your day for something unexpected.', category: 'Adventure' },
  { text: 'The best time to tidy one small thing is now.', category: 'Focus' },
  { text: 'A good conversation will change the shape of your afternoon.', category: 'Kindness' },
  { text: 'You will soon laugh at a problem that feels heavy today.', category: 'Luck' },
]);

function rollIndex(random, length) {
  const value = Math.min(0.999999, Math.max(0, Number(random()) || 0));
  return Math.floor(value * length);
}

/**
 * Draws unique lucky numbers from 1–49, returned in ascending order.
 *
 * @param {() => number} [random]
 * @param {number} [count]
 * @returns {number[]}
 */
function drawLuckyNumbers(random = Math.random, count = 6) {
  const wanted = Math.min(49, Math.max(1, Number.isInteger(count) ? count : 6));
  const pool = Array.from({ length: 49 }, (_, index) => index + 1);
  const numbers = [];

  for (let index = 0; index < wanted; index += 1) {
    const picked = rollIndex(random, pool.length);
    numbers.push(pool.splice(picked, 1)[0]);
  }

  return numbers.sort((first, second) => first - second);
}

/**
 * Picks a fortune, optionally avoiding the previous one, and adds a fresh set
 * of lucky numbers.
 *
 * @param {() => number} [random]
 * @param {number|null} [excludeIndex]
 * @returns {{text: string, category: string, index: number, luckyNumbers: number[]}}
 */
function randomFortune(random = Math.random, excludeIndex = null) {
  const available = FORTUNES
    .map((fortune, index) => ({ fortune, index }))
    .filter((entry) => entry.index !== excludeIndex);
  const pool = available.length > 0
    ? available
    : FORTUNES.map((fortune, index) => ({ fortune, index }));
  const picked = pool[rollIndex(random, pool.length)];

  return {
    ...picked.fortune,
    index: picked.index,
    luckyNumbers: drawLuckyNumbers(random),
  };
}

module.exports = { FORTUNES, drawLuckyNumbers, randomFortune };
