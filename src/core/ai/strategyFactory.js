import { DIFFICULTIES } from '../../constants.js';
import { CandidateGenerator } from './candidateGenerator.js';
import { EvaluationService } from './evaluationService.js';
import { MinimaxSearch } from './search/minimaxSearch.js';
import { BeginnerStrategy } from './strategies/beginnerStrategy.js';
import { HardStrategy } from './strategies/hardStrategy.js';
import { HellStrategy } from './strategies/hellStrategy.js';
import { NormalStrategy } from './strategies/normalStrategy.js';

export class StrategyFactory {
  constructor({ ruleEngine, candidateGenerator, evaluationService } = {}) {
    this.ruleEngine = ruleEngine;
    this.candidateGenerator = candidateGenerator ?? new CandidateGenerator();
    this.evaluationService = evaluationService ?? new EvaluationService();
    this.cache = new Map();
  }

  get(difficulty) {
    const level = difficulty ?? DIFFICULTIES.NORMAL;
    if (this.cache.has(level)) {
      return this.cache.get(level);
    }
    const strategy = this.createStrategy(level);
    this.cache.set(level, strategy);
    return strategy;
  }

  createStrategy(difficulty) {
    switch (difficulty) {
      case DIFFICULTIES.BEGINNER:
        return new BeginnerStrategy({
          evaluationService: this.evaluationService,
          candidateGenerator: this.candidateGenerator,
          ruleEngine: this.ruleEngine
        });
      case DIFFICULTIES.HARD:
        return new HardStrategy({
          evaluationService: this.evaluationService,
          candidateGenerator: this.candidateGenerator,
          ruleEngine: this.ruleEngine,
          searchEngine: new MinimaxSearch({
            ruleEngine: this.ruleEngine,
            evaluationService: this.evaluationService,
            candidateGenerator: this.candidateGenerator,
            maxDepth: 3,
            maxCandidates: 14
          })
        });
      case DIFFICULTIES.HELL:
        return new HellStrategy({
          evaluationService: this.evaluationService,
          candidateGenerator: this.candidateGenerator,
          ruleEngine: this.ruleEngine,
          searchEngine: new MinimaxSearch({
            ruleEngine: this.ruleEngine,
            evaluationService: this.evaluationService,
            candidateGenerator: this.candidateGenerator,
            maxDepth: 4,
            maxCandidates: 18
          })
        });
      case DIFFICULTIES.NORMAL:
      default:
        return new NormalStrategy({
          evaluationService: this.evaluationService,
          candidateGenerator: this.candidateGenerator,
          ruleEngine: this.ruleEngine,
          searchEngine: new MinimaxSearch({
            ruleEngine: this.ruleEngine,
            evaluationService: this.evaluationService,
            candidateGenerator: this.candidateGenerator,
            maxDepth: 2,
            maxCandidates: 12
          })
        });
    }
  }
}
