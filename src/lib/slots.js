const SYMBOLS = Object.freeze([
  { emoji: '🍒', name: 'Cherry', weight: 28 },
  { emoji: '🍋', name: 'Lemon', weight: 24 },
  { emoji: '🔔', name: 'Bell', weight: 18 },
  { emoji: '⭐', name: 'Star', weight: 14 },
  { emoji: '💎', name: 'Diamond', weight: 9 },
  { emoji: '7️⃣', name: 'Seven', weight: 7 },
]);

const TOTAL_WEIGHT = SYMBOLS.reduce((total, symbol) => total + symbol.weight, 0);

function pickSymbol(random = Math.random) {
  let roll = random() * TOTAL_WEIGHT;

  for (const symbol of SYMBOLS) {
    roll -= symbol.weight;
    if (roll < 0) return symbol;
  }

  return SYMBOLS[0];
}

function spinSlots(random = Math.random) {
  return [pickSymbol(random), pickSymbol(random), pickSymbol(random)];
}

function evaluateSpin(reels) {
  if (!Array.isArray(reels) || reels.length !== 3) {
    throw new Error('A slot result needs exactly three symbols.');
  }

  const names = reels.map((symbol) => symbol.name);
  const counts = new Map();
  for (const name of names) counts.set(name, (counts.get(name) ?? 0) + 1);
  const best = Math.max(...counts.values());

  if (best === 3) {
    return {
      matches: 3,
      label: 'Jackpot',
      detail: `Three ${names[0]} symbols!`,
      color: 'success',
    };
  }

  if (best === 2) {
    const pair = [...counts.entries()].find(([, count]) => count === 2)[0];
    return {
      matches: 2,
      label: 'Two of a kind',
      detail: `A pair of ${pair} symbols.`,
      color: 'game',
    };
  }

  return {
    matches: 0,
    label: 'No match',
    detail: 'The reels did not line up this time.',
    color: 'danger',
  };
}

module.exports = { SYMBOLS, evaluateSpin, pickSymbol, spinSlots };
