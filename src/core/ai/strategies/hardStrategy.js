import { BaseStrategy } from './baseStrategy.js';

export class HardStrategy extends BaseStrategy {
  constructor(deps) {
    super({ name: 'HardStrategy', difficulty: 'HARD', ...deps });
  }

  selectMove(state, player) {
    const opponent = this.opposite(player);
    const candidates = this.candidateGenerator.generate(state, { player, opponent }).slice(0, 16);

    const urgentMove = this.findUrgentMove(state, player, candidates);
    if (urgentMove) {
      return urgentMove;
    }

    const result = this.searchEngine.findBestMove(state, player);
    if (result.move) {
      return { ...result.move, score: result.score };
    }

    return candidates[0] ?? { x: Math.floor(state.boardSize / 2), y: Math.floor(state.boardSize / 2), score: 0 };
  }

  findUrgentMove(state, player, candidates) {
    for (const candidate of candidates) {
      state.board[candidate.y][candidate.x] = player;
      const win = this.ruleEngine.checkWin(candidate.x, candidate.y, player);
      state.board[candidate.y][candidate.x] = 0;
      if (win.isWin) {
        return { ...candidate, score: Number.POSITIVE_INFINITY };
      }
    }

    const opponent = this.opposite(player);
    for (const candidate of candidates) {
      state.board[candidate.y][candidate.x] = opponent;
      const win = this.ruleEngine.checkWin(candidate.x, candidate.y, opponent);
      state.board[candidate.y][candidate.x] = 0;
      if (win.isWin) {
        return { ...candidate, score: Number.POSITIVE_INFINITY - 1 };
      }
    }

    return null;
  }
}
