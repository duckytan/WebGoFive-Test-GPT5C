import { BOARD_SIZE, PLAYER_BLACK, PLAYER_WHITE } from '../../constants.js';

const PATTERN_TABLE = [
  { name: 'FIVE', regex: /11111/g, score: 1000000 },
  { name: 'OPEN_FOUR', regex: /011110/g, score: 160000 },
  { name: 'BROKEN_FOUR', regex: /0110110|0101110|0111010/g, score: 55000 },
  {
    name: 'CLOSED_FOUR',
    regex: /211110|011112|10111|11011|11101/g,
    score: 42000
  },
  {
    name: 'OPEN_THREE',
    regex: /0011100|0011010|0101100|0010110|0101110|0110100/g,
    score: 12000
  },
  {
    name: 'CLOSED_THREE',
    regex: /2111100|0011120|0211100|0011102|2111010|0101112|2101110|0111012/g,
    score: 2600
  },
  { name: 'BROKEN_THREE', regex: /010100|001010|010010/g, score: 6200 },
  { name: 'OPEN_TWO', regex: /001100|0010100|0001100/g, score: 600 },
  { name: 'CLOSED_TWO', regex: /201110|011102|201100|001102|200110|011002/g, score: 150 }
];

const POSITIONAL_WEIGHT = Array.from({ length: BOARD_SIZE }, (_, y) =>
  Array.from({ length: BOARD_SIZE }, (_, x) => {
    const center = (BOARD_SIZE - 1) / 2;
    const distance = Math.abs(x - center) + Math.abs(y - center);
    return Math.max(0, BOARD_SIZE / 2 - distance);
  })
);

const encodeCell = (value, player) => {
  if (value === player) return '1';
  if (value === 0) return '0';
  return '2';
};

const opposite = player => (player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK);

const countMatches = (line, regex) => {
  let count = 0;
  let match;
  const pattern = new RegExp(regex, 'g');
  while ((match = pattern.exec(line)) !== null) {
    count += 1;
    pattern.lastIndex = match.index + 1;
  }
  return count;
};

export class EvaluationService {
  constructor() {
    this.patternTable = PATTERN_TABLE;
  }

  getLines(state, player) {
    const lines = [];

    // horizontal
    for (let y = 0; y < state.boardSize; y += 1) {
      let line = '3';
      for (let x = 0; x < state.boardSize; x += 1) {
        line += encodeCell(state.board[y][x], player);
      }
      line += '3';
      lines.push(line);
    }

    // vertical
    for (let x = 0; x < state.boardSize; x += 1) {
      let line = '3';
      for (let y = 0; y < state.boardSize; y += 1) {
        line += encodeCell(state.board[y][x], player);
      }
      line += '3';
      lines.push(line);
    }

    // diag down (\)
    for (let startX = 0; startX < state.boardSize; startX += 1) {
      let line = '3';
      for (let x = startX, y = 0; x < state.boardSize && y < state.boardSize; x += 1, y += 1) {
        line += encodeCell(state.board[y][x], player);
      }
      line += '3';
      if (line.length > 6) {
        lines.push(line);
      }
    }
    for (let startY = 1; startY < state.boardSize; startY += 1) {
      let line = '3';
      for (let x = 0, y = startY; x < state.boardSize && y < state.boardSize; x += 1, y += 1) {
        line += encodeCell(state.board[y][x], player);
      }
      line += '3';
      if (line.length > 6) {
        lines.push(line);
      }
    }

    // diag up (/)
    for (let startX = 0; startX < state.boardSize; startX += 1) {
      let line = '3';
      for (
        let x = startX, y = state.boardSize - 1;
        x < state.boardSize && y >= 0;
        x += 1, y -= 1
      ) {
        line += encodeCell(state.board[y][x], player);
      }
      line += '3';
      if (line.length > 6) {
        lines.push(line);
      }
    }
    for (let startY = state.boardSize - 2; startY >= 0; startY -= 1) {
      let line = '3';
      for (
        let x = 0, y = startY;
        x < state.boardSize && y >= 0;
        x += 1, y -= 1
      ) {
        line += encodeCell(state.board[y][x], player);
      }
      line += '3';
      if (line.length > 6) {
        lines.push(line);
      }
    }

    return lines;
  }

  evaluate(state, player) {
    const counts = new Map();
    let score = 0;
    const lines = this.getLines(state, player);

    for (const line of lines) {
      for (const pattern of this.patternTable) {
        const count = countMatches(line, pattern.regex);
        if (!counts.has(pattern.name)) {
          counts.set(pattern.name, 0);
        }
        if (count > 0) {
          counts.set(pattern.name, counts.get(pattern.name) + count);
          score += count * pattern.score;
        }
      }
    }

    score += this.positionalScore(state, player);

    // 组合加分
    const openFour = counts.get('OPEN_FOUR') ?? 0;
    const closedFour = counts.get('CLOSED_FOUR') ?? 0;
    const openThree = counts.get('OPEN_THREE') ?? 0;
    const brokenThree = counts.get('BROKEN_THREE') ?? 0;

    if (openFour >= 2) {
      score += 420000;
    }
    if (closedFour >= 2) {
      score += 200000;
    }
    if (openFour >= 1 && openThree >= 1) {
      score += 120000;
    }
    if (openThree >= 2) {
      score += 36000;
    }
    if (openThree >= 1 && brokenThree >= 1) {
      score += 18000;
    }

    return score;
  }

  positionalScore(state, player) {
    let score = 0;
    for (let y = 0; y < state.boardSize; y += 1) {
      for (let x = 0; x < state.boardSize; x += 1) {
        if (state.board[y][x] === player) {
          score += POSITIONAL_WEIGHT[y][x];
        }
      }
    }
    return score;
  }

  evaluateBoard(state, player) {
    const selfScore = this.evaluate(state, player);
    const opponentScore = this.evaluate(state, opposite(player));
    return selfScore - opponentScore * 0.9;
  }

  evaluateMove(state, move, player) {
    const { x, y } = move;
    state.board[y][x] = player;
    const score = this.evaluateBoard(state, player);
    state.board[y][x] = 0;
    return score;
  }
}
