export const BOARD_SIZE = 15;
export const PLAYER_BLACK = 1;
export const PLAYER_WHITE = 2;
export const DEFAULT_SETTINGS = {
  forbiddenRules: true,
  aiDifficulty: 'NORMAL',
  blackAI: 'NORMAL',
  whiteAI: 'NORMAL',
  firstPlayer: PLAYER_BLACK
};

export const GAME_STATUS = {
  READY: 'ready',
  PLAYING: 'playing',
  FINISHED: 'finished'
};

export const GAME_MODES = {
  PVP: 'PvP',
  PVE: 'PvE',
  EVE: 'EvE'
};

export const DIFFICULTIES = {
  BEGINNER: 'BEGINNER',
  NORMAL: 'NORMAL',
  HARD: 'HARD',
  HELL: 'HELL'
};

export const STORAGE_KEYS = {
  AUTO_SAVE: 'gomoku:auto-save',
  SAVES: 'gomoku:saves'
};
