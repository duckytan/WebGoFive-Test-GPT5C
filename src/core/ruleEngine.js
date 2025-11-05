import {
  BOARD_SIZE,
  GAME_STATUS,
  PLAYER_BLACK,
  PLAYER_WHITE
} from '../constants.js';
import { createLogger } from '../utils/logger.js';

const DIRECTIONS = [
  { dx: 1, dy: 0, name: 'horizontal' },
  { dx: 0, dy: 1, name: 'vertical' },
  { dx: 1, dy: 1, name: 'diagDown' },
  { dx: 1, dy: -1, name: 'diagUp' }
];

const OPEN_THREE_PATTERNS = [
  /\.xxx\./g,
  /\.xx\.x\./g,
  /\.x\.xx\./g
];

const OPEN_FOUR_PATTERNS = [/\.xxxx\./g];

const CLOSED_FOUR_PATTERNS = [
  /xxx\.x/g,
  /xx\.xx/g,
  /x\.xxx/g,
  /\.xxxx(?=o|#)/g,
  /(?<=o|#)xxxx\./g
];

const countMatches = (line, pattern) => {
  let count = 0;
  let match;
  const regex = new RegExp(pattern, 'g');
  while ((match = regex.exec(line)) !== null) {
    count += 1;
    regex.lastIndex = match.index + 1;
  }
  return count;
};

const countPatternList = (line, patterns) =>
  patterns.reduce((acc, pattern) => acc + countMatches(line, pattern), 0);

const encodeCell = (value, player) => {
  if (value === player) return 'x';
  if (value === 0) return '.';
  return 'o';
};

export class RuleEngine {
  constructor(gameState, { eventBus, logger } = {}) {
    this.state = gameState;
    this.eventBus = eventBus;
    this.logger = logger ?? createLogger('RuleEngine', 'info');
  }

  emit(event, payload) {
    this.eventBus?.emit(event, payload);
  }

  validateMove(x, y, player = this.state.currentPlayer) {
    if (this.state.gameStatus === GAME_STATUS.FINISHED) {
      return { valid: false, error: 'game_finished' };
    }

    if (!this.state.isInsideBoard(x, y)) {
      return { valid: false, error: 'out_of_bounds' };
    }

    if (!this.state.isValidPosition(x, y)) {
      return { valid: false, error: 'position_occupied' };
    }

    let forbiddenInfo = { isForbidden: false };
    if (this.state.settings.forbiddenRules && player === PLAYER_BLACK) {
      forbiddenInfo = this.detectForbidden(x, y, player);
      if (forbiddenInfo.isForbidden) {
        return {
          valid: false,
          error: 'forbidden_move',
          forbiddenInfo
        };
      }
    }

    return { valid: true, forbiddenInfo };
  }

  checkWin(x, y, player) {
    const winLine = [];
    for (const direction of DIRECTIONS) {
      const sequence = this.collectLine(x, y, direction.dx, direction.dy, player);
      if (sequence.length >= 5) {
        winLine.push(...sequence);
      }
    }

    if (winLine.length > 0) {
      const uniqueLine = this.uniqueWinLine(winLine);
      return { isWin: true, winLine: uniqueLine };
    }

    if (this.state.getAvailableMoves().length === 0) {
      return { isWin: false, isDraw: true };
    }

    return { isWin: false };
  }

  detectForbidden(x, y, player = PLAYER_BLACK) {
    const directions = DIRECTIONS.map(direction => ({ ...direction }));
    const openThrees = { total: 0, directions: [] };
    const fours = { total: 0, open: 0, closed: 0, directions: [] };
    let hasLongLine = false;
    const candidate = { x, y, player };

    for (const direction of directions) {
      const signature = this.getLineSignature(x, y, direction.dx, direction.dy, player);
      const openThreeCount = countPatternList(signature, OPEN_THREE_PATTERNS);
      const openFourCount = countPatternList(signature, OPEN_FOUR_PATTERNS);
      const closedFourCount = countPatternList(signature, CLOSED_FOUR_PATTERNS);
      const longLineInfo = this.checkLongLine(x, y, direction, candidate);

      if (openThreeCount > 0) {
        openThrees.total += openThreeCount;
        openThrees.directions.push({ direction: direction.name, count: openThreeCount });
      }

      const directionFourCount = openFourCount + closedFourCount;
      if (directionFourCount > 0) {
        fours.total += directionFourCount;
        fours.open += openFourCount;
        fours.closed += closedFourCount;
        fours.directions.push({
          direction: direction.name,
          open: openFourCount,
          closed: closedFourCount
        });
      }

      if (longLineInfo.hasLongLine) {
        hasLongLine = true;
      }
    }

    if (hasLongLine) {
      return {
        isForbidden: true,
        type: '长连禁手',
        details: {
          openThrees,
          fours,
          longLine: { hasLongLine }
        }
      };
    }

    if (openThrees.total >= 2) {
      return {
        isForbidden: true,
        type: '三三禁手',
        details: {
          openThrees,
          fours,
          longLine: { hasLongLine }
        }
      };
    }

    if (fours.total >= 2 && (fours.open > 0 || fours.closed > 0)) {
      return {
        isForbidden: true,
        type: '四四禁手',
        details: {
          openThrees,
          fours,
          longLine: { hasLongLine }
        }
      };
    }

    return {
      isForbidden: false,
      details: {
        openThrees,
        fours,
        longLine: { hasLongLine }
      }
    };
  }

  collectLine(x, y, dx, dy, player) {
    const result = [{ x, y }];
    let step = 1;
    while (this.getCellValue(x + dx * step, y + dy * step, { x, y, player }) === player) {
      result.push({ x: x + dx * step, y: y + dy * step });
      step += 1;
    }
    step = 1;
    while (this.getCellValue(x - dx * step, y - dy * step, { x, y, player }) === player) {
      result.unshift({ x: x - dx * step, y: y - dy * step });
      step += 1;
    }
    return result.length >= 5 ? result : [];
  }

  uniqueWinLine(winLine) {
    const key = point => `${point.x}-${point.y}`;
    const map = new Map();
    winLine.forEach(point => {
      if (!map.has(key(point))) {
        map.set(key(point), point);
      }
    });
    return Array.from(map.values());
  }

  getLineSignature(x, y, dx, dy, player, range = 5) {
    const tokens = [];
    const size = this.state.boardSize ?? BOARD_SIZE;
    for (let i = -range; i <= range; i += 1) {
      const px = x + dx * i;
      const py = y + dy * i;
      if (px < 0 || px >= size || py < 0 || py >= size) {
        tokens.push('#');
      } else if (px === x && py === y) {
        tokens.push('x');
      } else {
        const value = this.state.board[py][px];
        tokens.push(encodeCell(value, player));
      }
    }
    return tokens.join('');
  }

  checkLongLine(x, y, direction, candidate) {
    let count = 1;
    let step = 1;
    while (
      this.getCellValue(x + direction.dx * step, y + direction.dy * step, candidate) ===
      candidate.player
    ) {
      count += 1;
      step += 1;
    }
    step = 1;
    while (
      this.getCellValue(x - direction.dx * step, y - direction.dy * step, candidate) ===
      candidate.player
    ) {
      count += 1;
      step += 1;
    }
    return { hasLongLine: count >= 6, length: count };
  }

  getCellValue(x, y, candidate) {
    if (x === candidate.x && y === candidate.y) {
      return candidate.player;
    }
    if (!this.state.isInsideBoard(x, y)) {
      return null;
    }
    return this.state.board[y][x];
  }
}

RuleEngine.__moduleInfo = {
  name: 'RuleEngine',
  version: '2.0.0',
  dependencies: ['GameState']
};
