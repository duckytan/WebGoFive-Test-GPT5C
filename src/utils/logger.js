const LEVELS = ['silent', 'error', 'warn', 'info', 'debug'];

class Logger {
  constructor(namespace, level = 'info') {
    this.namespace = namespace;
    this.setLevel(level);
  }

  setLevel(level) {
    if (!LEVELS.includes(level)) {
      throw new Error(`Unknown log level: ${level}`);
    }
    this.level = level;
    this.levelIndex = LEVELS.indexOf(level);
  }

  format(message, data) {
    const time = new Date().toISOString();
    if (data === undefined) {
      return `[${time}] [${this.namespace}] ${message}`;
    }
    return `[${time}] [${this.namespace}] ${message}`;
  }

  error(message, data) {
    if (this.levelIndex < 1) return;
    console.error(this.format(message, data), data ?? '');
  }

  warn(message, data) {
    if (this.levelIndex < 2) return;
    console.warn(this.format(message, data), data ?? '');
  }

  info(message, data) {
    if (this.levelIndex < 3) return;
    console.info(this.format(message, data), data ?? '');
  }

  debug(message, data) {
    if (this.levelIndex < 4) return;
    console.debug(this.format(message, data), data ?? '');
  }
}

export const createLogger = (namespace, level = 'info') =>
  new Logger(namespace, level);

export const globalLogger = createLogger('App');
