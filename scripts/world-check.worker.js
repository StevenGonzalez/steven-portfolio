// Drives the world's renderer through a fixed script of frames, pointer moves, clicks, a storm, a theme switch and
// every one-off message, and fingerprints every canvas, and every message it sends back, at checkpoints along the way.
// world-check.mjs serves this file and the world's modules, and posts the scenario here. Two versions of the code that
// draw and say exactly the same things give the same fingerprints.

import "/seeded-random.js";

const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
const digest = async (bytes) => hex(await crypto.subtle.digest("SHA-1", bytes));

self.onmessage = async ({ data: q }) => {
  try {
    // The clock stands at noon on a fixed day, and moves on a sixtieth of a second a frame.
    let clock = 0;
    const NOON = Date.UTC(2026, 9, 20, 12);
    const RealDate = Date;
    performance.now = () => clock;
    self.Date = class extends RealDate {
      constructor(...a) {
        super(...(a.length ? a : [NOON + clock]));
      }
      static now() {
        return NOON + clock;
      }
    };

    const { makeRenderer } = await import(`/${q.code}/render`);
    const { LAYERS } = await import(`/${q.code}/layers`);
    const { RARE } = await import(`/${q.code}/guide`);
    const { w: W, h: H, dpr, night, season, turn, occasion, reduce, ask, frames } = q;
    const canvases = LAYERS.map(() => new OffscreenCanvas(1, 1));
    const sent = [];
    const render = makeRenderer(canvases, reduce, (m) => sent.push(m));
    const out = [];
    // Frame times are left out of the messages' fingerprint, since they differ from run to run.
    const check = async (label) => {
      const layers = [];
      for (const cv of canvases) {
        const c = cv.getContext("2d");
        layers.push(cv.width && cv.height ? await digest(c.getImageData(0, 0, cv.width, cv.height).data) : "empty");
      }
      const said = JSON.stringify(sent, (k, v) => (k === "ms" ? undefined : v));
      out.push({ label, layers, said: await digest(new TextEncoder().encode(said)), saidText: said.slice(0, 400) });
      sent.length = 0;
    };

    render({
      type: "size", W, H, dpr, night: !!night, season, turn, occasion, grown: 4, jar: 3, sapling: { u: 0.3, age: 2 },
      first: true, wait: false, rare: RARE.filter((k) => k !== ask), ask,
      stars: { pts: [[0.5, 150], [0.56, 185], [0.62, 140]], links: [[0, 1], [1, 2]] },
    });
    await check("size");

    // Spots spread over the whole hero, clicked in turn every nine frames, so most things in the world get poked. Then
    // a press on the sky that brews a storm and drags it about, and the pointer held still, and left idle.
    const spots = [];
    for (let gy = 0.08; gy < 0.95; gy += 0.11) for (let gx = 0.04; gx < 0.98; gx += 0.08) spots.push([gx * W, gy * H]);
    let held = false;
    const step = (i) => {
      const ph = i / 240;
      let x = W * (0.5 + 0.45 * Math.sin(ph * 2));
      let y = H * (0.45 + 0.4 * Math.sin(ph * 3.1));
      const storm = i >= 700 && i < 1000;
      if (storm) [x, y] = [W * (0.45 + 0.1 * Math.sin(i / 50)), H * 0.14];
      if (i === 700) render({ type: "down", x, y });
      if (storm && i > 760) render({ type: "drag", x, y });
      if (i === 1000) render({ type: "up" });
      if (!storm && i % 9 === 4 && i < 700) {
        [x, y] = spots[(i / 9) % spots.length | 0];
        render({ type: "down", x, y });
        held = true;
      } else if (held) {
        render({ type: "up" });
        held = false;
      }
      clock += 1000 / 60;
      render({
        type: "frame", raw: 1 / 60, mx: (x / W) * 2 - 1, my: (y / H) * 2 - 1, scroll: i > 1300 ? 0.3 : 0, pointer: { x, y },
        still: i > 1200 && i < 1300 ? (i - 1200) / 60 : 0, idle: i > 1350 ? (i - 1350) / 60 : 0,
      });
    };
    for (let i = 0; i < (reduce ? 200 : frames); i++) {
      if (i === 150) render({ type: "look", mx: 0.1, my: -0.2, scroll: 0, pointer: { x: W * 0.55, y: H * 0.35 } });
      if (i === 400) render({ type: "theme", night: !night, bitmaps: null });
      if (i === 450) render({ type: "theme", night: !!night, bitmaps: null });
      if (i === 1050) {
        render({ type: "band", n: 5 });
        render({ type: "flash" });
        render({ type: "burst", x: W * 0.5, y: H * 0.4 });
        render({ type: "snap" });
        render({ type: "away", secs: 200 });
        render({ type: "unseen" });
        render({ type: "serpent" });
        render({ type: "festival" });
      }
      if (i === 1100) render({ type: "nova" });
      step(i);
      if (i % 100 === 99 || i === 151 || i === 401 || i === 1051) await check(`frame ${i}`);
    }
    render({ type: "paint", bitmaps: null });
    await check("repaint");
    render({
      type: "size", W: Math.round(W * 0.8), H, dpr, night: !night, season, turn, occasion, grown: 1, jar: 0, sapling: null,
      first: false, wait: false, rare: [], ask: null, stars: null,
    });
    for (let i = 0; i < 60; i++) step(i);
    await check("resized");
    self.postMessage({ out });
  } catch (e) {
    self.postMessage({ error: String((e && e.stack) || e) });
  }
};
