// Seeds Math.random, for the world's headless scripts to import before the world's code runs, so two versions of the
// code that use randomness in the same way get the same numbers, run after run.

let seed = 12345;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
