import { DIFFICULTIES, GAME_MODES, PLAYER_BLACK, PLAYER_WHITE } from '../constants.js';
import { getConfetti } from '../vendor/confetti.js';
import { createLogger } from '../utils/logger.js';
import { CanvasRenderer } from '../ui/canvasRenderer.js';
import { HudPanel } from '../ui/hudPanel.js';
import { SaveLoadService } from '../services/saveLoadService.js';
import { ReplayService } from '../services/replayService.js';

export class GameController {
  constructor({
    canvasId,
    hudContainer,
    state,
    rules,
    ai,
    modeManager,
    eventBus,
    logger,
    saveLoadService,
    replayService
  }) {
    this.state = state;
    this.rules = rules;
    this.ai = ai;
    this.modeManager = modeManager;
    this.eventBus = eventBus;
    this.logger = logger ?? createLogger('GameController', 'info');
    this.saveLoadService = saveLoadService ?? new SaveLoadService({});
    this.replayService = replayService ?? new ReplayService(this.state, this.rules, { eventBus });
    this.confetti = getConfetti();

    this.renderer = new CanvasRenderer(canvasId, this.state, { eventBus });
    this.hud = new HudPanel(hudContainer, {
      eventBus,
      callbacks: {
        onNewGame: () => this.handleNewGame(),
        onUndo: () => this.handleUndo(),
        onHint: () => this.handleHint(),
        onSave: () => this.handleSave(),
        onLoad: () => this.handleLoad(),
        onReplay: () => this.handleReplay(),
        onModeChange: mode => this.handleModeChange(mode),
        onDifficultyChange: payload => this.handleDifficultyChange(payload)
      }
    });

    this.bindCanvasInteractions();
    this.subscribe();
    this.hud.update(this.state.getSnapshot(), { updateSelectors: true });
  }

  bindCanvasInteractions() {
    this.renderer.canvas.addEventListener('click', event => this.handleCanvasClick(event));
    this.renderer.canvas.addEventListener('mousemove', event => this.handleCanvasHover(event));
    this.renderer.canvas.addEventListener('mouseleave', () => this.renderer.setHoverPosition(null));
  }

  handleCanvasClick(event) {
    const rect = this.renderer.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const grid = this.renderer.screenToGrid(x, y);
    if (!grid) return;
    this.modeManager.handleMove(grid.x, grid.y, { source: 'human' });
  }

  handleCanvasHover(event) {
    const rect = this.renderer.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const grid = this.renderer.screenToGrid(x, y);
    this.renderer.setHoverPosition(grid);
  }

  subscribe() {
    this.eventBus.on('state:changed', ({ state: snapshot }) => {
      this.hud.update(snapshot, { updateSelectors: false });
      this.saveLoadService.autoSave(snapshot);
    });

    this.eventBus.on('move:invalid', payload => {
      if (payload.forbiddenInfo?.isForbidden) {
        this.renderer.showForbidden({ x: payload.x, y: payload.y }, payload.forbiddenInfo);
      }
    });

    this.eventBus.on('game:finished', ({ winner }) => {
      if (winner) {
        this.confetti({ particleCount: 180, spread: 60, origin: { y: 0.4 } });
      }
    });
  }

  async handleNewGame() {
    this.renderer.clearHint();
    await this.modeManager.startNewGame({ mode: this.modeManager.getMode() });
  }

  handleUndo() {
    const last = this.state.lastMove;
    if (!last) return;
    this.state.undoMove();
  }

  async handleHint() {
    const player = this.state.currentPlayer;
    const difficulty = this.ai.getDifficulty?.(player) ?? DIFFICULTIES.NORMAL;
    const strategy = this.ai.strategyFactory.get(difficulty);
    const result = await strategy.computeMove(this.state, player);
    this.renderer.setHintMove({ x: result.x, y: result.y });
    setTimeout(() => this.renderer.clearHint(), 1600);
  }

  handleSave() {
    const name = typeof window !== 'undefined' ? window.prompt('输入存档名称', '') : null;
    const snapshot = this.state.getSnapshot();
    const record = this.saveLoadService.saveSnapshot(name, snapshot);
    this.logger.info('Game saved', record);
  }

  handleLoad() {
    const saves = this.saveLoadService.list();
    if (saves.length === 0) {
      if (typeof window !== 'undefined') {
        window.alert('暂无存档');
      }
      return;
    }
    const options = saves.map((save, index) => `${index + 1}. ${save.name}`).join('\n');
    let selectedIndex = 0;
    if (typeof window !== 'undefined') {
      const input = window.prompt(`选择存档编号:\n${options}`, '1');
      const parsed = Number.parseInt(input ?? '1', 10);
      if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= saves.length) {
        selectedIndex = parsed - 1;
      }
    }
    const record = saves[selectedIndex] ?? saves[0];
    if (!record) return;
    this.state.restoreSnapshot(record.snapshot);
    this.modeManager.setMode(this.state.mode);
    this.hud.update(this.state.getSnapshot(), { updateSelectors: true });
  }

  handleReplay() {
    const moves = this.state.getMoveHistory();
    if (moves.length === 0) return;
    this.replayService.loadReplay({ moves });
    this.replayService.play({ interval: 600 });
  }

  handleModeChange(mode) {
    this.modeManager.setMode(mode);
    this.hud.update(this.state.getSnapshot(), { updateSelectors: true });
  }

  handleDifficultyChange({ player, difficulty }) {
    this.ai.setDifficulty(player, difficulty);
    const settingsKey = player === PLAYER_BLACK ? 'blackAI' : 'whiteAI';
    this.state.updateSettings({ [settingsKey]: difficulty });
    this.hud.update(this.state.getSnapshot(), { updateSelectors: true });
  }
}
