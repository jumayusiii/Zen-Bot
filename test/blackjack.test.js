const assert = require('node:assert/strict');
const test = require('node:test');

const {
  createDeck,
  dealerPlay,
  drawCards,
  handValue,
  outcome,
  startRound,
} = require('../src/lib/blackjack');

const card = (rank, suit = '♠') => ({ rank, suit });

test('a deck contains 52 unique cards', () => {
  const deck = createDeck();
  const keys = new Set(deck.map((entry) => `${entry.rank}${entry.suit}`));

  assert.equal(deck.length, 52);
  assert.equal(keys.size, 52);
});

test('hand values handle aces, faces and multiple aces', () => {
  assert.equal(handValue([card('A'), card('9')]).total, 20);
  assert.equal(handValue([card('A'), card('A')]).total, 12);
  assert.equal(handValue([card('A'), card('A'), card('9')]).total, 21);
  assert.equal(handValue([card('K'), card('Q'), card('J')]).total, 30);
  assert.equal(handValue([card('A'), card('K')]).soft, true);
});

test('drawCards takes from the top without mutating the deck', () => {
  const deck = [card('2'), card('3'), card('4')];
  const draw = drawCards(deck, 2);

  assert.deepEqual(draw.cards, [card('3'), card('4')]);
  assert.deepEqual(draw.deck, [card('2')]);
  assert.equal(deck.length, 3);
});

test('the dealer hits below 17 and stands on 17', () => {
  const hits = dealerPlay([card('10'), card('6')], [card('5'), card('2')]);
  assert.equal(handValue(hits.cards).total, 18);
  assert.equal(hits.deck.length, 1);

  const stands = dealerPlay([card('10'), card('7')], [card('5')]);
  assert.equal(handValue(stands.cards).total, 17);
  assert.equal(stands.deck.length, 1);
});

test('outcomes cover wins, losses, pushes and busts', () => {
  assert.equal(outcome([card('10'), card('9')], [card('10'), card('8')]), 'win');
  assert.equal(outcome([card('10'), card('8')], [card('10'), card('9')]), 'lose');
  assert.equal(outcome([card('10'), card('9')], [card('10'), card('9')]), 'push');
  assert.equal(outcome([card('10'), card('9'), card('5')], [card('10'), card('9')]), 'lose');
  assert.equal(outcome([card('10'), card('9')], [card('10'), card('9'), card('5')]), 'win');
});

test('startRound deals two cards to each side and leaves 48 in the deck', () => {
  const round = startRound(() => 0.5);

  assert.equal(round.player.length, 2);
  assert.equal(round.dealer.length, 2);
  assert.equal(round.deck.length, 48);

  const dealt = [...round.player, ...round.dealer].map((entry) => `${entry.rank}${entry.suit}`);
  assert.equal(new Set(dealt).size, 4);
});
