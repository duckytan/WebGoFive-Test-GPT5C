import { BOARD_SIZE } from '../constants.js';

const LETTERS = 'ABCDEFGHIJKLMNO';

export const positionToNotation = (x, y) => {
  if (x < 0 || y < 0 || x >= BOARD_SIZE || y >= BOARD_SIZE) {
    return `${x},${y}`;
  }
  return `${LETTERS[x]}${y + 1}`;
};

export const notationToPosition = notation => {
  const match = notation.match(/^([A-O])(\d{1,2})$/i);
  if (!match) return null;
  const [, col, row] = match;
  const x = LETTERS.indexOf(col.toUpperCase());
  const y = Number(row) - 1;
  if (x === -1 || y < 0 || y >= BOARD_SIZE) return null;
  return { x, y };
};
