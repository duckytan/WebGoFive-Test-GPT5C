import { PLAYER_BLACK, PLAYER_WHITE } from '../../../constants.js';

const POSITIVE_INFINITY = Number.POSITIVE_INFINITY;
const NEGATIVE_INFINITY = Number.NEGATIVE_INFINITY;

const opponentOf = player => (player === PLAYER_BLACK ? PLAYER_WHITE : PLAYER_BLACK);

export class MinimaxSearch {
  constructor({ ruleEngine, evaluationService, candidateGenerator, maxDepth = 2, maxCandidates = 12 }) {
    this.ruleEngine = ruleEngine;
    this.evaluationService = evaluationService;
    this.candidateGenerator = candidateGenerator;
    this.maxDepth = maxDepth;
    this.maxCandidates = maxCandidates;
    this.nodesEvaluated = 0;
  }

  findBestMove(state, player) {
    this.nodesEvaluated = 0;
    const { score, move } = this.minimax(state, player, player, this.maxDepth, NEGATIVE_INFINITY, POSITIVE_INFINITY, true);
    return { score, move, nodesEvaluated: this.nodesEvaluated };
  }

  minimax(state, playerToMove, rootPlayer, depth, alpha, beta, maximizing) {
    this.nodesEvaluated += 1;

    if (depth === 0) {
      const score = this.evaluationService.evaluateBoard(state, rootPlayer);
      return { score };
    }

    const candidates = this.candidateGenerator.generate(state, {
      player: playerToMove,
      opponent: opponentOf(playerToMove)
    });

    const limitedCandidates = candidates.slice(0, this.maxCandidates);

    if (limitedCandidates.length === 0) {
      const score = this.evaluationService.evaluateBoard(state, rootPlayer);
      return { score };
    }

    let bestScore = maximizing ? NEGATIVE_INFINITY : POSITIVE_INFINITY;
    let bestMove = null;

    for (const candidate of limitedCandidates) {
      const validation = this.ruleEngine.validateMove(candidate.x, candidate.y, playerToMove);
      if (!validation.valid) {
        continue;
      }

      state.board[candidate.y][candidate.x] = playerToMove;

      const winCheck = this.ruleEngine.checkWin(candidate.x, candidate.y, playerToMove);
      let nodeScore;
      if (winCheck.isWin) {
        nodeScore = maximizing ? POSITIVE_INFINITY : NEGATIVE_INFINITY;
      } else {
        nodeScore = this.minimax(
          state,
          opponentOf(playerToMove),
          rootPlayer,
          depth - 1,
          alpha,
          beta,
          !maximizing
        ).score;
      }

      state.board[candidate.y][candidate.x] = 0;

      if (maximizing) {
        if (nodeScore > bestScore) {
          bestScore = nodeScore;
          bestMove = candidate;
        }
        alpha = Math.max(alpha, bestScore);
        if (beta <= alpha) {
          break;
        }
      } else {
        if (nodeScore < bestScore) {
          bestScore = nodeScore;
          bestMove = candidate;
        }
        beta = Math.min(beta, bestScore);
        if (beta <= alpha) {
          break;
        }
      }
    }

    if (!bestMove && limitedCandidates.length > 0) {
      bestMove = limitedCandidates[0];
    }

    return { score: bestScore, move: bestMove };
  }
}
