import { BaseStrategy } from './baseStrategy.js';

export class NormalStrategy extends BaseStrategy {
  constructor(deps) {
    super({ name: 'NormalStrategy', difficulty: 'NORMAL', ...deps });
  }

  selectMove(state, player) {
    const searchResult = this.searchEngine.findBestMove(state, player);
    if (searchResult.move) {
      return {
        ...searchResult.move,
        score: searchResult.score
      };
    }

    const fallback = this.candidateGenerator.generate(state, {
      player,
      opponent: this.opposite(player)
    })[0];
    return fallback ?? { x: Math.floor(state.boardSize / 2), y: Math.floor(state.boardSize / 2), score: 0 };
  }
}
