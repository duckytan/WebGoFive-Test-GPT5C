import { DIFFICULTIES, PLAYER_BLACK, PLAYER_WHITE } from '../../constants.js';
import { createLogger } from '../../utils/logger.js';
import { CandidateGenerator } from './candidateGenerator.js';
import { EvaluationService } from './evaluationService.js';
import { StrategyFactory } from './strategyFactory.js';

const DEFAULT_DIFFICULTY = {
  [PLAYER_BLACK]: DIFFICULTIES.NORMAL,
  [PLAYER_WHITE]: DIFFICULTIES.NORMAL
};

export class AIEngine {
  constructor(gameState, ruleEngine, { eventBus, logger, strategyFactory } = {}) {
    this.state = gameState;
    this.rules = ruleEngine;
    this.eventBus = eventBus;
    this.logger = logger ?? createLogger('AIEngine', 'info');
    this.candidateGenerator = new CandidateGenerator({ radius: 2 });
    this.evaluationService = new EvaluationService();
    this.strategyFactory =
      strategyFactory ??
      new StrategyFactory({
        ruleEngine: this.rules,
        candidateGenerator: this.candidateGenerator,
        evaluationService: this.evaluationService
      });
    this.currentDifficulty = { ...DEFAULT_DIFFICULTY };
    this.lastMoveMeta = null;
  }

  emit(event, payload) {
    this.eventBus?.emit(event, payload);
  }

  setDifficulty(player, difficulty) {
    const normalized = difficulty ?? DIFFICULTIES.NORMAL;
    this.currentDifficulty[player] = normalized;
    this.emit('ai:difficultyChanged', { player, difficulty: normalized });
  }

  getDifficulty(player) {
    return this.currentDifficulty[player] ?? DIFFICULTIES.NORMAL;
  }

  async computeMove(player) {
    const difficulty = this.getDifficulty(player);
    const strategy = this.strategyFactory.get(difficulty);
    this.logger.info(`AI thinking (${difficulty}) for player ${player}`);
    this.emit('ai:thinking', { player, difficulty });
    const result = await strategy.computeMove(this.state, player);
    this.lastMoveMeta = {
      ...result,
      difficulty,
      timestamp: Date.now()
    };
    this.emit('ai:moved', { player, result: this.lastMoveMeta });
    return result;
  }

  getLastResult() {
    return this.lastMoveMeta;
  }

  getLastCandidates() {
    return this.candidateGenerator.getLastCandidates();
  }
}
