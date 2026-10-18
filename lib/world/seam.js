// The seam: the cloud sea and a few wanderlights drift down past the bottom of the world into the top of the page,
// so the site reads as sitting under it. Page only. One canvas in CSS pixels, behind the page content, starting
// TOP pixels up inside the hero so the clouds cross the edge. Flipped, the same seam closes the page: clouds gather
// at the bottom and the lights rise.

import { TAU, clamp, dab, sprite } from "./core";

export function makeSeam(cv, TOP, flip) {
  const c = cv.getContext("2d"),
    rnd = Math.random,
    S = { cv, on: false, W: 0, H: 0, wisps: [], motes: [], ptr: null };
  // Wanderlights start in the hero's bottom fade and sink until they thin out.
  const mote = (fresh) => ({
    x: rnd() * S.W,
    y: fresh ? TOP * 0.5 + rnd() * (S.H - TOP) : TOP * 0.4 + rnd() * TOP * 0.8,
    vy: 5 + rnd() * 9,
    ph: rnd() * TAU,
    r: 1.2 + rnd() * 1.6,
    age: fresh ? 2 + rnd() * 4 : 0,
    push: 0,
  });
  S.resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    S.W = cv.clientWidth;
    S.H = cv.clientHeight;
    cv.width = Math.round(S.W * dpr);
    cv.height = Math.round(S.H * dpr);
    c.setTransform(dpr, 0, 0, flip ? -dpr : dpr, 0, flip ? cv.height : 0);
    // Long low banks, each a row of flattened puffs, centred just across the hero's edge.
    S.wisps = Array.from({ length: Math.ceil(S.W / 320) + 1 }, (_, i) => {
      const w = 220 + rnd() * 200;
      return {
        x: (i + rnd() * 0.6) * 320,
        y: TOP - 30 + rnd() * 120,
        w,
        v: 3 + rnd() * 6,
        puffs: Array.from({ length: 6 }, () => {
          const rx = 50 + rnd() * 80;
          return {
            dx: (rnd() - 0.5) * w,
            dy: (rnd() - 0.5) * 26,
            rx,
            ry: rx * (0.3 + rnd() * 0.15),
            a: 0.5 + rnd() * 0.5,
          };
        }),
      };
    });
    S.motes = Array.from({ length: clamp(Math.round(S.W / 110), 6, 16) }, () => mote(true));
  };
  // The pointer in canvas CSS pixels, or nothing.
  S.point = (x, y) => (S.ptr = x == null ? null : { x, y: flip ? S.H - y : y });
  S.draw = (dt, P, t) => {
    const span = S.W + 500;
    for (const w of S.wisps) w.x = ((w.x + w.v * dt + 250) % span) - 250;
    for (const m of S.motes) {
      m.age += dt;
      // The pointer nudges them aside; the nudge dies away on its own.
      if (S.ptr) {
        const dx = m.x - S.ptr.x,
          dy = m.y - S.ptr.y,
          d = Math.hypot(dx, dy);
        if (d < 110) {
          m.push += (dx / (d || 1)) * (110 - d) * 1.6 * dt;
          m.y += (dy / (d || 1)) * (110 - d) * 0.4 * dt;
        }
      }
      m.push *= Math.pow(0.2, dt);
      m.x += (Math.sin(t * 0.5 + m.ph) * 8 + m.push * 20) * dt;
      m.y += m.vy * dt;
    }
    const fade = (m) => Math.min(m.age / 1.5, 1) * clamp(1 - (m.y - TOP) / (S.H - TOP - 40), 0, 1);
    S.motes = S.motes.map((m) => (m.age > 1.5 && fade(m) <= 0 ? mote(false) : m));

    c.clearRect(0, 0, S.W, S.H);
    const cs = sprite(P.cloudLit),
      ca = P.night ? 0.14 : 0.5;
    for (const w of S.wisps) {
      for (const p of w.puffs) {
        c.globalAlpha = ca * p.a;
        c.drawImage(cs, w.x + p.dx - p.rx, w.y + p.dy - p.ry, p.rx * 2, p.ry * 2);
      }
    }
    // At night they glow; against the pale dusk page they read as warm embers instead.
    const halo = sprite(P.night ? P.glow : [255, 190, 104]),
      core = sprite(P.night ? P.light : [196, 116, 36]);
    c.globalCompositeOperation = P.night ? "lighter" : "source-over";
    for (const m of S.motes) {
      const a = fade(m) * (0.75 + 0.25 * Math.sin(t * 2.1 + m.ph));
      dab(c, halo, m.x, m.y, m.r * 8, (P.night ? 0.35 : 0.45) * a);
      dab(c, core, m.x, m.y, m.r * 1.5, 0.9 * a);
    }
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 1;
  };
  return S;
}
