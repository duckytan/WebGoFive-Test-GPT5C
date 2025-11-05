import { BOARD_SIZE, PLAYER_BLACK, PLAYER_WHITE } from '../../constants.js';

const POSITIONAL_WEIGHT = Array.from({ length: BOARD_SIZE }, (_, y) =>
  Array.from({ length: BOARD_SIZE }, (_, x) => {
    const center = (BOARD_SIZE - 1) / 2;
    const distance = Math.abs(x - center) + Math.abs(y - center);
    return Math.max(0, BOARD_SIZE / 2 - distance);
  })
);

export class CandidateGenerator {
  constructor({ radius = 2 } = {}) {
    this.radius = radius;
    this.lastCandidates = [];
  }

  countNeighbors(state, x, y, radius) {
    let count = 0;
    for (let dy = -radius; dy <= radius; dy += 1) {
      for (let dx = -radius; dx <= radius; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (!state.isInsideBoard(nx, ny)) continue;
        if (state.board[ny][nx] !== 0) {
          count += 1;
        }
      }
    }
    return count;
  }

  calculatePositionalScore(x, y) {
    return POSITIONAL_WEIGHT[y][x];
  }

  generate(state, { player = PLAYER_BLACK, opponent = PLAYER_WHITE } = {}) {
    const candidates = [];
    let hasPieces = false;

    for (let y = 0; y < state.boardSize; y += 1) {
      for (let x = 0; x < state.boardSize; x += 1) {
        const value = state.board[y][x];
        if (value !== 0) {
          hasPieces = true;
          continue;
        }
        const neighbors = this.countNeighbors(state, x, y, this.radius);
        if (!hasPieces) {
          // 初始落子优先中心
          const center = Math.floor(state.boardSize / 2);
          if (x === center && y === center) {
            candidates.push({ x, y, priority: 999 });
          }
          continue;
        }
        if (neighbors === 0) continue;
        const positional = this.calculatePositionalScore(x, y);
        candidates.push({ x, y, priority: neighbors * 10 + positional });
      }
    }

    if (candidates.length === 0) {
      const center = Math.floor(state.boardSize / 2);
      candidates.push({ x: center, y: center, priority: 1 });
    }

    candidates.sort((a, b) => b.priority - a.priority);
    this.lastCandidates = candidates;
    return candidates;
  }

  getLastCandidates() {
    return this.lastCandidates;
  }
}
