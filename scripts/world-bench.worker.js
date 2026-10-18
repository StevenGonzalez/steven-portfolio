// Runs the world's renderer in a worker, as the site does, and times its frames. world-bench.mjs serves this file and
// the world's modules, and posts the scenario here. Every run steps the world at a fixed 60 fps with the same seeded
// randomness, so two versions of the code draw exactly the same frames.

import "/seeded-random.js";

self.onmessage = async ({ data: q }) => {
  try {
    // In the profiled copy of the modules every draw and update call goes through this, which adds up its time under
    // the chain of calls that led to it.
    const total = {};
    const stack = [];
    self.__T = (name, f) => (...a) => {
      stack.push(name);
      const key = stack.join(" > ");
      const t0 = performance.now();
      try {
        return f(...a);
      } finally {
        total[key] = (total[key] || 0) + performance.now() - t0;
        stack.pop();
      }
    };

    const { makeRenderer, LAYERS } = await import(`/${q.code}/render`);
    const { w: W, h: H, dpr, night, scene, frames, season, occasion } = q;
    const canvases = LAYERS.map(() => new OffscreenCanvas(1, 1));
    const render = makeRenderer(canvases, false, () => {});
    render({ type: "size", W, H, dpr, night: !!night, season, occasion, grown: 0, first: false, wait: false });

    // The pointer wanders over the world; when clicking, it clicks every 45 frames, so a few rings are always out. In a
    // storm it presses on the sky, holds still until the cloud brews, then drags it about, so it rains and thunders the
    // whole run.
    const step = (i) => {
      const act = scene !== "idle";
      const storm = scene === "storm";
      const ph = Math.max(0, storm ? i - 40 : i) / 240;
      const x = W * (0.5 + 0.4 * Math.sin(ph * 2));
      const y = H * (storm ? 0.2 + 0.05 * Math.sin(ph * 3.1) : 0.45 + 0.3 * Math.sin(ph * 3.1));
      if (scene === "clicking" && i % 45 === 20) render({ type: "down", x, y });
      if (scene === "clicking" && i % 45 === 24) render({ type: "up" });
      if (storm && !i) render({ type: "down", x, y });
      if (storm && i > 40) render({ type: "drag", x, y });
      const t0 = performance.now();
      render({ type: "frame", raw: 1 / 60, mx: act ? (x / W) * 2 - 1 : 0, my: act ? (y / H) * 2 - 1 : 0, scroll: 0, pointer: act ? { x, y } : null, still: 0 });
      return performance.now() - t0;
    };
    for (let i = 0; i < 120; i++) step(i);
    for (const k in total) total[k] = 0;
    const ms = [];
    for (let i = 120; i < 120 + frames; i++) ms.push(step(i));

    const sorted = [...ms].sort((a, b) => a - b);
    self.postMessage({
      mean: ms.reduce((a, b) => a + b, 0) / ms.length,
      p95: sorted[Math.floor(sorted.length * 0.95)],
      profile: Object.entries(total).map(([k, v]) => [k, v / frames]),
    });
  } catch (e) {
    self.postMessage({ error: String((e && e.stack) || e) });
  }
};
