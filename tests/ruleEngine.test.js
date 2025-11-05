import { describe, expect, it } from 'vitest';
import { GameState } from '../src/core/gameState.js';
import { RuleEngine } from '../src/core/ruleEngine.js';
import { PLAYER_BLACK, PLAYER_WHITE } from '../src/constants.js';
import { EventBus } from '../src/utils/eventBus.js';

const create = () => {
  const state = new GameState({ eventBus: new EventBus() });
  const rules = new RuleEngine(state);
  return { state, rules };
};

describe('RuleEngine', () => {
  it('validates basic moves', () => {
    const { state, rules } = create();
    const validation = rules.validateMove(7, 7, PLAYER_BLACK);
    expect(validation.valid).toBe(true);
    state.applyMove({ x: 7, y: 7, player: PLAYER_BLACK });
    const occupied = rules.validateMove(7, 7, PLAYER_WHITE);
    expect(occupied.valid).toBe(false);
    expect(occupied.error).toBe('position_occupied');
  });

  it('detects horizontal win', () => {
    const { state, rules } = create();
    state.setPiece(4, 7, PLAYER_BLACK);
    state.setPiece(5, 7, PLAYER_BLACK);
    state.setPiece(6, 7, PLAYER_BLACK);
    state.setPiece(7, 7, PLAYER_BLACK);
    const validation = rules.validateMove(8, 7, PLAYER_BLACK);
    expect(validation.valid).toBe(true);
    state.applyMove({ x: 8, y: 7, player: PLAYER_BLACK });
    const win = rules.checkWin(8, 7, PLAYER_BLACK);
    expect(win.isWin).toBe(true);
    expect(win.winLine.length).toBeGreaterThanOrEqual(5);
  });

  it('flags long line forbidden move for black', () => {
    const { state, rules } = create();
    state.settings.forbiddenRules = true;
    state.setPiece(0, 5, PLAYER_BLACK);
    state.setPiece(1, 5, PLAYER_BLACK);
    state.setPiece(2, 5, PLAYER_BLACK);
    state.setPiece(3, 5, PLAYER_BLACK);
    state.setPiece(4, 5, PLAYER_BLACK);
    const forbidden = rules.detectForbidden(5, 5, PLAYER_BLACK);
    expect(forbidden.isForbidden).toBe(true);
    expect(forbidden.type).toBe('长连禁手');
  });
});
