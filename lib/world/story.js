// The calling: the one event that ties the world together. About once a minute the signal fires pass a call toward the far gate.
// The gate sings its song, lighting up along its top, then its loose stone slides home, the ring closes and wakes, and a
// stream of light crosses the sky to the lantern tree. When it arrives the tree flares, the bells open, the jellies flash
// and the armillary spins. Then the stone drifts loose again.
//
// The song is four notes, each a light on top of the ring, beaming up, that points at one of the tree's four groups of
// lanterns, left to right, and rings softly on their note. Rung back on the lanterns, at any time, it opens the gate
// wide: the tree lights up along its lanterns, the stone slides home, and the ring opens onto a deep night sky, turning,
// whatever the time of day. Knowing the song is all it takes, and it shows as well with the sound off.

import { TAU, dab, lerp, panAt, rgba, seeded, sprite } from "./core";
import { D_BACK, D_ISLE } from "./layers";

// Where along the stream's flight the loop starts and ends, and its radius.
const LOOP = [0.3, 0.7],
  LOOP_R = 52;
// The gate's song, as the groups of lanterns it points at, and how long each note lasts, in seconds.
const SONG = [0, 2, 1, 3],
  NOTE = 0.6;
// How long the gate stays wide open, in seconds, and how long between one lantern and the next can be for them to count
// as one tune.
const WIDE = 18,
  GAP = 3;

export function makeCall(K) {
  const rnd = seeded(61),
    sky = seeded(47),
    L = K.tree.lanterns,
    x0 = Math.min(...L.map((l) => l.x)),
    x1 = Math.max(...L.map((l) => l.x));
  // Each group of lanterns, as where its note lights the ring, from -1 at the left to 1 at the right, kept clear of the
  // sides, and the note its lanterns ring.
  const groups = [0, 1, 2, 3].map((g) => {
    const own = L.filter((l) => l.group === g),
      x = own.reduce((a, l) => a + l.x, 0) / own.length;
    return {
      at: ((x - x0) / (x1 - x0 || 1)) * 1.5 - 0.75,
      step: Math.round(own.reduce((a, l) => a + l.step, 0) / own.length),
    };
  });
  return {
    rnd,
    ct: -1,
    next: 4,
    left: false,
    arrived: false,
    head: -1,
    motes: Array.from({ length: K.phone ? 30 : 60 }, () => ({ k: rnd(), off: (rnd() - 0.5) * 2, ph: rnd() * TAU })),
    groups,
    sung: -1,
    // The song as the gate is singing it: how much the ring dims for it, and the note lit now, if any.
    sing: 0,
    note: /** @type {{ at: number, k: number } | null} */ (null),
    // The lanterns rung lately, as [group, when], to hear the song in.
    heard: /** @type {[number, number][]} */ ([]),
    // Seconds since the song was rung back, or -1, and how far open the night inside the gate is. `tell` is set once
    // it is wide open, for the page to record in the field guide.
    open: -1,
    wide: 0,
    rang: false,
    told: true,
    tell: false,
    // The stars in the night through the gate, on one of its two arms, as [angle, share of the radius, size, phase].
    deep: Array.from({ length: K.phone ? 40 : 70 }, () => [
      (sky() < 0.5 ? 0 : Math.PI) + (sky() - 0.5) * 0.9,
      Math.sqrt(sky()),
      0.6 + sky() * 1.4,
      sky() * TAU,
    ]),
    spot: {},
    band: {},
    heart: {},
  };
}

export const ease = (k) => (k <= 0 ? 0 : k >= 1 ? 1 : k * k * (3 - 2 * k));

// A lantern rung, in group `g`. Lanterns of one group rung close together are one note, as a sweep down a strand is.
export function heard(Lf, K, g) {
  const C = Lf.call,
    h = C.heard,
    t = Lf.t,
    last = h[h.length - 1];
  if (C.open >= 0) return;
  if (last && t - last[1] > GAP) h.length = 0;
  else if (last && last[0] === g && t - last[1] < 0.5) return void (last[1] = t);
  h.push([g, t]);
  if (h.length > SONG.length) h.shift();
  if (h.length === SONG.length && h.every(([g], i) => g === SONG[i])) openWide(Lf, K);
}

// The song rung back: the tree sings it on along its lanterns, left to right, as it does waking from a doze, and then
// the gate opens wide. A calling under way gives way to it.
function openWide(Lf, K) {
  const C = Lf.call,
    L = K.tree.lanterns,
    x0 = Math.min(...L.map((l) => l.x)),
    x1 = Math.max(...L.map((l) => l.x));
  Object.assign(C, { ct: -1, head: -1, open: 0, rang: false, told: false, note: null, sing: 0 });
  C.heard.length = 0;
  K.gate.flash = -1;
  for (const l of L) l.wake = 0.1 + ((l.x - x0) / (x1 - x0 || 1)) * 1.1;
  Lf.sfx.push(["wake", K.tree.cx]);
}

// Wide open, once the tree has sung: the stone slides home and the ring rolls out a ring of light, then the night
// inside opens out, stays a while, and closes again before the stone drifts loose.
function wide(Lf, K, dt) {
  const C = Lf.call,
    G = K.gate,
    g = (C.open += dt) - 1.2;
  if (g < 0) return void (G.close = Math.max(0, (G.close || 0) - dt * 0.2));
  Lf.gateWake = Math.max(Lf.gateWake, g < WIDE ? ease(g / 0.5) : 1 - (g - WIDE) / 3);
  G.close = g < WIDE + 2 ? Math.max(G.close || 0, ease(g / 0.8)) : 1 - ease((g - WIDE - 2) / 5);
  G.flash = g > 0.8 && g < 3 ? (g - 0.8) / 2.2 : -1;
  C.wide = g < WIDE ? ease((g - 0.8) / 1.8) : 1 - ease((g - WIDE) / 2);
  if (g >= 0.8 && !C.rang) {
    C.rang = true;
    Lf.armBoost = 1;
    for (const j of Lf.jellies) j.flash = 1;
    Lf.sfx.push(["call", G.x]);
  }
  if (g >= 2.6 && !C.told) C.told = C.tell = true;
  if (g > WIDE + 7) {
    Object.assign(C, { open: -1, wide: 0, next: Lf.t + 30 });
    G.flash = -1;
  }
}

export function updateCall(Lf, K, dt, toLayer) {
  const C = Lf.call,
    G = K.gate,
    B = K.far.beacons,
    R = Lf.depth.relay,
    t = Lf.t;
  if (C.open >= 0) return wide(Lf, K, dt);
  if (C.ct < 0) {
    G.close = Math.max(0, (G.close || 0) - dt * 0.2);
    if (t < C.next) return;
    // Start the relay at the fire farthest from the gate, running faster than the idle relay.
    C.ct = 0;
    C.left = C.arrived = false;
    let far = 0;
    B.forEach((b, i) => {
      if (Math.abs(b.x - G.x) > Math.abs(B[far].x - G.x)) far = i;
    });
    Object.assign(R, { o: far, t0: t, step: 0.38 });
    C.sung = -1;
  }
  const ct = (C.ct += dt),
    relay = B.length ? (B.length - 1) * 0.38 : 0,
    t1 = relay + 0.3,
    // The song, from when the call reaches the gate, and then the ring closing.
    ts = t1 + 0.3,
    t2 = ts + SONG.length * NOTE,
    tc = t2 + 1.6;
  Lf.armBoost = Math.max(Lf.armBoost, 0.35 * ease(ct / (relay || 1)));
  if (ct < tc + 6) Lf.gateWake = Math.max(Lf.gateWake, ease((ct - t1) / 1.2));
  G.close = ct < tc + 6 ? ease((ct - t2) / 1.6) : 1 - ease((ct - tc - 6) / 5);
  // Each note lights quickly and fades over its length, and the rest of the ring dims while it sings, so the notes
  // stand out even from a gate already awake.
  const n = Math.floor((ct - ts) / NOTE),
    u = (ct - ts) / NOTE - n;
  C.sing = ease((ct - ts + 0.3) / 0.3) * (1 - ease((ct - t2) / 0.4));
  C.note = null;
  if (n >= 0 && n < SONG.length) {
    const gr = C.groups[SONG[n]];
    C.note = { at: gr.at, k: Math.min(1, u * 8) * Math.sqrt(1 - u) };
    if (C.sung < n) {
      C.sung = n;
      Lf.sfx.push(["lift", G.x, gr.step]);
    }
  }
  G.flash = ct > tc ? (ct - tc) / 1.5 : -1;
  C.head = (ct - tc - 0.2) / 3.2;
  if (C.head >= 0 && !C.left) {
    C.left = true;
    Lf.sfx.push(["stream", G.x, panAt(K, K.tree.cx)]);
  }
  if (C.head >= 1 && !C.arrived) {
    C.arrived = true;
    Lf.treeFlash = 1;
    Lf.armBoost = 1;
    for (const b of K.bells) b.o = 1;
    for (const j of Lf.jellies) j.flash = 1;
    Lf.sfx.push(["call", K.tree.cx]);
  }
  if (ct > tc + 12) {
    C.ct = -1;
    C.head = -1;
    G.flash = -1;
    C.next = t + 45 + C.rnd() * 25;
  }
  // The gate sits on the back layer; the stream is drawn on the island layer, so carry the gate across.
  const a = toLayer(D_ISLE, 0, 0),
    b = toLayer(D_BACK, 0, 0);
  C.from = [G.x + a.x - b.x, G.y + a.y - b.y];
}

// The stream of light from the gate to the tree, drawn on the island layer.
export function drawCall(c, Lf, K, P, t) {
  const C = Lf.call;
  if (C.head <= 0 || C.head > 2.3 || !C.from) return;
  const [x0, y0] = C.from,
    x2 = K.tree.cx,
    y2 = K.tree.cy + K.tree.r * 0.1,
    x1 = (x0 + x2) / 2,
    y1 = Math.min(y0, y2) - 160;
  // An arc to the tree with one loop-the-loop in the middle: forward, up, back over the top and down, like a roller
  // coaster. The turn eases in and out, so the loop grows smoothly out of the arc and the light reaches the tree in a line.
  const at = (u) => {
    const m = 1 - u,
      x = m * m * x0 + 2 * m * u * x1 + u * u * x2,
      y = m * m * y0 + 2 * m * u * y1 + u * u * y2;
    const k = (u - LOOP[0]) / (LOOP[1] - LOOP[0]);
    if (k <= 0 || k >= 1) return [x, y];
    let tx = m * (x1 - x0) + u * (x2 - x1),
      ty = m * (y1 - y0) + u * (y2 - y1);
    const d = Math.hypot(tx, ty) || 1,
      a = TAU * ease(k);
    tx /= d;
    ty /= d;
    const side = tx > 0 ? 1 : -1,
      along = LOOP_R * Math.sin(a),
      up = LOOP_R * (1 - Math.cos(a));
    return [x + tx * along + ty * up * side, y + ty * along - tx * up * side];
  };
  const u0 = Math.max(0, C.head - 1.2),
    u1 = Math.min(1, C.head),
    fade = C.head > 1.8 ? 1 - (C.head - 1.8) / 0.5 : 1;
  c.globalCompositeOperation = "lighter";
  c.lineCap = "round";
  if (u1 > u0) {
    c.beginPath();
    for (let i = 0; i <= 96; i++) {
      const [x, y] = at(lerp(u0, u1, i / 96));
      c.lineTo(x, y);
    }
    for (const [col, w, a] of [
      [P.glow, 18, 0.07],
      [P.glow, 6, 0.12],
      [P.light, 1.6, 0.26],
    ]) {
      c.strokeStyle = rgba(col, a * fade);
      c.lineWidth = w;
      c.stroke();
    }
  }
  const gs = sprite(P.glow),
    ls = sprite(P.light);
  // A bright head leads the stream, so it reads as light travelling rather than a line being drawn.
  if (C.head < 1) {
    const [hx, hy] = at(C.head);
    dab(c, gs, hx, hy, 26, 0.5);
    dab(c, ls, hx, hy, 7, 0.9);
  }
  for (const m of C.motes) {
    const u = C.head - m.k * 1.2;
    if (u <= 0 || u >= 1) continue;
    const [x, y] = at(u),
      [xa, ya] = at(Math.min(1, u + 0.01)),
      d = Math.hypot(xa - x, ya - y) || 1;
    const spread = m.off * (5 + 9 * Math.sin(Math.PI * u)) + Math.sin(t * 4 + m.ph) * 4,
      a = Math.pow(Math.sin(Math.PI * u), 0.4);
    const px = x - ((ya - y) / d) * spread,
      py = y + ((xa - x) / d) * spread;
    dab(c, gs, px, py, 9, 0.55 * a);
    dab(c, ls, px, py, 2, 0.9 * a);
  }
  c.globalCompositeOperation = "source-over";
}
