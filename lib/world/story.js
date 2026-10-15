// The calling: the one event that ties the world together. About once a minute the signal fires pass a call toward the far gate.
// The gate's loose stone slides home, the ring closes and wakes, and a stream of light crosses the sky to the lantern tree.
// When it arrives the tree flares, the bells open, the jellies flash and the armillary spins. Then the stone drifts loose again.

import { TAU, dab, lerp, rgba, seeded, sprite } from './core';
import { D_BACK, D_ISLE } from './life';

// Where along the stream's flight the loop starts and ends, and its radius.
const LOOP = [.3, .7], LOOP_R = 52;

export function makeCall(K) {
  const rnd = seeded(61);
  return {
    rnd, ct: -1, next: 4, arrived: false, head: -1,
    motes: Array.from({ length: K.phone ? 30 : 60 }, () => ({ k: rnd(), off: (rnd() - .5) * 2, ph: rnd() * TAU })),
  };
}

export const ease = k => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));

export function updateCall(Lf, K, dt, toLayer) {
  const C = Lf.call, G = K.gate, B = K.far.beacons, R = Lf.depth.relay, t = Lf.t;
  if (C.ct < 0) {
    G.close = Math.max(0, (G.close || 0) - dt * .2);
    if (t < C.next) return;
    // Start the relay at the fire farthest from the gate, running faster than the idle relay.
    C.ct = 0;
    C.arrived = false;
    let far = 0;
    B.forEach((b, i) => { if (Math.abs(b.x - G.x) > Math.abs(B[far].x - G.x)) far = i; });
    Object.assign(R, { o: far, t0: t, step: .38 });
  }
  const ct = (C.ct += dt), relay = B.length ? (B.length - 1) * .38 : 0, t1 = relay + .3, tc = t1 + 2.2;
  Lf.armBoost = Math.max(Lf.armBoost, .35 * ease(ct / (relay || 1)));
  if (ct < tc + 6) Lf.gateWake = Math.max(Lf.gateWake, ease((ct - t1) / 1.2));
  G.close = ct < tc + 6 ? ease((ct - t1 - .6) / 1.6) : 1 - ease((ct - tc - 6) / 5);
  G.flash = ct > tc ? (ct - tc) / 1.5 : -1;
  C.head = (ct - tc - .2) / 3.2;
  if (C.head >= 1 && !C.arrived) {
    C.arrived = true;
    Lf.treeFlash = 1;
    Lf.armBoost = 1;
    for (const b of K.bells) b.o = 1;
    for (const j of Lf.jellies) j.flash = 1;
    Lf.sfx.push(['call', K.tree.cx]);
  }
  if (ct > tc + 12) {
    C.ct = -1;
    C.head = -1;
    G.flash = -1;
    C.next = t + 45 + C.rnd() * 25;
  }
  // The gate sits on the back layer; the stream is drawn on the island layer, so carry the gate across.
  const a = toLayer(D_ISLE, 0, 0), b = toLayer(D_BACK, 0, 0);
  C.from = [G.x + a.x - b.x, G.y + a.y - b.y];
}

// The stream of light from the gate to the tree, drawn on the island layer.
export function drawCall(c, Lf, K, P, t) {
  const C = Lf.call;
  if (C.head <= 0 || C.head > 2.3 || !C.from) return;
  const [x0, y0] = C.from, x2 = K.tree.cx, y2 = K.tree.cy + K.tree.r * .1, x1 = (x0 + x2) / 2, y1 = Math.min(y0, y2) - 160;
  // An arc to the tree with one loop-the-loop in the middle: forward, up, back over the top and down, like a roller
  // coaster. The turn eases in and out, so the loop grows smoothly out of the arc and the light reaches the tree in a line.
  const at = u => {
    const m = 1 - u, x = m * m * x0 + 2 * m * u * x1 + u * u * x2, y = m * m * y0 + 2 * m * u * y1 + u * u * y2;
    const k = (u - LOOP[0]) / (LOOP[1] - LOOP[0]);
    if (k <= 0 || k >= 1) return [x, y];
    let tx = m * (x1 - x0) + u * (x2 - x1), ty = m * (y1 - y0) + u * (y2 - y1);
    const d = Math.hypot(tx, ty) || 1, a = TAU * ease(k);
    tx /= d;
    ty /= d;
    const side = tx > 0 ? 1 : -1, along = LOOP_R * Math.sin(a), up = LOOP_R * (1 - Math.cos(a));
    return [x + tx * along + ty * up * side, y + ty * along - tx * up * side];
  };
  const u0 = Math.max(0, C.head - 1.2), u1 = Math.min(1, C.head), fade = C.head > 1.8 ? 1 - (C.head - 1.8) / .5 : 1;
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  if (u1 > u0) {
    c.beginPath();
    for (let i = 0; i <= 96; i++) {
      const [x, y] = at(lerp(u0, u1, i / 96));
      c.lineTo(x, y);
    }
    for (const [col, w, a] of [[P.glow, 18, .07], [P.glow, 6, .12], [P.light, 1.6, .26]]) {
      c.strokeStyle = rgba(col, a * fade);
      c.lineWidth = w;
      c.stroke();
    }
  }
  const gs = sprite(P.glow), ls = sprite(P.light);
  // A bright head leads the stream, so it reads as light travelling rather than a line being drawn.
  if (C.head < 1) {
    const [hx, hy] = at(C.head);
    dab(c, gs, hx, hy, 26, .5);
    dab(c, ls, hx, hy, 7, .9);
  }
  for (const m of C.motes) {
    const u = C.head - m.k * 1.2;
    if (u <= 0 || u >= 1) continue;
    const [x, y] = at(u), [xa, ya] = at(Math.min(1, u + .01)), d = Math.hypot(xa - x, ya - y) || 1;
    const spread = m.off * (5 + 9 * Math.sin(Math.PI * u)) + Math.sin(t * 4 + m.ph) * 4, a = Math.pow(Math.sin(Math.PI * u), .4);
    const px = x - (ya - y) / d * spread, py = y + (xa - x) / d * spread;
    dab(c, gs, px, py, 9, .55 * a);
    dab(c, ls, px, py, 2, .9 * a);
  }
  c.globalCompositeOperation = 'source-over';
}
