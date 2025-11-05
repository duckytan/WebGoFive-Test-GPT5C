import { positionToNotation } from '../../../utils/notation.js';
import { PLAYER_BLACK, PLAYER_WHITE } from '../../../constants.js';

const defaultThinkTime = difficulty => {
  switch (difficulty) {
    case 'BEGINNER':
      return 150;
    case 'NORMAL':
      return 250;
    case 'HARD':
      return 400;
    case 'HELL':
      return 600;
    default:
      return 200;
  }
};

export class BaseStrategy {
  constructor({
    name,
    difficulty,
    evaluationService,
    candidateGenerator,
    ruleEngine,
    searchEngine,
    maxThinkTime
  }) {
    this.name = name;
    this.difficulty = difficulty;
    this.evaluationService = evaluationService;
    this.candidateGenerator = candidateGenerator;
    this.ruleEngine = ruleEngine;
    this.searchEngine = searchEngine;
    this.maxThinkTime = maxThinkTime ?? defaultThinkTime(difficulty);
    this.lastResult = null;
  }

  async computeMove(state, player) {
    const now = () =>
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    const start = now();
    const move = this.selectMove(state, player);
    const end = now();
    const thinkingTime = end - start;
    const aiScore = move.score ?? null;
    this.lastResult = {
      x: move.x,
      y: move.y,
      score: aiScore,
      thinkingTime,
      notation: positionToNotation(move.x, move.y)
    };
    return this.lastResult;
  }

  selectMove(state, player) {
    throw new Error('selectMove must be implemented by subclasses');
  }

  getLastResult() {
    return this.lastResult;
  }

  opposite(player) {
    return player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK;
  }
}
