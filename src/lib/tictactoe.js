const PLAYER = 'X';
const BOT = 'O';

const LINES = Object.freeze([
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]);

function createBoard() {
  return Array(9).fill(null);
}

/**
 * @param {Array<'X'|'O'|null>} board
 * @returns {'X'|'O'|'draw'|null}
 */
function winnerOf(board) {
  for (const [a, b, c] of LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }

  return board.every(Boolean) ? 'draw' : null;
}

/**
 * @param {Array<'X'|'O'|null>} board
 * @returns {number[]}
 */
function availableMoves(board) {
  return board.flatMap((value, index) => (value === null ? [index] : []));
}

/**
 * @param {Array<'X'|'O'|null>} board
 * @param {number} index
 * @param {'X'|'O'} mark
 * @returns {Array<'X'|'O'|null>|null} a new board, or null for an invalid move
 */
function applyMove(board, index, mark) {
  if (!Number.isInteger(index) || index < 0 || index > 8) return null;
  if (board[index] !== null) return null;

  const next = [...board];
  next[index] = mark;
  return next;
}

/**
 * Finds the remaining cell in a line where `mark` already occupies two cells.
 *
 * @param {Array<'X'|'O'|null>} board
 * @param {'X'|'O'} mark
 * @returns {number} the winning cell, or -1
 */
function completingMove(board, mark) {
  for (const line of LINES) {
    const values = line.map((index) => board[index]);
    if (values.filter((value) => value === mark).length === 2 && values.includes(null)) {
      return line[values.indexOf(null)];
    }
  }

  return -1;
}

function pick(moves, random) {
  return moves[Math.min(moves.length - 1, Math.floor(random() * moves.length))];
}

/**
 * A light heuristic opponent: take a win, block a loss, prefer the centre and
 * corners, then choose a remaining cell. It occasionally plays a random move
 * so repeated games are not always identical.
 *
 * @param {Array<'X'|'O'|null>} board
 * @param {() => number} [random]
 * @returns {number}
 */
function chooseBotMove(board, random = Math.random) {
  const moves = availableMoves(board);
  if (moves.length === 0) return -1;

  if (random() < 0.15) return pick(moves, random);

  const win = completingMove(board, BOT);
  if (win !== -1) return win;

  const block = completingMove(board, PLAYER);
  if (block !== -1) return block;

  if (board[4] === null) return 4;

  const oppositeCorners = [
    [0, 8],
    [2, 6],
    [6, 2],
    [8, 0],
  ];

  for (const [corner, opposite] of oppositeCorners) {
    if (board[corner] === PLAYER && board[opposite] === null) return opposite;
  }

  const corners = [0, 2, 6, 8].filter((index) => board[index] === null);
  if (corners.length > 0) return pick(corners, random);

  return pick(moves, random);
}

module.exports = {
  BOT,
  LINES,
  PLAYER,
  applyMove,
  availableMoves,
  chooseBotMove,
  createBoard,
  winnerOf,
};
