import { GAME_STATUS } from '../constants.js';
import { createLogger } from '../utils/logger.js';

export class ReplayService {
  constructor(gameState, ruleEngine, { eventBus, logger } = {}) {
    this.state = gameState;
    this.rules = ruleEngine;
    this.eventBus = eventBus;
    this.logger = logger ?? createLogger('ReplayService', 'info');
    this.moves = [];
    this.pointer = 0;
    this.timer = null;
    this.interval = 800;
  }

  emit(event, payload) {
    this.eventBus?.emit(event, payload);
  }

  loadReplay({ snapshot, moves }) {
    this.stop();
    let history = moves;
    if (snapshot && !history) {
      history = snapshot.moveHistory ?? [];
    }
    this.state.reset();
    this.moves = history ?? [];
    this.pointer = 0;
    this.emit('replay:loaded', { total: this.moves.length });
  }

  play({ interval } = {}) {
    if (this.timer) return;
    this.interval = interval ?? this.interval;
    this.timer = setInterval(() => {
      const hasNext = this.stepForward();
      if (!hasNext) {
        this.stop();
      }
    }, this.interval);
    this.emit('replay:started', { interval: this.interval });
  }

  pause() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
    this.emit('replay:paused', {});
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  stepForward() {
    if (this.pointer >= this.moves.length) {
      return false;
    }
    const move = this.moves[this.pointer];
    this.pointer += 1;
    this.state.applyMove({ x: move.x, y: move.y, player: move.player });
    const winCheck = this.rules.checkWin(move.x, move.y, move.player);
    if (winCheck.isWin) {
      this.state.finishGame({ winner: move.player, reason: 'five_in_row', winLine: winCheck.winLine });
    } else {
      this.state.switchPlayer();
    }
    this.emit('replay:step', { move, pointer: this.pointer });
    return this.pointer < this.moves.length;
  }

  stepBackward() {
    if (this.pointer <= 0) return false;
    this.state.undoMove();
    this.pointer -= 1;
    this.emit('replay:stepBack', { pointer: this.pointer });
    return this.pointer > 0;
  }

  isPlaying() {
    return Boolean(this.timer);
  }
}
