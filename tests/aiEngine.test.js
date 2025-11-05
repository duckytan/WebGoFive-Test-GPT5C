import { describe, expect, it } from 'vitest';
import { GameState } from '../src/core/gameState.js';
import { RuleEngine } from '../src/core/ruleEngine.js';
import { AIEngine } from '../src/core/ai/aiEngine.js';
import { DIFFICULTIES, PLAYER_BLACK, PLAYER_WHITE } from '../src/constants.js';
import { EventBus } from '../src/utils/eventBus.js';

describe('AIEngine', () => {
  const prepare = () => {
    const eventBus = new EventBus();
    const state = new GameState({ eventBus });
    const rules = new RuleEngine(state, { eventBus });
    const ai = new AIEngine(state, rules, { eventBus });
    return { state, rules, ai };
  };

  it('computes a valid move for beginner difficulty', async () => {
    const { state, ai } = prepare();
    state.applyMove({ x: 7, y: 7, player: PLAYER_BLACK });
    state.switchPlayer();
    state.applyMove({ x: 8, y: 7, player: PLAYER_WHITE });
    state.switchPlayer();
    ai.setDifficulty(PLAYER_BLACK, DIFFICULTIES.BEGINNER);
    const move = await ai.computeMove(PLAYER_BLACK);
    expect(move).toBeTruthy();
    expect(state.isInsideBoard(move.x, move.y)).toBe(true);
  });

  it('supports difficulty switching', async () => {
    const { state, ai } = prepare();
    state.applyMove({ x: 7, y: 7, player: PLAYER_BLACK });
    state.switchPlayer();
    ai.setDifficulty(PLAYER_WHITE, DIFFICULTIES.NORMAL);
    const move = await ai.computeMove(PLAYER_WHITE);
    expect(move).toBeDefined();
    expect(move).toHaveProperty('x');
    expect(move).toHaveProperty('y');
  });
});
