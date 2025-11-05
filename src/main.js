import './styles/main.css';
import { GAME_MODES, PLAYER_BLACK } from './constants.js';
import { GameState } from './core/gameState.js';
import { RuleEngine } from './core/ruleEngine.js';
import { AIEngine } from './core/ai/aiEngine.js';
import { ModeManager } from './application/modeManager.js';
import { GameController } from './application/gameController.js';
import { globalEventBus } from './utils/eventBus.js';
import { createLogger } from './utils/logger.js';

const logger = createLogger('App', 'info');

function bootstrap() {
  const appContainer = document.getElementById('app');
  if (!appContainer) {
    throw new Error('App container not found');
  }

  appContainer.innerHTML = `
    <div class="canvas-wrapper">
      <canvas id="gobangCanvas" width="720" height="720"></canvas>
    </div>
    <div id="hudPanel"></div>
  `;

  const state = new GameState({ eventBus: globalEventBus, logger: createLogger('GameState', 'info') });
  const rules = new RuleEngine(state, { eventBus: globalEventBus });
  const ai = new AIEngine(state, rules, { eventBus: globalEventBus });
  const modeManager = new ModeManager(state, ai, rules, { eventBus: globalEventBus });

  const controller = new GameController({
    canvasId: 'gobangCanvas',
    hudContainer: '#hudPanel',
    state,
    rules,
    ai,
    modeManager,
    eventBus: globalEventBus
  });

  modeManager.startNewGame({ mode: GAME_MODES.PVP, firstPlayer: PLAYER_BLACK });

  if (typeof window !== 'undefined') {
    window.GomokuApp = { state, rules, ai, modeManager, controller, eventBus: globalEventBus };
    window.GomokuDebug = {
      logBoard() {
        console.table(state.board);
      },
      logCandidates() {
        console.table(ai.getLastCandidates());
      },
      async testForbidden(x, y) {
        const result = rules.detectForbidden(x, y, PLAYER_BLACK);
        console.info('Forbidden check', result);
      }
    };
  }

  logger.info('Gomoku app ready');
}

document.addEventListener('DOMContentLoaded', bootstrap);
