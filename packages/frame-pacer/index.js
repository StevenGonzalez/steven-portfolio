// Measures the screen's refresh interval and how long frames take to draw, and works out how many refreshes each frame
// should take. No browser APIs and no dependencies: the caller passes in the timestamps and the frame costs.

/** @param {number[]} values @param {number} p between 0 and 1 */
function percentile(values, p) {
  return values.slice().sort((a, b) => a - b)[Math.floor(values.length * p)];
}

/** @type {import("./index").createFramePacer} */
export function createFramePacer({
  refreshSamples = 30,
  costSamples = 60,
  percentile: share = 0.9,
  handover = 0.5,
} = {}) {
  const gaps = new Array(refreshSamples).fill(1000 / 60);
  const costs = new Array(costSamples).fill(0);
  let last = 0;
  let reported = 0;
  let refresh = 1000 / 60;
  let pace = 1;

  return {
    get refresh() {
      return refresh;
    },
    get pace() {
      return pace;
    },

    tick(now) {
      const gap = now - last;
      last = now;
      // Two callbacks a few milliseconds apart are the browser catching up, not the screen's rate.
      if (gap > 3) {
        gaps.copyWithin(0, 1);
        gaps[gaps.length - 1] = gap;
        refresh = Math.min(...gaps);
      }
    },

    report(ms) {
      costs[reported++ % costs.length] = ms;
      const cost = percentile(costs, share) + handover;
      const need = Math.max(1, Math.ceil(cost / refresh));
      // Slow down at once, but speed up only with room to spare, so the pace never flips between the two.
      if (need > pace || (need < pace && cost < (pace - 1) * refresh * 0.92)) pace = need;
    },

    due(now, lastFrame, maxFps) {
      const step = maxFps ? Math.max(pace, Math.round(1000 / maxFps / refresh)) : pace;
      return now - lastFrame >= (step - 0.5) * refresh;
    },

    restart() {
      costs.fill(0);
    },
  };
}
