const SUITS = Object.freeze(['♠', '♥', '♦', '♣']);
const RANKS = Object.freeze([
  'A',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'J',
  'Q',
  'K',
]);

function createDeck() {
  return SUITS.flatMap((suit) => RANKS.map((rank) => ({ rank, suit })));
}

function randomIndex(random, length) {
  return Math.floor(Math.min(0.999999, Math.max(0, random())) * length);
}

function shuffle(deck, random = Math.random) {
  const cards = [...deck];

  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swap = randomIndex(random, index + 1);
    [cards[index], cards[swap]] = [cards[swap], cards[index]];
  }

  return cards;
}

/**
 * @param {object[]} deck
 * @param {number} [count]
 * @returns {{cards: object[], deck: object[]}}
 */
function drawCards(deck, count = 1) {
  const size = Math.max(0, Math.min(count, deck.length));
  return {
    cards: deck.slice(deck.length - size),
    deck: deck.slice(0, deck.length - size),
  };
}

/**
 * @param {object[]} cards
 * @returns {{total: number, soft: boolean}}
 */
function handValue(cards) {
  let total = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.rank === 'A') {
      aces += 1;
      total += 11;
    } else if (card.rank === 'J' || card.rank === 'Q' || card.rank === 'K') {
      total += 10;
    } else {
      total += Number(card.rank);
    }
  }

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  return { total, soft: aces > 0 };
}

function formatHand(cards) {
  return cards.map((card) => `${card.rank}${card.suit}`).join('  ');
}

function formatDealer(dealer) {
  return `${dealer[0].rank}${dealer[0].suit}  🂠`;
}

function startRound(random = Math.random) {
  let deck = shuffle(createDeck(), random);

  const playerDraw = drawCards(deck, 2);
  deck = playerDraw.deck;

  const dealerDraw = drawCards(deck, 2);
  deck = dealerDraw.deck;

  return {
    deck,
    player: playerDraw.cards,
    dealer: dealerDraw.cards,
  };
}

/**
 * Dealer stands on every total of 17 or more, including soft 17.
 *
 * @param {object[]} dealerCards
 * @param {object[]} deck
 * @returns {{cards: object[], deck: object[]}}
 */
function dealerPlay(dealerCards, deck) {
  let cards = [...dealerCards];
  let remaining = [...deck];

  while (handValue(cards).total < 17 && remaining.length > 0) {
    const draw = drawCards(remaining, 1);
    cards = [...cards, ...draw.cards];
    remaining = draw.deck;
  }

  return { cards, deck: remaining };
}

/**
 * @param {object[]} playerCards
 * @param {object[]} dealerCards
 * @returns {'win'|'lose'|'push'}
 */
function outcome(playerCards, dealerCards) {
  const player = handValue(playerCards).total;
  const dealer = handValue(dealerCards).total;

  if (player > 21) return 'lose';
  if (dealer > 21) return 'win';
  if (player > dealer) return 'win';
  if (player < dealer) return 'lose';
  return 'push';
}

module.exports = {
  RANKS,
  SUITS,
  createDeck,
  dealerPlay,
  drawCards,
  formatDealer,
  formatHand,
  handValue,
  outcome,
  shuffle,
  startRound,
};
