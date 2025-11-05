import { BaseStrategy } from './baseStrategy.js';

export class HellStrategy extends BaseStrategy {
  constructor(deps) {
    super({ name: 'HellStrategy', difficulty: 'HELL', ...deps });
  }

  selectMove(state, player) {
    const opponent = this.opposite(player);
    const candidates = this.candidateGenerator.generate(state, { player, opponent }).slice(0, 18);

    const urgent = this.findImmediate(state, player, candidates);
    if (urgent) {
      return urgent;
    }

    let bestCandidate = null;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (const candidate of candidates) {
      state.board[candidate.y][candidate.x] = player;
      const win = this.ruleEngine.checkWin(candidate.x, candidate.y, player);
      if (win.isWin) {
        state.board[candidate.y][candidate.x] = 0;
        return { ...candidate, score: Number.POSITIVE_INFINITY };
      }

      const opponent = this.opposite(player);
      const opponentResult = this.searchEngine.findBestMove(state, opponent);
      const boardScore = this.evaluationService.evaluateBoard(state, player);
      const score = boardScore - (opponentResult.score ?? 0) * 0.5;
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = { ...candidate, score };
      }
      state.board[candidate.y][candidate.x] = 0;
    }

    return bestCandidate ?? candidates[0];
  }

  findImmediate(state, player, candidates) {
    const opponent = this.opposite(player);
    for (const candidate of candidates) {
      state.board[candidate.y][candidate.x] = player;
      const win = this.ruleEngine.checkWin(candidate.x, candidate.y, player);
      state.board[candidate.y][candidate.x] = 0;
      if (win.isWin) {
        return { ...candidate, score: Number.POSITIVE_INFINITY };
      }
    }

    for (const candidate of candidates) {
      state.board[candidate.y][candidate.x] = opponent;
      const win = this.ruleEngine.checkWin(candidate.x, candidate.y, opponent);
      state.board[candidate.y][candidate.x] = 0;
      if (win.isWin) {
        return { ...candidate, score: Number.POSITIVE_INFINITY - 2 };
      }
    }

    return null;
  }
}
