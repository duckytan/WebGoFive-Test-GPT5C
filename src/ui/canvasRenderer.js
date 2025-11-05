import { BOARD_SIZE, PLAYER_BLACK, PLAYER_WHITE } from '../constants.js';
import { createLogger } from '../utils/logger.js';

const DEFAULT_THEME = {
  background: '#f3d9b1',
  gridColor: '#9c7c4d',
  starPointColor: '#4a3426',
  lastMoveHighlight: '#ff7b54',
  winLineColor: '#10b981',
  hintColor: '#22d3ee',
  forbiddenColor: '#ef4444'
};

export class CanvasRenderer {
  constructor(canvasElement, gameState, { eventBus, logger, theme } = {}) {
    this.canvas = typeof canvasElement === 'string' ? document.getElementById(canvasElement) : canvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }
    this.ctx = this.canvas.getContext('2d');
    this.state = gameState;
    this.eventBus = eventBus;
    this.logger = logger ?? createLogger('CanvasRenderer', 'info');
    this.theme = { ...DEFAULT_THEME, ...(theme ?? {}) };
    this.cellSize = 36;
    this.padding = 30;
    this.pieceRadius = 15;
    this.lineWidth = 1;
    this.hoverPosition = null;
    this.hintMove = null;
    this.forbiddenHighlight = null;
    this.animationFrame = null;
    this.resizeObserver = null;
    this.handleStateChanged = this.handleStateChanged.bind(this);
    this.handleResize = this.handleResize.bind(this);

    this.subscribe();
    this.handleResize();
    this.render();
  }

  subscribe() {
    this.eventBus?.on('state:changed', this.handleStateChanged);
    window.addEventListener('resize', this.handleResize);
    if ('ResizeObserver' in window) {
      this.resizeObserver = new ResizeObserver(this.handleResize);
      this.resizeObserver.observe(this.canvas);
    }
  }

  unsubscribe() {
    this.eventBus?.off('state:changed', this.handleStateChanged);
    window.removeEventListener('resize', this.handleResize);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }

  handleStateChanged() {
    this.scheduleRender();
  }

  handleResize() {
    const size = Math.min(window.innerWidth, window.innerHeight) - 40;
    const dimension = Math.max(size, 500);
    this.canvas.width = dimension;
    this.canvas.height = dimension;
    const available = dimension - this.padding * 2;
    this.cellSize = available / (this.state.boardSize - 1);
    this.pieceRadius = Math.max(12, this.cellSize * 0.42);
    this.scheduleRender();
  }

  scheduleRender() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.animationFrame = requestAnimationFrame(() => this.render());
  }

  render() {
    this.animationFrame = null;
    const ctx = this.ctx;
    ctx.save();
    this.clearCanvas();
    this.drawBoard();
    this.drawStarPoints();
    this.drawPieces();
    this.drawHighlights();
    this.drawHint();
    ctx.restore();
  }

  clearCanvas() {
    this.ctx.fillStyle = this.theme.background;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawBoard() {
    const ctx = this.ctx;
    ctx.strokeStyle = this.theme.gridColor;
    ctx.lineWidth = this.lineWidth;
    for (let i = 0; i < this.state.boardSize; i += 1) {
      const offset = this.padding + i * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(this.padding, offset);
      ctx.lineTo(this.canvas.width - this.padding, offset);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(offset, this.padding);
      ctx.lineTo(offset, this.canvas.height - this.padding);
      ctx.stroke();
    }
  }

  drawStarPoints() {
    const ctx = this.ctx;
    const size = this.state.boardSize;
    const starPoints = size === 15 ? [3, 7, 11] : [Math.floor(size / 2)];
    ctx.fillStyle = this.theme.starPointColor;
    starPoints.forEach(i => {
      starPoints.forEach(j => {
        const { x, y } = this.gridToScreen(i, j);
        ctx.beginPath();
        ctx.arc(x, y, 4.5, 0, Math.PI * 2, false);
        ctx.fill();
      });
    });
  }

  drawPieces() {
    const ctx = this.ctx;
    for (let y = 0; y < this.state.boardSize; y += 1) {
      for (let x = 0; x < this.state.boardSize; x += 1) {
        const value = this.state.board[y][x];
        if (value === 0) continue;
        const { x: cx, y: cy } = this.gridToScreen(x, y);
        const gradient = ctx.createRadialGradient(
          cx - this.cellSize * 0.05,
          cy - this.cellSize * 0.05,
          this.pieceRadius * 0.2,
          cx,
          cy,
          this.pieceRadius
        );
        if (value === PLAYER_BLACK) {
          gradient.addColorStop(0, '#666');
          gradient.addColorStop(1, '#111');
        } else {
          gradient.addColorStop(0, '#fff');
          gradient.addColorStop(1, '#d7d7d7');
        }
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, this.pieceRadius, 0, Math.PI * 2, false);
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.15)';
        ctx.stroke();
      }
    }
  }

  drawHighlights() {
    if (!this.state.lastMove) return;
    const ctx = this.ctx;
    const { x, y } = this.state.lastMove;
    const { x: cx, y: cy } = this.gridToScreen(x, y);
    ctx.save();
    ctx.strokeStyle = this.theme.lastMoveHighlight;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx, cy, this.pieceRadius + 4, 0, Math.PI * 2, false);
    ctx.stroke();
    ctx.restore();

    if (this.state.winLine && this.state.winLine.length > 0) {
      ctx.save();
      ctx.strokeStyle = this.theme.winLineColor;
      ctx.lineWidth = 5;
      ctx.globalAlpha = 0.6;
      ctx.beginPath();
      this.state.winLine.forEach((point, index) => {
        const pos = this.gridToScreen(point.x, point.y);
        if (index === 0) {
          ctx.moveTo(pos.x, pos.y);
        } else {
          ctx.lineTo(pos.x, pos.y);
        }
      });
      ctx.stroke();
      ctx.restore();
    }

    if (this.forbiddenHighlight) {
      const { position } = this.forbiddenHighlight;
      const { x: fx, y: fy } = this.gridToScreen(position.x, position.y);
      ctx.save();
      ctx.strokeStyle = this.theme.forbiddenColor;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.arc(fx, fy, this.pieceRadius + 6, 0, Math.PI * 2, false);
      ctx.stroke();
      ctx.restore();
    }
  }

  drawHint() {
    if (!this.hintMove) return;
    const ctx = this.ctx;
    const { x, y } = this.gridToScreen(this.hintMove.x, this.hintMove.y);
    ctx.save();
    ctx.strokeStyle = this.theme.hintColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 12, y);
    ctx.lineTo(x + 12, y);
    ctx.moveTo(x, y - 12);
    ctx.lineTo(x, y + 12);
    ctx.stroke();
    ctx.restore();
  }

  gridToScreen(gridX, gridY) {
    return {
      x: this.padding + gridX * this.cellSize,
      y: this.padding + gridY * this.cellSize
    };
  }

  screenToGrid(screenX, screenY) {
    const x = Math.round((screenX - this.padding) / this.cellSize);
    const y = Math.round((screenY - this.padding) / this.cellSize);
    if (!this.state.isInsideBoard(x, y)) {
      return null;
    }
    return { x, y };
  }

  setHoverPosition(position) {
    this.hoverPosition = position;
    this.scheduleRender();
  }

  setHintMove(move) {
    this.hintMove = move;
    this.scheduleRender();
  }

  clearHint() {
    this.hintMove = null;
    this.scheduleRender();
  }

  showForbidden(position, info) {
    this.forbiddenHighlight = { position, info, timestamp: Date.now() };
    this.scheduleRender();
    setTimeout(() => {
      if (this.forbiddenHighlight && this.forbiddenHighlight.position === position) {
        this.forbiddenHighlight = null;
        this.scheduleRender();
      }
    }, 1800);
  }

  destroy() {
    this.unsubscribe();
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }
}
