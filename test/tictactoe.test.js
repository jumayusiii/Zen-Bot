const assert = require('node:assert/strict');
const test = require('node:test');

const {
  BOT,
  LINES,
  PLAYER,
  applyMove,
  availableMoves,
  chooseBotMove,
  createBoard,
  winnerOf,
} = require('../src/lib/tictactoe');

test('win detection covers rows, columns and diagonals', () => {
  for (const line of LINES) {
    const board = createBoard();
    board[line[0]] = PLAYER;
    board[line[1]] = PLAYER;
    board[line[2]] = PLAYER;
    assert.equal(winnerOf(board), PLAYER);
  }

  const draw = ['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'];
  assert.equal(winnerOf(draw), 'draw');
  assert.equal(winnerOf(createBoard()), null);
});

test('moves are immutable and occupied or invalid squares are rejected', () => {
  const board = createBoard();
  const next = applyMove(board, 4, PLAYER);

  assert.equal(board[4], null);
  assert.equal(next[4], PLAYER);
  assert.equal(applyMove(next, 4, BOT), null);
  assert.equal(applyMove(next, 9, BOT), null);
  assert.deepEqual(availableMoves(next), [0, 1, 2, 3, 5, 6, 7, 8]);
});

test('the bot takes a winning move before blocking', () => {
  const board = ['O', 'O', null, 'X', 'X', null, null, null, null];
  assert.equal(chooseBotMove(board, () => 0.5), 2);
});

test('the bot blocks an immediate loss', () => {
  const board = ['X', 'X', null, null, 'O', null, null, null, null];
  assert.equal(chooseBotMove(board, () => 0.5), 2);
});

test('the bot prefers the centre and handles a full board', () => {
  assert.equal(chooseBotMove(createBoard(), () => 0.5), 4);
  assert.equal(
    chooseBotMove(['X', 'O', 'X', 'X', 'O', 'O', 'O', 'X', 'X'], () => 0.5),
    -1,
  );
});
