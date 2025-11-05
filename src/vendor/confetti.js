let cachedConfetti = null;

const noop = () => {};

export function getConfetti() {
  if (cachedConfetti) {
    return cachedConfetti;
  }

  if (typeof globalThis !== 'undefined' && typeof globalThis.confetti === 'function') {
    cachedConfetti = globalThis.confetti;
    return cachedConfetti;
  }

  cachedConfetti = noop;
  return cachedConfetti;
}
