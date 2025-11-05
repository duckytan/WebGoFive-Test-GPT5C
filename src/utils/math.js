export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const sum = values => values.reduce((acc, curr) => acc + curr, 0);
