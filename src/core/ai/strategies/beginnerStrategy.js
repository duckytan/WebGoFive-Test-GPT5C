import { BaseStrategy } from './baseStrategy.js';

export class BeginnerStrategy extends BaseStrategy {
  constructor(deps) {
    super({ name: 'BeginnerStrategy', difficulty: 'BEGINNER', ...deps });
  }

  selectMove(state, player) {
    const opponent = this.opposite(player);
    const candidates = this.candidateGenerator.generate(state, { player, opponent });
    const shortlist = candidates.slice(0, 12);

    const winningMove = this.findWinningMove(state, player, shortlist);
    if (winningMove) {
      return winningMove;
    }

    const blockingMove = this.findWinningMove(state, opponent, shortlist);
    if (blockingMove) {
      return { ...blockingMove, score: blockingMove.score ?? 900000 };
    }

    if (shortlist.length === 0) {
      return candidates[0];
    }

    const scored = shortlist.map(candidate => {
      const score = this.evaluationService.evaluateMove(state, candidate, player);
      return { ...candidate, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const topBucket = scored.slice(0, Math.max(1, Math.min(3, scored.length)));
    const choice = topBucket[Math.floor(Math.random() * topBucket.length)];
    return choice;
  }

  findWinningMove(state, player, candidates) {
    for (const candidate of candidates) {
      if (!candidate) continue;
      state.board[candidate.y][candidate.x] = player;
      const win = this.ruleEngine.checkWin(candidate.x, candidate.y, player);
      state.board[candidate.y][candidate.x] = 0;
      if (win.isWin) {
        return { ...candidate, score: Number.POSITIVE_INFINITY, winLine: win.winLine };
      }
    }
    return null;
  }
}
