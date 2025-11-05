import { DIFFICULTIES, GAME_MODES, PLAYER_BLACK, PLAYER_WHITE } from '../constants.js';
import { createLogger } from '../utils/logger.js';

const difficultyOptions = Object.values(DIFFICULTIES);
const modeOptions = Object.values(GAME_MODES);

const playerLabel = player => (player === PLAYER_BLACK ? '黑棋' : '白棋');

export class HudPanel {
  constructor(container, { eventBus, logger, callbacks = {} } = {}) {
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    if (!this.container) {
      throw new Error('HUD container not found');
    }
    this.eventBus = eventBus;
    this.logger = logger ?? createLogger('HudPanel', 'info');
    this.callbacks = callbacks;
    this.elements = {};
    this.render();
  }

  render() {
    this.container.classList.add('hud');
    this.container.innerHTML = `
      <div class="hud__status">
        <div class="hud__status-item" id="statusMode"></div>
        <div class="hud__status-item" id="statusPlayer"></div>
        <div class="hud__status-item" id="statusWinner"></div>
      </div>
      <div class="hud__selectors">
        <label class="hud__label">
          模式
          <select id="modeSelect" class="hud__select"></select>
        </label>
        <label class="hud__label">
          黑棋难度
          <select id="blackDifficulty" class="hud__select"></select>
        </label>
        <label class="hud__label">
          白棋难度
          <select id="whiteDifficulty" class="hud__select"></select>
        </label>
      </div>
      <div class="hud__controls">
        <button data-action="new" class="hud__btn">新对局</button>
        <button data-action="undo" class="hud__btn">悔棋</button>
        <button data-action="hint" class="hud__btn">提示</button>
        <button data-action="save" class="hud__btn">保存</button>
        <button data-action="load" class="hud__btn">加载</button>
        <button data-action="replay" class="hud__btn">回放</button>
      </div>
    `;

    this.elements.statusMode = this.container.querySelector('#statusMode');
    this.elements.statusPlayer = this.container.querySelector('#statusPlayer');
    this.elements.statusWinner = this.container.querySelector('#statusWinner');
    this.elements.modeSelect = this.container.querySelector('#modeSelect');
    this.elements.blackDifficulty = this.container.querySelector('#blackDifficulty');
    this.elements.whiteDifficulty = this.container.querySelector('#whiteDifficulty');

    this.populateSelect(this.elements.modeSelect, modeOptions);
    this.populateSelect(this.elements.blackDifficulty, difficultyOptions);
    this.populateSelect(this.elements.whiteDifficulty, difficultyOptions);

    this.container.querySelector('.hud__controls').addEventListener('click', this.handleButtonClick.bind(this));
    this.elements.modeSelect.addEventListener('change', event => {
      this.callbacks.onModeChange?.(event.target.value);
    });
    this.elements.blackDifficulty.addEventListener('change', event => {
      this.callbacks.onDifficultyChange?.({ player: PLAYER_BLACK, difficulty: event.target.value });
    });
    this.elements.whiteDifficulty.addEventListener('change', event => {
      this.callbacks.onDifficultyChange?.({ player: PLAYER_WHITE, difficulty: event.target.value });
    });
  }

  populateSelect(select, options) {
    select.innerHTML = options.map(option => `<option value="${option}">${option}</option>`).join('');
  }

  handleButtonClick(event) {
    const action = event.target.dataset.action;
    if (!action) return;
    switch (action) {
      case 'new':
        this.callbacks.onNewGame?.();
        break;
      case 'undo':
        this.callbacks.onUndo?.();
        break;
      case 'hint':
        this.callbacks.onHint?.();
        break;
      case 'save':
        this.callbacks.onSave?.();
        break;
      case 'load':
        this.callbacks.onLoad?.();
        break;
      case 'replay':
        this.callbacks.onReplay?.();
        break;
      default:
        break;
    }
  }

  update(snapshot, meta = {}) {
    const { mode, currentPlayer, gameStatus, winner } = snapshot;
    this.elements.statusMode.textContent = `模式：${mode}`;
    const playerText = gameStatus === 'finished' ? '对局结束' : `当前：${playerLabel(currentPlayer)}落子`;
    this.elements.statusPlayer.textContent = playerText;

    if (gameStatus === 'finished') {
      this.elements.statusWinner.textContent = winner
        ? `🎉 ${playerLabel(winner)}获胜`
        : '🤝 平局';
    } else {
      this.elements.statusWinner.textContent = '';
    }

    if (meta.updateSelectors) {
      this.elements.modeSelect.value = mode;
      this.elements.blackDifficulty.value = snapshot.settings?.blackAI ?? DIFFICULTIES.NORMAL;
      this.elements.whiteDifficulty.value = snapshot.settings?.whiteAI ?? DIFFICULTIES.NORMAL;
    }
  }
}
