import { GAME_MODES, GAME_STATUS, PLAYER_BLACK, PLAYER_WHITE } from '../constants.js';
import { createLogger } from '../utils/logger.js';

export class ModeManager {
  constructor(gameState, aiEngine, ruleEngine, { eventBus, logger } = {}) {
    this.state = gameState;
    this.ai = aiEngine;
    this.rules = ruleEngine;
    this.eventBus = eventBus;
    this.logger = logger ?? createLogger('ModeManager', 'info');
    this.currentMode = GAME_MODES.PVP;
    this.aiInFlight = false;
    this.eveAutoPlay = true;
  }

  emit(event, payload) {
    this.eventBus?.emit(event, payload);
  }

  setMode(mode) {
    if (!Object.values(GAME_MODES).includes(mode)) {
      throw new Error(`Unknown mode: ${mode}`);
    }
    this.currentMode = mode;
    this.state.mode = mode;
    this.logger.info(`Mode switched to ${mode}`);
    this.emit('mode:changed', { mode });
  }

  getMode() {
    return this.currentMode;
  }

  async startNewGame({ mode = this.currentMode, firstPlayer = this.state.currentPlayer } = {}) {
    this.setMode(mode);
    this.state.reset({ mode, firstPlayer });
    this.state.startGame({ firstPlayer, mode });
    if (this.shouldTriggerAI()) {
      await this.triggerAIMove();
    }
  }

  async handleMove(x, y, { source = 'human', player: forcedPlayer } = {}) {
    if (this.state.gameStatus === GAME_STATUS.FINISHED) {
      return { success: false, reason: 'game_finished' };
    }

    const player = forcedPlayer ?? this.state.currentPlayer;
    const validation = this.rules.validateMove(x, y, player);
    if (!validation.valid) {
      this.logger.warn(`Invalid move (${x}, ${y}) by player ${player}`, validation);
      this.emit('move:invalid', { x, y, player, ...validation });
      return { success: false, reason: validation.error, forbidden: validation.forbiddenInfo };
    }

    const moveRecord = this.state.applyMove({
      x,
      y,
      player,
      metadata: { forbiddenCheck: validation.forbiddenInfo }
    });

    this.emit('move:completed', { move: moveRecord, source });

    const winCheck = this.rules.checkWin(x, y, player);
    if (winCheck.isWin) {
      this.state.finishGame({ winner: player, reason: 'five_in_row', winLine: winCheck.winLine });
      this.emit('game:winner', { winner: player, winLine: winCheck.winLine });
      return { success: true, finished: true, winner: player };
    }

    if (winCheck.isDraw) {
      this.state.finishGame({ winner: 0, reason: 'draw', winLine: [] });
      this.emit('game:draw', {});
      return { success: true, finished: true, winner: 0 };
    }

    this.state.switchPlayer();

    if (source !== 'ai' && this.shouldTriggerAI()) {
      await this.triggerAIMove();
    }

    return { success: true, finished: false };
  }

  shouldTriggerAI() {
    if (this.state.gameStatus === GAME_STATUS.FINISHED) {
      return false;
    }
    switch (this.currentMode) {
      case GAME_MODES.PVP:
        return false;
      case GAME_MODES.PVE:
        return this.isAIPlayer(this.state.currentPlayer);
      case GAME_MODES.EVE:
        return true;
      default:
        return false;
    }
  }

  isAIPlayer(player) {
    if (this.currentMode === GAME_MODES.PVE) {
      // 默认黑棋为玩家，白棋为 AI，可通过 settings 覆盖
      const { humanPlayer = PLAYER_BLACK } = this.state.settings ?? {};
      return player !== humanPlayer;
    }
    if (this.currentMode === GAME_MODES.EVE) {
      return true;
    }
    return false;
  }

  async triggerAIMove() {
    if (this.aiInFlight) {
      return;
    }
    const player = this.state.currentPlayer;
    this.aiInFlight = true;
    try {
      const result = await this.ai.computeMove(player);
      if (!result) {
        return;
      }
      await this.handleMove(result.x, result.y, { source: 'ai', player });
      if (this.state.gameStatus !== GAME_STATUS.FINISHED && this.shouldTriggerAI()) {
        setTimeout(() => this.triggerAIMove(), 200);
      }
    } finally {
      this.aiInFlight = false;
    }
  }
}
