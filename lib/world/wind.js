// The wind. Every so often a gust comes across the world from one side, and everything it reaches leans the way it
// blows while it passes: the meadow grass, the shy bells, the swing, the dandelion folk and their seeds, the kite, the
// leaves round the edge of the maple's crown, and whatever is falling. The breeze that carries the folk off along the
// island is one of these gusts, only stronger. Its sound swells and crosses over from the side it comes from, and
// rustles the tree as it gets there. A dozing world, or one at a lantern festival, is calm. A windy day where the
// visitor is (weather.js) blows more often, and harder.

import { PAL, TAU, clamp, makeCanvas, mixc, rgba, seeded } from "./core";
import { meadowTufts } from "./land";
import { MAPLE } from "./season";

// How long a gust takes to cross the world from edge to edge, in seconds.
const CROSS = 2.4;
// A maple leaf as small as the ones round the crown needs only its five points.
const HALF = [
  [0, -1],
  [0.18, -0.5],
  [0.8, -0.66],
  [0.44, -0.04],
  [0.62, 0.3],
  [0, 0.36],
];
const LEAF = [
  ...HALF,
  ...HALF.slice(1, -1)
    .reverse()
    .map(([x, y]) => [-x, y]),
];

export function makeWind(K) {
  const rnd = Math.random;
  return {
    rnd,
    gusts: [],
    next: 4 + rnd() * 6,
    // The meadow's live tufts, the ones the island's painting leaves out, each standing at the middle of its blades.
    tufts: meadowTufts(K, seeded(47))
      .filter((_, i) => i % 2)
      .map((blades) => ({ x: blades.reduce((a, b) => a + b[0], 0) / blades.length, y: blades[0][1], blades })),
    rim: rimLeaves(K),
    P: null,
    k: 0,
    groups: [],
    atlas: null,
  };
}

// Leaves round the edge of each of the crown's clusters, wherever it stands against the sky rather than in front of
// another cluster, so they show when they move.
function rimLeaves(K) {
  const { s, tree: T } = K,
    rnd = seeded(83),
    out = [];
  const inOther = (x, y, own) =>
    T.clusters.some((cl) => cl !== own && ((x - cl[0]) / cl[2]) ** 2 + ((y - cl[1]) / (cl[2] * 0.85)) ** 2 < 1);
  for (const cl of T.clusters) {
    const [cx, cy, R] = cl;
    for (let i = 0, n = 0; i < 30 && n < 4; i++) {
      const a = rnd() * TAU,
        x = cx + Math.cos(a) * R * 0.97,
        y = cy + Math.sin(a) * R * 0.82;
      if (inOther(x, y, cl)) continue;
      out.push({
        x,
        y,
        rot: rnd() * TAU,
        w: (3.6 + rnd() * 3.8) * s,
        ph: rnd() * TAU,
        k: rnd(),
        lit: rnd(),
        hue: rnd(),
      });
      n++;
    }
  }
  return out;
}

// How long after a gust blowing toward `dir` sets off its front reaches x.
const lag = (K, dir, x) => clamp(((dir > 0 ? x + K.EX : K.WU + K.EX - x) / (K.WU + K.EX * 2)) * CROSS, 0, CROSS);

/** The wind at x: from -1 to 1, blowing to the right when positive, 0 when still. Gusts that meet add up. */
export function gust(W, K, x) {
  let sum = 0;
  for (const G of W.gusts) {
    const v = (G.u - lag(K, G.dir, x)) / G.dur;
    if (v > 0 && v < 1) sum += G.dir * G.str * Math.sin(Math.PI * v) ** 2;
  }
  return clamp(sum, -1, 1);
}

/** Sends a gust across toward `dir` (1 for right), `str` strong at its height, blowing `dur` seconds at any one place. */
export function blow(Lf, K, dir, str, dur) {
  const W = Lf.wind;
  W.gusts.push({ u: 0, dir, str, dur });
  // On a windy day where the visitor is, the next comes sooner.
  W.next = (dur + CROSS + 8 + W.rnd() * 10) * (1 - 0.6 * (Lf.weather?.windy ?? 0));
  Lf.sfx.push(["gust", dir > 0 ? -K.EX : K.WU + K.EX, { str, dur, cross: CROSS, tree: lag(K, dir, K.tree.cx) }]);
}

export function updateWind(Lf, K, dt) {
  const W = Lf.wind;
  W.gusts = W.gusts.filter((G) => (G.u += dt) < G.dur + CROSS);
  // Mostly the way the leaves drift and the kite flies, and now and then back the other way. Harder on a windy day.
  if (!Lf.doze && !Lf.fest && (W.next -= dt) < 0)
    blow(Lf, K, W.rnd() < 0.75 ? 1 : -1, 0.5 + W.rnd() * 0.35 + 0.15 * (Lf.weather?.windy ?? 0), 3 + W.rnd() * 2);
}

// The rim leaves in their colours, the way the crown is painted: turned to one of the maple's colours in autumn, as
// many as have turned, and the theme's green otherwise. Leaves of one colour are drawn together.
function rimGroups(W, P) {
  const hues = MAPLE[P.night ? "night" : "dusk"],
    green = P.turn ? (P.night ? PAL.night : PAL.dusk) : P;
  const warm = P.night ? P.leafLit : [255, 214, 136],
    shade = P.night ? [10, 4, 10] : [44, 12, 20],
    groups = new Map();
  for (const l of W.rim) {
    const lit = Math.round((0.3 + l.lit * 0.6) * 6) / 6,
      hue = hues[Math.floor(l.hue * hues.length)];
    const col =
      l.k * 0.5 < P.turn
        ? lit < 0.5
          ? mixc(mixc(hue, shade, 0.65), hue, lit * 2)
          : mixc(hue, warm, (lit - 0.5) * 0.9)
        : lit < 0.5
          ? mixc(green.leafDark, green.leafMid, lit * 2)
          : mixc(green.leafMid, green.leafLit, (lit - 0.5) * 2);
    const key = rgba(col, 0.94);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(l);
  }
  return [...groups];
}

// The live tufts at rest, side by side in one canvas at `k` pixels to the unit, each with its foot at (ax, ay) in its own
// box. A frame copies each one across, sheared over as far as the wind bends it there: filling every blade's outline
// each frame instead cost over half a millisecond.
function tuftAtlas(W, K, P, k) {
  const w = 0.65 * K.s,
    pad = Math.ceil(2 * K.s * k),
    grass = new Path2D();
  let at = 0;
  for (const T of W.tufts) {
    let x0 = T.x,
      x1 = T.x,
      top = 0;
    for (const [bx, , h, lean] of T.blades)
      [x0, x1, top] = [Math.min(x0, bx - w, bx + lean), Math.max(x1, bx + w, bx + lean), Math.max(top, h)];
    Object.assign(T, { sx: at, ax: Math.ceil((T.x - x0) * k) + pad, ay: Math.ceil(top * k) + pad });
    T.w = T.ax + Math.ceil((x1 - T.x) * k) + pad;
    T.h = T.ay + pad;
    for (const [bx, , h, lean] of T.blades) {
      const b = T.sx + T.ax + (bx - T.x) * k,
        tx = b + lean * k,
        ty = T.ay - h * k,
        ww = w * k;
      grass.moveTo(b - ww, T.ay);
      grass.quadraticCurveTo(b + lean * k * 0.3 - ww * 0.5, T.ay - h * k * 0.6, tx, ty);
      grass.quadraticCurveTo(b + lean * k * 0.3 + ww * 0.5, T.ay - h * k * 0.6, b + ww, T.ay);
      grass.closePath();
    }
    at += T.w;
  }
  const cv = (W.atlas ||= makeCanvas());
  cv.width = at;
  cv.height = Math.max(...W.tufts.map((T) => T.h));
  // The painted tufts are lit along their edges, which on a blade this thin is nearly all of it.
  const a = cv.getContext("2d"),
    body = mixc(P.leafDark, P.leafMid, 0.45);
  a.fillStyle = rgba(body.map((v, i) => Math.min(255, v + P.leafLit[i] * 0.4)));
  a.fill(grass);
}

// The live grass, bent by the gust where it stands, in rolling waves, and the rim leaves shivering in it.
export function drawWind(c, Lf, K, P, t) {
  const W = Lf.wind,
    s = K.s,
    m = c.getTransform();
  if (W.P !== P || W.k !== m.a) {
    [W.P, W.k, W.groups] = [P, m.a, rimGroups(W, P)];
    tuftAtlas(W, K, P, m.a);
  }
  for (const T of W.tufts) {
    const g = gust(W, K, T.x),
      wave = g * (0.75 + 0.25 * Math.sin(t * 5 - T.x * 0.06 * Math.sign(g)));
    // Leaning each tip over by `lean` times its height, and lowering it a little the further it goes.
    const lean = wave * 1.4 + Math.sin(t * 2.2 + T.x * 0.07) * 0.05,
      sy = 1 - 0.2 * wave * wave;
    c.setTransform(1, 0, -lean, sy, Math.round(m.a * T.x + m.e), Math.round(m.d * T.y + m.f));
    c.drawImage(W.atlas, T.sx, 0, T.w, T.h, -T.ax, -T.ay, T.w, T.h);
  }
  c.setTransform(m);

  for (const [col, leaves] of W.groups) {
    const p = new Path2D();
    for (const l of leaves) {
      // Still, each barely stirs. In a gust it tips over downwind and flutters, turning edge-on and back.
      const g = gust(W, K, l.x),
        a = Math.abs(g),
        rot = l.rot + g * 0.6 + Math.sin(t * 17 + l.ph) * 0.4 * a + Math.sin(t * 1.3 + l.ph) * 0.04;
      const sx = l.w,
        sy = l.w * (1 - 0.6 * a * Math.abs(Math.sin(t * 11 + l.ph))),
        cs = Math.cos(rot),
        sn = Math.sin(rot),
        ox = l.x + g * 2.5 * s;
      LEAF.forEach(([x, y], i) =>
        p[i ? "lineTo" : "moveTo"](ox + x * sx * cs - y * sy * sn, l.y + x * sx * sn + y * sy * cs),
      );
      p.closePath();
    }
    c.fillStyle = col;
    c.fill(p);
  }
}
