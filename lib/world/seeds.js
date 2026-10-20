// Dandelion clocks in the meadow. A few stand in the long grass along the island's lip, and a sweep of the pointer
// through one, or a click on it, blows its seeds off. They drift down on the breeze, and a gust carries them along the
// island or off its end into the clouds. Wherever one comes down on the turf the page keeps the spot, and from the next
// day the visitor comes back a dandelion flowers there. A blown clock grows its seeds again after a while.

import { TAU, clamp, ell, makeCanvas, mixc, puff, rgba, seeded } from "./core";
import { clock } from "./critters";
import { gust } from "./wind";

// How fast, in pixels a second, the pointer has to sweep through a clock to blow it, as through the leaf pile.
const SWEEP = 240;
// How many seeds a clock holds, how long a blown one stands bare, and how long it takes to open again, in seconds.
const SEEDS = 9,
  REGROW = 60,
  OPEN = 3;
const STEM = [74, 104, 64],
  STEM_NIGHT = [60, 120, 104];

// `kept` is where the dandelions the visitor sowed on earlier days stand, each from 0 to 1 along the island.
export function makeSeeds(Lf, K, kept) {
  const { s, isle, iw } = K,
    flowers = (kept || [])
      .filter((u) => u >= 0 && u <= 1)
      .map((u) => {
        const x = isle.x0 + u * iw,
          rnd = seeded(Math.round(u * 1e4) + 1);
        return { x, y: isle.topAt(x) + 3 * s, h: (6 + rnd() * 7) * s, lean: (rnd() - 0.5) * 4 * s };
      });
  const bx = Math.min(...flowers.map((f) => f.x)) - 10 * s,
    by = Math.min(...flowers.map((f) => f.y - f.h)) - 10 * s;
  return {
    clocks: clocks(Lf, K),
    air: [],
    landed: [],
    last: null,
    rnd: seeded(Date.now()),
    flowers,
    bx,
    by,
    bw: Math.max(...flowers.map((f) => f.x)) + 10 * s - bx,
    bh: Math.max(...flowers.map((f) => f.y)) + 4 * s - by,
    cv: null,
    P: null,
    k: 0,
  };
}

// The clocks stand where the meadow is clear: away from the trunk and the leaf pile round its foot, the ruins and the
// arch, the armillary, the jar, the kite, the campfire, the waterfalls and the visitor's own tree, and apart from each
// other.
function clocks(Lf, K) {
  const { s, isle, iw, tree: T, arch: A } = K,
    rnd = seeded(61),
    keep = [
      [T.x - 15 * s, 70 * s],
      [K.ruins.x, K.ruins.r + 10 * s],
      [(A.x1 + A.x2) / 2, (A.x2 - A.x1) / 2 + 12 * s],
      [K.arm.x, 30 * s],
      [Lf.play.jar.x, 20 * s],
      [Lf.kite.sx + 12 * s, 22 * s],
      [Lf.toast.x - 6 * s, 30 * s],
      ...K.falls.map((f) => [f.x, 24 * s]),
      ...(Lf.sapling ? [[Lf.sapling.x, 20 * s]] : []),
    ],
    out = [];
  for (let i = 0; i < 80 && out.length < (K.phone ? 4 : 6); i++) {
    const x = isle.x0 + iw * (0.1 + rnd() * 0.8);
    if (keep.some(([kx, r]) => Math.abs(x - kx) < r) || out.some((c) => Math.abs(c.x - x) < 40 * s)) continue;
    const y = isle.topAt(x) + 3 * s,
      h = (15 + rnd() * 7) * s,
      lean = (rnd() - 0.5) * 4 * s;
    out.push({ x, y, h, lean, hx: x + lean, hy: y - h, ph: rnd() * TAU, k: 1, bare: 0 });
  }
  return out;
}

// Sends a clock's seeds off the way the pointer went, `str` hard, from 0 to 1.
function blow(Lf, K, cl, dir, str) {
  const S = Lf.seeds,
    { s } = K,
    rnd = S.rnd;
  for (let i = 0; i < SEEDS; i++) {
    const a = rnd() * TAU;
    S.air.push({
      x: cl.hx + Math.cos(a) * 4 * s,
      y: cl.hy + Math.sin(a) * 4 * s,
      vx: (dir * (30 + 110 * str * rnd()) + (rnd() - 0.5) * 30) * s,
      vy: -(15 + 55 * str * rnd()) * s,
      ph: rnd() * TAU,
      age: 0,
      land: -1,
    });
  }
  Object.assign(cl, { k: 0, bare: REGROW });
  Lf.sfx.push(["poof", cl.hx]);
}

// Where along the island a seed came down, for the page to keep.
const along = (K, x) => Math.round(((x - K.isle.x0) / K.iw) * 1e4) / 1e4;

/** A click at (x, y) on the island's layer. On a clock in seed it blows the seeds off and returns true. In a world held
 * still they come down at once, a little way downwind. */
export function blowAt(Lf, K, x, y, still) {
  const S = Lf.seeds,
    { s, isle, iw } = K,
    cl = S.clocks.find((c) => c.k >= 1 && Math.hypot(x - c.hx, y - c.hy) < 9 * s);
  if (!cl) return false;
  blow(Lf, K, cl, 1, 0.6);
  if (still)
    for (const a of S.air.splice(0)) {
      const lx = a.x + (S.rnd() * 1.4 - 0.3) * 60 * s;
      if (lx > isle.x0 + iw * 0.04 && lx < isle.x0 + iw * 0.96) S.landed.push(along(K, lx));
    }
  return true;
}

// `p` is the pointer on the island's layer, or null.
export function updateSeeds(Lf, K, dt, p) {
  const S = Lf.seeds,
    { s, isle, iw } = K,
    t = Lf.t;
  for (const cl of S.clocks) if (cl.k < 1 && (cl.bare -= dt) <= 0) cl.k = Math.min(1, cl.k + dt / OPEN);

  // The pointer sweeping through a clock blows it the way it went.
  const last = S.last;
  S.last = p;
  if (p && last && dt) {
    const dx = p.x - last.x,
      dy = p.y - last.y,
      len = dx * dx + dy * dy,
      v = (Math.sqrt(len) / dt) * K.U;
    if (v > SWEEP)
      for (const cl of S.clocks) {
        const u = clamp(((cl.hx - last.x) * dx + (cl.hy - last.y) * dy) / len, 0, 1);
        if (cl.k >= 1 && Math.hypot(last.x + dx * u - cl.hx, last.y + dy * u - cl.hy) < 9 * s)
          blow(Lf, K, cl, Math.sign(dx) || 1, clamp((v - SWEEP) / 900 + 0.35, 0.35, 1));
      }
  }

  // Each seed hangs from its own little parachute, so it drifts down slowly on the breeze, and a gust takes it. One
  // that comes down on the turf is kept; one that went off the end falls on into the clouds.
  const lo = isle.x0 + iw * 0.04,
    hi = isle.x0 + iw * 0.96;
  for (const a of S.air) {
    a.age += dt;
    if (a.land >= 0) {
      a.land += dt;
      continue;
    }
    a.vx += ((8 + 60 * gust(Lf.wind, K, a.x)) * s - a.vx) * dt * 0.8;
    a.vy += (9 * s - a.vy) * dt * 1.2;
    a.x += a.vx * dt + Math.sin(t * 2.3 + a.ph) * 6 * s * dt;
    a.y += a.vy * dt;
    const top = isle.topAt(a.x);
    if (a.vy > 0 && a.x > lo && a.x < hi && a.y > top && a.y < top + 6 * s) {
      a.land = 0;
      S.landed.push(along(K, a.x));
    }
  }
  S.air = S.air.filter((a) => (a.land < 0 ? a.age < 30 && a.y < K.HZ + 60 : a.land < 1.5));
}

// The dandelions, painted at `k` pixels to the unit into a canvas of their own, which a frame copies across whole: a
// stalk, two leaves at its foot and a yellow head, which glows a little after dark, as the meadow's flowers do.
function paintFlowers(S, K, P, k) {
  const cv = (S.cv ||= makeCanvas()),
    c = cv.getContext("2d"),
    { s } = K,
    head = P.night ? [255, 230, 120] : [255, 204, 46],
    middle = P.night ? [240, 180, 70] : [226, 146, 26],
    leaf = P.night ? STEM_NIGHT : STEM;
  cv.width = Math.ceil(S.bw * k);
  cv.height = Math.ceil(S.bh * k);
  c.setTransform(k, 0, 0, k, -S.bx * k, -S.by * k);
  c.fillStyle = rgba(leaf);
  c.beginPath();
  for (const { x, y } of S.flowers) {
    ell(c, x - 2 * s, y - 0.8 * s, 2.4 * s, 0.7 * s, 0.4);
    ell(c, x + 2 * s, y - 0.8 * s, 2.4 * s, 0.7 * s, -0.4);
  }
  c.fill();
  c.strokeStyle = rgba(mixc(leaf, [0, 0, 0], 0.15));
  c.lineWidth = 0.8 * s;
  c.beginPath();
  for (const { x, y, h, lean } of S.flowers) {
    c.moveTo(x, y);
    c.quadraticCurveTo(x + lean * 0.2, y - h * 0.5, x + lean, y - h);
  }
  c.stroke();
  for (const { x, y, h, lean } of S.flowers) {
    if (P.night) {
      c.globalCompositeOperation = "lighter";
      puff(c, x + lean, y - h, 9 * s, head, 0.3);
      c.globalCompositeOperation = "source-over";
    }
    c.fillStyle = rgba(head);
    c.beginPath();
    ell(c, x + lean, y - h, 2.6 * s, 2.2 * s, 0);
    c.fill();
    c.fillStyle = rgba(middle);
    c.beginPath();
    ell(c, x + lean, y - h, 1 * s, 0.9 * s, 0);
    c.fill();
  }
  [S.P, S.k] = [P, k];
}

// The dandelions, the clocks bending in the wind, and the seeds in the air, landed ones fading into the grass.
export function drawSeeds(c, Lf, K, P, t) {
  const S = Lf.seeds,
    { s } = K,
    m = c.getTransform();
  if (S.flowers.length) {
    if (S.P !== P || S.k !== m.a) paintFlowers(S, K, P, m.a);
    c.setTransform(1, 0, 0, 1, Math.round(m.a * S.bx + m.e), Math.round(m.d * S.by + m.f));
    c.drawImage(S.cv, 0, 0);
    c.setTransform(m);
  }

  const img = clock(S, P),
    heads = S.clocks.map((cl) => {
      const g = gust(Lf.wind, K, cl.x);
      return [cl.hx + g * 5 * s + Math.sin(t * 1.7 + cl.ph) * 0.5 * s, cl.hy + Math.abs(g) * 1.2 * s];
    });
  c.strokeStyle = rgba(P.night ? STEM_NIGHT : STEM);
  c.lineWidth = 0.8 * s;
  c.beginPath();
  S.clocks.forEach((cl, i) => {
    const [x, y] = heads[i];
    c.moveTo(cl.x, cl.y);
    c.quadraticCurveTo(cl.x + cl.lean * 0.2, cl.y - cl.h * 0.5, x, y);
  });
  c.stroke();
  // A bare clock is only its head, until its seeds come back.
  c.fillStyle = rgba(P.night ? [120, 170, 150] : [196, 176, 120]);
  c.beginPath();
  S.clocks.forEach((cl, i) => cl.k < 1 && ell(c, heads[i][0], heads[i][1], 1.3 * s, 1.3 * s, 0));
  c.fill();
  S.clocks.forEach((cl, i) => {
    if (!cl.k) return;
    const w = 14 * s * (0.5 + 0.5 * cl.k);
    c.globalAlpha = cl.k;
    c.drawImage(img, heads[i][0] - w / 2, heads[i][1] - w / 2, w, w);
  });
  c.globalAlpha = 1;

  if (S.air.length) {
    c.strokeStyle = rgba(P.night ? [214, 250, 240] : [255, 252, 244]);
    c.lineWidth = 0.6 * s;
    for (const a of S.air) {
      const { x, y } = a;
      c.globalAlpha = a.land >= 0 ? 1 - a.land / 1.5 : Math.min(1, (30 - a.age) / 1.5);
      c.beginPath();
      c.moveTo(x, y + 3 * s);
      c.lineTo(x, y);
      for (const dx of [-2, 0, 2]) {
        c.moveTo(x, y);
        c.lineTo(x + dx * s, y - (dx ? 1.6 : 2.2) * s);
      }
      c.stroke();
    }
    c.globalAlpha = 1;
  }
}
