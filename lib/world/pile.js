// The leaf pile. In autumn the maple's leaves pile up round the foot of its trunk, on the side away from the swing.
// It is as big as the season is old when the world opens, and grows as leaves come down onto it. A sweep of the
// pointer through it, or a click on it, sends leaves flying with a soft crunch. They come down on the turf, and the
// next gust tumbles them along it: the ones it blows up against the trunk go back on the pile, and the rest blow away.

import { TAU, clamp, makeCanvas, mixc, rgba, seeded } from "./core";
import { D_ISLE } from "./layers";
import { LEAVES, mapleLeaf } from "./calendar";
import { gust } from "./wind";

// How many leaves a full pile holds.
const MAX = 90;
// How fast, in pixels a second, the pointer has to sweep through the pile to send leaves flying.
const SWEEP = 240;
// Old leaves fade toward brown, and the ones deep in the pile are in shade.
const FADED = [128, 72, 42],
  SHADE = [52, 26, 24];

export function makePile(K, season, turn = 1) {
  if (season !== "autumn") return null;
  const { s, tree: T } = K,
    rnd = seeded(29),
    cx = T.x - 26 * s,
    hw = 50 * s,
    top = 13 * s;
  // Each leaf has its place in a full pile, picked evenly from under a mound, and the pile fills them from the bottom
  // of the mound up, so a small pile is a low mound rather than a slice off the bottom of a big one.
  const shape = (x) => top * Math.max(0, 1 - ((x - cx) / hw) ** 2) ** 1.5,
    slots = [];
  while (slots.length < MAX) {
    const x = cx + (rnd() * 2 - 1) * hw,
      h = rnd() * top,
      m = shape(x);
    if (h > m) continue;
    slots.push({
      x,
      h,
      rel: h / m,
      rot: rnd() * TAU,
      size: (3.2 + rnd() * 2.2) * s,
      sq: 0.45 + rnd() * 0.4,
      col: Math.floor(rnd() * LEAVES.length),
      age: rnd() * 0.45,
      on: false,
    });
  }
  slots.sort((a, b) => a.rel - b.rel);
  const n = Math.round(MAX * (0.1 + 0.8 * clamp((turn - 0.15) / 0.85, 0, 1)));
  slots.forEach((sl, i) => (sl.on = i < n));
  // The box the pile is painted into, in scene units.
  const xs = [cx - hw, cx, cx + hw].map((x) => ground(K, x)),
    bx = cx - hw - 8 * s,
    by = Math.min(...xs) - top - 10 * s;
  return {
    cx,
    hw,
    slots,
    air: [],
    loose: [],
    tops: [],
    last: null,
    acc: 0,
    ax: 0,
    quiet: 0,
    bx,
    by,
    bw: hw * 2 + 16 * s,
    bh: Math.max(...xs) - by + 8 * s,
    cv: null,
    P: null,
    k: 0,
    dirty: true,
  };
}

// Where the turf is under x, a little into the grass.
const ground = (K, x) => K.isle.topAt(x) + 3 * K.s;
// Where a leaf in the pile lies.
const at = (K, sl) => [sl.x, ground(K, sl.x) - sl.h - sl.size * 0.45 * sl.sq];
// How high the pile stands at x.
function height(Pi, K, x) {
  const i = Math.floor((x - Pi.cx + Pi.hw) / (3 * K.s));
  return Pi.tops[i] || 0;
}

// Puts a leaf back on the pile, in the lowest free place near x. Returns false when the pile is full.
function fill(Pi, x, col, age) {
  let best = null,
    bd = Infinity;
  for (const sl of Pi.slots) {
    const d = sl.rel + (Math.abs(sl.x - x) / Pi.hw) * 1.2;
    if (!sl.on && d < bd) [best, bd] = [sl, d];
  }
  if (!best) return false;
  Object.assign(best, { on: true, col, age });
  Pi.dirty = true;
  return true;
}

// Sends flying every leaf within reach of the pointer's path from (x0, y0) to (x1, y1), along the way it went, or out
// from the point of a click. `str` is how hard, from 0 to 1. Returns how many went.
function kick(Lf, K, x0, y0, x1, y1, str, click) {
  const Pi = Lf.pile,
    { s } = K,
    rnd = Math.random,
    r = (click ? 12 : 8) * s,
    dx = x1 - x0,
    dy = y1 - y0,
    len = dx * dx + dy * dy,
    hit = [];
  for (const sl of Pi.slots) {
    if (!sl.on) continue;
    const [x, y] = at(K, sl),
      u = len ? clamp(((x - x0) * dx + (y - y0) * dy) / len, 0, 1) : 0;
    if (Math.hypot(x0 + dx * u - x, y0 + dy * u - y) < r) hit.push(sl);
  }
  if (!hit.length) return 0;
  // Whatever lay on top of a leaf that went goes too.
  for (const sl of Pi.slots)
    if (sl.on && !hit.includes(sl) && hit.some((k) => sl.h > k.h && Math.abs(sl.x - k.x) < k.size * 0.8)) hit.push(sl);
  const ux = len ? dx / Math.sqrt(len) : 0;
  for (const sl of hit) {
    const [x, y] = at(K, sl);
    sl.on = false;
    Pi.air.push({
      kicked: true,
      x,
      y,
      vy: -(70 + 130 * str * rnd()) * s,
      rot: sl.rot,
      spin: (rnd() - 0.5) * 14,
      ph: rnd() * TAU,
      size: sl.size,
      col: sl.col,
      age: sl.age,
      vx: (click ? ((x - x1) / r) * 60 : ux * (50 + 170 * str * rnd())) * s + (rnd() - 0.5) * 50 * s,
    });
  }
  Pi.dirty = true;
  Pi.acc += hit.length;
  Pi.ax = x1;
  return hit.length;
}

/** A click at (x, y) on the island's layer. On the pile it sends the leaves round it flying, or in a world held still
 * only crunches, and returns true. */
export function poke(Lf, K, x, y, still) {
  const Pi = Lf.pile;
  if (!Pi || Math.abs(x - Pi.cx) > Pi.hw) return false;
  const gy = ground(K, x),
    h = height(Pi, K, x);
  if (!h || y > gy + 4 * K.s || y < gy - h - 6 * K.s) return false;
  if (still) Lf.sfx.push(["crunch", x, 0.5]);
  else kick(Lf, K, x, y, x, y, 0.8, true);
  return true;
}

export function updatePile(Lf, K, dt, ptr) {
  const Pi = Lf.pile;
  if (!Pi || !dt) return;
  const { s, isle, iw, tree: T } = K,
    rnd = Math.random,
    W = Lf.wind;

  // A falling leaf that comes down on the pile stays there more often than not. The season sends another down from
  // the tree in its place. One that is already falling on past the turf, in front of the rock, is not caught.
  for (const b of Lf.season.bits) {
    const gy = ground(K, b.x);
    if (b.pile !== undefined || Math.abs(b.x - Pi.cx) > Pi.hw || b.y < gy - height(Pi, K, b.x) || b.y > gy + 8 * s)
      continue;
    b.pile = rnd() < 0.6 && fill(Pi, b.x, Math.floor(b.col * LEAVES.length), 0);
    if (b.pile) b.y = Infinity;
  }

  // The pointer sweeping through.
  const p = ptr(D_ISLE),
    last = Pi.last;
  Pi.last = p;
  if (p && last) {
    const v = (Math.hypot(p.x - last.x, p.y - last.y) / dt) * K.U;
    if (v > SWEEP) kick(Lf, K, last.x, last.y, p.x, p.y, clamp((v - SWEEP) / 900 + 0.35, 0.35, 1), false);
  }

  // Leaves in the air flutter down, carried along by any gust. One the wind tumbles along the turf into the trunk drops
  // at its foot; one sent flying goes by in front of it.
  const lo = isle.x0 + iw * 0.03,
    hi = isle.x0 + iw * 0.97,
    foot = 10 * s;
  for (const a of Pi.air) {
    const g = gust(W, K, a.x),
      was = a.x;
    a.vy = Math.min(a.vy + 300 * s * dt, 40 * s);
    a.vx += (110 * g * s - a.vx) * Math.min(1, 1.6 * dt);
    a.ph += dt * 5;
    a.rot += a.spin * dt;
    a.x += (a.vx + (a.vy > 0 ? Math.cos(a.ph) * 14 * s : 0)) * dt;
    a.y += a.vy * dt;
    if (!a.kicked && ((was <= T.x - foot && a.x >= T.x - foot) || (was >= T.x + foot && a.x <= T.x + foot))) {
      a.x = T.x + Math.sign(was - T.x) * foot;
      a.vx = 0;
    }
    const gy = ground(K, a.x);
    if (a.vy <= 0) continue;
    // Off the ends of the island it falls on past, into the clouds.
    if (a.x < lo || a.x > hi) {
      a.gone = a.y > K.HZ + 60;
      continue;
    }
    // A leaf sent flying lands on the turf, even where the pile was; only one the wind blows back stays on the pile.
    const onPile = !a.kicked && Math.abs(a.x - Pi.cx) < Pi.hw;
    if (a.y < gy - (onPile ? height(Pi, K, a.x) : 0)) continue;
    a.gone = true;
    if (!(onPile && fill(Pi, a.x, a.col, a.age)))
      Pi.loose.push({
        x: a.x,
        y: gy - rnd() * 1.5 * s,
        rot: a.rot,
        size: a.size,
        sq: 0.35 + rnd() * 0.25,
        col: a.col,
        age: a.age,
      });
  }

  // A gust picks up the leaves lying on the turf and tumbles them along.
  for (const l of Pi.loose) {
    const g = gust(W, K, l.x);
    if (Math.abs(g) < 0.3 || rnd() > dt * 2 * Math.abs(g)) continue;
    l.gone = true;
    Pi.air.push({
      x: l.x,
      y: l.y - s,
      vx: 120 * g * s,
      vy: -(25 + 50 * rnd() * Math.abs(g)) * s,
      rot: l.rot,
      spin: (rnd() - 0.5) * 10,
      ph: rnd() * TAU,
      size: l.size,
      col: l.col,
      age: l.age,
    });
  }
  Pi.air = Pi.air.filter((a) => !a.gone);
  Pi.loose = Pi.loose.filter((l) => !l.gone);

  // One crunch for a sweep's worth of leaves, louder the more there were.
  Pi.quiet -= dt;
  if (Pi.acc && Pi.quiet <= 0) {
    Lf.sfx.push(["crunch", Pi.ax, clamp(Pi.acc / 14, 0.2, 1)]);
    Pi.acc = 0;
    Pi.quiet = 0.12;
  }
}

function colour(col, age, shade, P) {
  const c = mixc(mixc(LEAVES[col], FADED, age), SHADE, shade);
  return rgba(P.night ? mixc(c, P.rock, 0.45) : c);
}

// The pile, painted at `k` pixels to the unit into a canvas of its own, which a frame copies across whole. It is only
// painted again when a leaf comes or goes: filling ninety leaves every frame would cost a few tenths of a millisecond.
function paintPile(Pi, K, P, k) {
  const cv = (Pi.cv ||= makeCanvas()),
    w = Math.ceil(Pi.bw * k),
    h = Math.ceil(Pi.bh * k),
    c = cv.getContext("2d"),
    leaf = mapleLeaf();
  if (cv.width !== w || cv.height !== h) [cv.width, cv.height] = [w, h];
  else c.clearRect(0, 0, w, h);
  const n = Math.ceil((Pi.hw * 2) / (3 * K.s));
  Pi.tops = new Array(n).fill(0);
  for (const sl of Pi.slots) {
    if (!sl.on) continue;
    const [x, y] = at(K, sl),
      z = sl.size * 1.2 * k,
      cs = Math.cos(sl.rot) * z,
      sn = Math.sin(sl.rot) * z;
    // Lying on the pile, so seen from the side: turned in its own plane, then flattened.
    c.setTransform(cs, sl.sq * sn, -sn, sl.sq * cs, (x - Pi.bx) * k, (y - Pi.by) * k);
    c.fillStyle = colour(sl.col, sl.age, 0.35 * (1 - sl.rel), P);
    c.fill(leaf);
    // How high the pile stands, across the whole width of the leaf.
    const bin = (x) => clamp(Math.floor((x - Pi.cx + Pi.hw) / (3 * K.s)), 0, n - 1);
    for (let i = bin(sl.x - sl.size * 0.8); i <= bin(sl.x + sl.size * 0.8); i++)
      Pi.tops[i] = Math.max(Pi.tops[i], sl.h + sl.size * 0.6 * sl.sq);
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  [Pi.dirty, Pi.P, Pi.k] = [false, P, k];
}

// The pile, then the leaves lying loose on the turf and the ones in the air, which are few enough to draw each frame.
export function drawPile(c, Lf, K, P) {
  const Pi = Lf.pile;
  if (!Pi) return;
  const m = c.getTransform(),
    leaf = mapleLeaf(),
    { s } = K;
  if (Pi.dirty || Pi.P !== P || Pi.k !== m.a) paintPile(Pi, K, P, m.a);
  c.setTransform(1, 0, 0, 1, Math.round(m.a * Pi.bx + m.e), Math.round(m.d * Pi.by + m.f));
  c.drawImage(Pi.cv, 0, 0);
  c.setTransform(m);
  for (const l of Pi.loose) {
    c.save();
    c.translate(l.x, l.y);
    c.scale(1, l.sq);
    c.rotate(l.rot);
    c.scale(l.size * 1.2, l.size * 1.2);
    c.fillStyle = colour(l.col, l.age, 0, P);
    c.fill(leaf);
    c.restore();
  }
  // Tumbling, a leaf narrows and widens as it turns over.
  for (const a of Pi.air) {
    c.save();
    c.translate(a.x, a.y);
    c.rotate(a.rot);
    c.scale(a.size * 1.2, a.size * 1.2 * (0.25 + 0.75 * Math.abs(Math.sin(a.ph))));
    c.fillStyle = colour(a.col, a.age, 0, P);
    c.fill(leaf);
    c.restore();
  }
  for (let u = -0.6; u < 0.7; u += 0.3) {
    const x = Pi.cx + u * Pi.hw,
      h = height(Pi, K, x);
    if (h > 3 * s) Lf.hits.push(["leaves", x, ground(K, x) - h * 0.5, h * 0.5 + 6 * s, D_ISLE]);
  }
}
