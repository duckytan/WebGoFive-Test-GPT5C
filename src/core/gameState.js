import {
  BOARD_SIZE,
  DEFAULT_SETTINGS,
  DIFFICULTIES,
  GAME_MODES,
  GAME_STATUS,
  PLAYER_BLACK,
  PLAYER_WHITE
} from '../constants.js';
import { deepClone } from '../utils/deepClone.js';
import { createLogger } from '../utils/logger.js';

const createBoard = size =>
  Array.from({ length: size }, () => Array.from({ length: size }, () => 0));

export class GameState {
  constructor({ boardSize = BOARD_SIZE, eventBus, logger } = {}) {
    this.eventBus = eventBus;
    this.logger = logger ?? createLogger('GameState', 'info');
    this.boardSize = boardSize;
    this.settings = { ...DEFAULT_SETTINGS };
    this.mode = GAME_MODES.PVP;
    this.reset();
  }

  emit(event, payload) {
    this.eventBus?.emit(event, payload);
  }

  emitState() {
    this.emit('state:changed', { state: this.getSnapshot() });
  }

  reset({
    boardSize = this.boardSize,
    mode = this.mode,
    settings,
    firstPlayer
  } = {}) {
    this.boardSize = boardSize;
    this.board = createBoard(boardSize);
    this.currentPlayer = firstPlayer ?? this.settings.firstPlayer ?? PLAYER_BLACK;
    this.moveHistory = [];
    this.gameStatus = GAME_STATUS.READY;
    this.mode = mode;
    this.winner = null;
    this.winReason = null;
    this.winLine = [];
    this.startTime = null;
    this.endTime = null;
    this.lastMove = null;
    this.lastPlayer = null;
    if (settings) {
      this.settings = {
        ...DEFAULT_SETTINGS,
        ...this.settings,
        ...settings
      };
    }
    this.emit('game:reset', { mode: this.mode, settings: this.settings });
    this.emitState();
  }

  startGame({ firstPlayer = this.currentPlayer, mode = this.mode } = {}) {
    this.currentPlayer = firstPlayer;
    this.mode = mode;
    this.gameStatus = GAME_STATUS.PLAYING;
    this.startTime = Date.now();
    this.emit('game:started', {
      mode: this.mode,
      settings: this.settings,
      firstPlayer: this.currentPlayer
    });
    this.emitState();
  }

  finishGame({ winner, reason, winLine = [] }) {
    this.gameStatus = GAME_STATUS.FINISHED;
    this.winner = winner;
    this.winReason = reason;
    this.winLine = winLine;
    this.endTime = Date.now();
    this.emit('game:finished', {
      winner,
      reason,
      winLine,
      duration: this.startTime ? (this.endTime - this.startTime) / 1000 : null
    });
    this.emitState();
  }

  isInsideBoard(x, y) {
    return x >= 0 && x < this.boardSize && y >= 0 && y < this.boardSize;
  }

  isValidPosition(x, y) {
    return this.isInsideBoard(x, y) && this.board[y][x] === 0;
  }

  applyMove({ x, y, player = this.currentPlayer, metadata = {} }) {
    if (!this.isInsideBoard(x, y)) {
      throw new Error(`Position (${x}, ${y}) is out of bounds`);
    }
    if (this.board[y][x] !== 0) {
      throw new Error(`Position (${x}, ${y}) already taken`);
    }
    if (this.gameStatus === GAME_STATUS.FINISHED) {
      throw new Error('Cannot apply move after game is finished');
    }

    const newBoard = this.board.map(row => [...row]);
    newBoard[y][x] = player;
    this.board = newBoard;

    const moveRecord = {
      step: this.moveHistory.length + 1,
      player,
      x,
      y,
      timestamp: metadata.timestamp ?? Date.now(),
      aiScore: metadata.aiScore ?? null,
      forbiddenCheck: metadata.forbiddenCheck ?? null
    };

    this.moveHistory = [...this.moveHistory, moveRecord];
    this.lastMove = moveRecord;
    this.lastPlayer = player;
    if (!this.startTime) {
      this.startTime = Date.now();
    }
    this.gameStatus = GAME_STATUS.PLAYING;

    this.emit('move:applied', { move: moveRecord });
    this.emitState();
    return moveRecord;
  }

  undoMove() {
    if (this.moveHistory.length === 0) {
      return null;
    }
    const move = this.moveHistory[this.moveHistory.length - 1];
    const newBoard = this.board.map(row => [...row]);
    newBoard[move.y][move.x] = 0;
    this.board = newBoard;
    this.moveHistory = this.moveHistory.slice(0, -1);
    this.currentPlayer = move.player;
    this.lastMove = this.moveHistory[this.moveHistory.length - 1] ?? null;
    this.lastPlayer = this.lastMove ? this.lastMove.player : null;
    this.gameStatus = this.moveHistory.length === 0 ? GAME_STATUS.READY : GAME_STATUS.PLAYING;
    this.winner = null;
    this.winReason = null;
    this.winLine = [];
    this.emit('move:undone', { move });
    this.emitState();
    return move;
  }

  switchPlayer() {
    this.currentPlayer = this.currentPlayer === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
    this.emit('player:switched', { currentPlayer: this.currentPlayer });
    this.emitState();
    return this.currentPlayer;
  }

  getPiece(x, y) {
    if (!this.isInsideBoard(x, y)) return null;
    return this.board[y][x];
  }

  setPiece(x, y, player) {
    if (!this.isInsideBoard(x, y)) {
      throw new Error('Invalid position');
    }
    const newBoard = this.board.map(row => [...row]);
    newBoard[y][x] = player;
    this.board = newBoard;
    this.emitState();
  }

  updateSettings(partial) {
    this.settings = {
      ...this.settings,
      ...partial
    };
    if (partial.firstPlayer) {
      this.currentPlayer = partial.firstPlayer;
    }
    this.emit('settings:updated', { settings: this.settings });
    this.emitState();
  }

  getSnapshot() {
    return {
      boardSize: this.boardSize,
      board: deepClone(this.board),
      currentPlayer: this.currentPlayer,
      moveHistory: deepClone(this.moveHistory),
      mode: this.mode,
      settings: deepClone(this.settings),
      gameStatus: this.gameStatus,
      winner: this.winner,
      winReason: this.winReason,
      winLine: deepClone(this.winLine),
      startTime: this.startTime,
      endTime: this.endTime
    };
  }

  restoreSnapshot(snapshot) {
    const {
      boardSize,
      board,
      currentPlayer,
      moveHistory,
      mode,
      settings,
      gameStatus,
      winner,
      winReason,
      winLine,
      startTime,
      endTime
    } = snapshot;
    this.boardSize = boardSize ?? this.boardSize;
    this.board = deepClone(board ?? this.board);
    this.currentPlayer = currentPlayer ?? this.currentPlayer;
    this.moveHistory = deepClone(moveHistory ?? this.moveHistory);
    this.mode = mode ?? this.mode;
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...this.settings,
      ...deepClone(settings ?? {})
    };
    this.gameStatus = gameStatus ?? GAME_STATUS.READY;
    this.winner = winner ?? null;
    this.winReason = winReason ?? null;
    this.winLine = deepClone(winLine ?? []);
    this.startTime = startTime ?? null;
    this.endTime = endTime ?? null;
    this.lastMove = this.moveHistory[this.moveHistory.length - 1] ?? null;
    this.lastPlayer = this.lastMove ? this.lastMove.player : null;
    this.emit('state:restored', { snapshot: this.getSnapshot() });
    this.emitState();
  }

  getAvailableMoves() {
    const moves = [];
    for (let y = 0; y < this.boardSize; y += 1) {
      for (let x = 0; x < this.boardSize; x += 1) {
        if (this.board[y][x] === 0) {
          moves.push({ x, y });
        }
      }
    }
    return moves;
  }

  getMoveHistory() {
    return deepClone(this.moveHistory);
  }

  getSettings() {
    return { ...this.settings };
  }

  getCurrentDifficulty(player) {
    const key = player === PLAYER_BLACK ? 'blackAI' : 'whiteAI';
    return this.settings[key] ?? DIFFICULTIES.NORMAL;
  }
}

GameState.__moduleInfo = {
  name: 'GameState',
  version: '2.0.0',
  dependencies: []
};
