import { describe, expect, it } from 'vitest';
import { GameState } from '../src/core/gameState.js';
import { PLAYER_BLACK, PLAYER_WHITE, GAME_STATUS } from '../src/constants.js';
import { EventBus } from '../src/utils/eventBus.js';

describe('GameState', () => {
  const createState = () => new GameState({ eventBus: new EventBus() });

  it('initializes with empty board and default settings', () => {
    const state = createState();
    expect(state.board.length).toBe(15);
    expect(state.board[0].length).toBe(15);
    expect(state.currentPlayer).toBe(PLAYER_BLACK);
    expect(state.gameStatus).toBe(GAME_STATUS.READY);
    expect(state.moveHistory).toHaveLength(0);
  });

  it('applies and undoes moves correctly', () => {
    const state = createState();
    const move = state.applyMove({ x: 7, y: 7, player: PLAYER_BLACK });
    expect(state.board[7][7]).toBe(PLAYER_BLACK);
    expect(state.moveHistory).toHaveLength(1);
    expect(move.step).toBe(1);
    state.switchPlayer();
    expect(state.currentPlayer).toBe(PLAYER_WHITE);

    const undone = state.undoMove();
    expect(undone.x).toBe(7);
    expect(state.board[7][7]).toBe(0);
    expect(state.moveHistory).toHaveLength(0);
    expect(state.gameStatus).toBe(GAME_STATUS.READY);
    expect(state.currentPlayer).toBe(PLAYER_BLACK);
  });

  it('creates and restores snapshots', () => {
    const state = createState();
    state.applyMove({ x: 5, y: 5, player: PLAYER_BLACK });
    state.switchPlayer();
    state.applyMove({ x: 6, y: 5, player: PLAYER_WHITE });
    const snapshot = state.getSnapshot();
    expect(snapshot.moveHistory).toHaveLength(2);

    const restored = createState();
    restored.restoreSnapshot(snapshot);
    expect(restored.board[5][5]).toBe(PLAYER_BLACK);
    expect(restored.board[5][6]).toBe(PLAYER_WHITE);
    expect(restored.moveHistory).toHaveLength(2);
  });
});
