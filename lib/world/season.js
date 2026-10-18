// The world keeps the visitor's calendar. The lantern tree is a maple: its leaves turn red, orange and gold through
// autumn and blow off it, in spring it lets go of its seeds, which spin down like little helicopters, and in winter snow
// falls, settling on the island the longer the visitor stays. Summer is the world as it always is. A click catches a
// falling leaf, for the page to press in the field guide, and sends a seed spinning back up.
// A few times a year it dresses up too: Halloween week, and New Year's Eve and Day, when a click on the sky sends up
// a firework.

import { LEAVES, mapleLeaf } from './calendar';
import { PAL, TAU, clamp, dab, mixc, rgba, sprite } from './core';
import { gust } from './wind';

// The maple's turned leaves, from crimson through scarlet and orange to gold, by day and by night.
export const MAPLE = {
  dusk: [[168, 30, 36], [212, 58, 38], [236, 112, 42], [244, 170, 62]],
  night: [[92, 22, 36], [124, 34, 40], [146, 62, 42], [156, 98, 52]],
};

// How each season recolours the leaves, over the theme's own: turned leaves in autumn, fresh green in spring and frost
// in winter. At night the leaves' glow changes colour instead. The maple's own autumn colours are MAPLE.
const TINTS = {
  autumn: { dusk: { leafMid: [124, 92, 46], leafLit: [255, 184, 96] }, night: { leafMid: [40, 40, 40], leafLit: [236, 168, 100] } },
  spring: { dusk: { leafMid: [74, 132, 76], leafLit: [232, 244, 170] }, night: { leafLit: [150, 232, 168] } },
  winter: { dusk: { leafMid: [70, 98, 98], leafLit: [240, 244, 240] }, night: { leafLit: [200, 232, 255] } },
};

/** The theme's palette, recoloured for the season. `turn` is how far the maple has turned, in autumn. */
export function palette(night, season, turn = 1) {
  const P = night ? PAL.night : PAL.dusk;
  return { ...P, ...TINTS[season]?.[night ? 'night' : 'dusk'], turn: season === 'autumn' ? turn : 0 };
}

// Something that falls from the tree's crown: a leaf or a seed. Spread through its fall at the start, so the first
// frame already looks like it has been going a while.
function fromTree(K, rnd, spread) {
  const T = K.tree, a = rnd() * TAU, r = Math.sqrt(rnd()) * T.r * .75;
  return {
    x: T.cx + Math.cos(a) * r, y: T.cy + Math.sin(a) * r * .6 + (spread ? rnd() * (K.HZ - T.cy) : 0),
    vy: 18 + rnd() * 16, sway: 14 + rnd() * 22, ph: rnd() * TAU, spin: 2 + rnd() * 3, size: (4 + rnd() * 3) * K.s, col: rnd(), up: null,
  };
}

function flake(K, rnd, spread) {
  return {
    x: -K.EX + rnd() * (K.WU + K.EX * 2), y: spread ? -K.EX + rnd() * (1000 + K.EX * 2) : -K.EX - rnd() * 60,
    vy: 22 + rnd() * 30, sway: 6 + rnd() * 14, ph: rnd() * TAU, size: 2.5 + rnd() * rnd() * 6,
  };
}

export function makeSeason(K, name, turn = 1) {
  const rnd = Math.random, S = { name, turn, bits: [], settle: 0, caps: null, rockets: [], bursts: [] };
  if (name === 'autumn') for (let i = 0; i < 26; i++) S.bits.push(fromTree(K, rnd, true));
  if (name === 'spring') for (let i = 0; i < 18; i++) S.bits.push(fromTree(K, rnd, true));
  if (name === 'winter') for (let i = 0; i < (K.phone ? 90 : 180); i++) S.bits.push(flake(K, rnd, true));
  return S;
}

// A click near a leaf or seed as it falls, in island-layer units. A leaf is caught, and the tree drops another in its
// place; a seed spins back up into the crown, unless the world is held still. Returns the leaf or seed, if any.
export function catchBit(S, K, x, y, still) {
  if (S.name !== 'autumn' && (S.name !== 'spring' || still)) return null;
  let best = -1, bd = 20 * Math.max(K.s, .7);
  S.bits.forEach((b, i) => {
    const d = Math.hypot(b.x - x, b.y - y);
    if (d < bd && b.up == null && b.y < K.HZ + 30) [best, bd] = [i, d];
  });
  if (best < 0) return null;
  const b = S.bits[best], T = K.tree;
  if (S.name === 'autumn') S.bits[best] = fromTree(K, Math.random, false);
  else b.up = Math.min(b.y - 30 * K.s, T.cy + (Math.random() - .5) * T.r * .5);
  return b;
}

// A gust blows whatever is falling along with it, holds it up a little, and sets leaves and seeds tumbling faster. A
// seed sent back up rises fast at first and slows as it nears the top, whirling faster the faster it goes, then falls
// again.
export function updateSeason(S, K, dt, sfx, W) {
  const rnd = Math.random;
  S.bits.forEach((b, i) => {
    const g = gust(W, K, b.x);
    b.ph += dt * (S.name === 'winter' ? .8 : 1.6 + 2.4 * Math.abs(g));
    if (b.up != null) {
      const v = clamp((b.y - b.up) * 1.6, 14, 130);
      b.y -= v * dt;
      b.ph += dt * v * .03;
      if (b.y <= b.up) b.up = null;
    } else b.y += b.vy * (1 - .5 * Math.abs(g)) * dt;
    b.x += Math.cos(b.ph) * b.sway * dt + (S.name === 'winter' ? 45 * g : 9 + 70 * g) * dt;
    if (S.name === 'winter' ? b.y > 1000 + K.EX : b.y > K.HZ + 60) S.bits[i] = S.name === 'winter' ? flake(K, rnd, false) : fromTree(K, rnd, false);
  });
  // The snow settles over the first minute or two of a visit.
  if (S.name === 'winter') S.settle = Math.min(1, S.settle + dt / 90);
  updateFireworks(S, K, dt, sfx);
}

// Snow lying on the island: a drift along the turf, a cap on the top of each part of the tree's crown, and a line along
// the arch. Built once, then drawn more opaque as the snow settles.
function snowCaps(K) {
  const { s, isle, tree: T, arch } = K, p = new Path2D(), rnd = Math.random;
  const xs = [];
  for (let x = isle.x0 + 6 * s; x <= isle.x0 + K.iw - 6 * s; x += 5 * s) xs.push(x);
  p.moveTo(xs[0], isle.topAt(xs[0]) + 2 * s);
  for (const x of xs) p.lineTo(x, isle.topAt(x) - (2.4 + rnd() * 1.6) * s);
  for (let i = xs.length - 1; i >= 0; i--) p.lineTo(xs[i], isle.topAt(xs[i]) + 2 * s);
  p.closePath();
  // On the crown, snow lies along the top of each leaf cluster wherever open sky is right above it: a crescent that
  // hugs the cluster's edge, thickest at the top and thinning to nothing at the ends.
  const inLeaves = (x, y) => T.clusters.some(([cx, cy, R]) => ((x - cx) / R) ** 2 + ((y - cy) / (R * .85)) ** 2 < 1);
  const N = 18;
  for (const [cx, cy, R] of T.clusters) {
    const at = (a, dr, dy) => [cx + Math.cos(a) * (R + dr), cy + dy + Math.sin(a) * (R * .85 + dr)];
    let run = [];
    const lay = () => {
      if (run.length >= 3) {
        const lump = run.map(() => (rnd() - .3) * 1.4 * s);
        run.forEach((a, i) => (i ? p.lineTo : p.moveTo).call(p, ...at(a, 3 * s + lump[i], 0)));
        for (let i = run.length - 1; i >= 0; i--) p.lineTo(...at(run[i], s, 2.5 * s));
        p.closePath();
      }
      run = [];
    };
    for (let i = 0; i <= N; i++) {
      const a = Math.PI * (1.15 + .7 * i / N), [x, y] = at(a, 3 * s, 0);
      if (inLeaves(x, y - 4 * s)) lay();
      else run.push(a);
    }
    lay();
  }
  p.moveTo(arch.mx + Math.cos(Math.PI + .7) * arch.rr, arch.my + Math.sin(Math.PI + .7) * arch.rr);
  p.arc(arch.mx, arch.my, arch.rr + 2.5 * s, Math.PI + .7, -.7);
  p.arc(arch.mx, arch.my, arch.rr - .5 * s, -.7, Math.PI + .7, true);
  p.closePath();
  return p;
}

// Leaves and seeds, drawn on the island layer. A leaf turns over as it falls, so it narrows and widens. A seed spins
// round under its one wing like a little helicopter, so the wing seems to swing from side to side.
const WING = [214, 200, 136], NUT = [150, 108, 64];
const dim = (col, P) => (P.night ? mixc(col, P.rock, .45) : col);
// A falling leaf's colour as drawn, darker after dark.
export const leafColour = (b, P) => dim(LEAVES[Math.floor(b.col * LEAVES.length)], P);
// How far a falling leaf is turned toward the viewer, from .25 edge-on to 1 face-on.
export const leafFlip = b => .25 + .75 * Math.abs(Math.sin(b.ph * b.spin * .5));
export function drawSeasonIsle(c, S, K, P) {
  if (S.name !== 'autumn' && S.name !== 'spring') return;
  for (const b of S.bits) {
    const fade = clamp((K.HZ + 60 - b.y) / 120, 0, 1);
    if (S.name === 'autumn') {
      c.fillStyle = rgba(leafColour(b, P), .9 * fade);
      c.save();
      c.translate(b.x, b.y);
      c.rotate(b.ph);
      c.scale(b.size * 1.2, b.size * 1.2 * leafFlip(b));
      c.fill(mapleLeaf());
      c.restore();
    } else {
      const a = b.ph * b.spin * 2.5, w = b.size * 2.2, sw = Math.cos(a) * w * .5;
      c.fillStyle = rgba(dim(WING, P), .85 * fade);
      c.beginPath();
      c.ellipse(b.x + sw, b.y - w * .1, Math.abs(sw) + w * .07, w * .19, Math.sin(a) * .25, 0, TAU);
      c.fill();
      c.fillStyle = rgba(dim(NUT, P), .9 * fade);
      c.beginPath();
      c.arc(b.x, b.y, w * .13, 0, TAU);
      c.fill();
    }
  }
}

// Snow lying on the island, drawn on the island layer.
export function drawSnowCaps(c, S, K, P) {
  if (S.name !== 'winter' || S.settle <= 0) return;
  S.caps ||= snowCaps(K);
  c.fillStyle = rgba(P.night ? [196, 222, 236] : [252, 250, 246], .92 * S.settle * S.settle * (3 - 2 * S.settle));
  c.fill(S.caps);
}

// Snow, drawn on the front layer over everything else.
export function drawSeasonFront(c, S, K, P) {
  if (S.name !== 'winter') return;
  const s = sprite([255, 255, 255]), a = P.night ? .75 : .95;
  c.fillStyle = rgba([255, 255, 255], a * .9);
  for (const b of S.bits) {
    dab(c, s, b.x, b.y, b.size * 1.6, a * .6);
    c.fillRect(b.x - b.size * .3, b.y - b.size * .3, b.size * .6, b.size * .6);
  }
}

// New Year: fireworks. A click on the sky sends a rocket up from the clouds below it, which bursts where the click was.
// Rockets and sparks live on the back layer, behind everything but the far sky.
const FIREWORK = [[255, 214, 140], [255, 150, 190], [140, 226, 255], [180, 255, 170], [255, 250, 235]];

// Returns false when the sky is already full of them, so a burst of clicks can't pile up more than it holds.
export function launch(S, K, x, y) {
  if (S.rockets.length + S.bursts.length >= 8) return false;
  // The two shells always differ in colour.
  const rnd = Math.random, n = FIREWORK.length, a = Math.floor(rnd() * n), b = (a + 1 + Math.floor(rnd() * (n - 1))) % n;
  S.rockets.push({ x0: x + (rnd() - .5) * 60, y0: K.HZ + 20, x, y, k: 0, dur: .8 + rnd() * .3, cols: [FIREWORK[a], FIREWORK[b]] });
  return true;
}

function updateFireworks(S, K, dt, sfx) {
  if (!S.rockets.length && !S.bursts.length) return;
  const rnd = Math.random, ss = Math.max(K.s, .7);
  for (const r of S.rockets) {
    if ((r.k += dt / r.dur) < 1) continue;
    // Two shells: a wide outer ring in one colour around a tighter inner ring in the other.
    const n = 64 + Math.floor(rnd() * 20), v0 = (210 + rnd() * 70) * ss, sparks = [];
    for (let i = 0; i < n; i++) {
      const inner = i % 3 === 0, a = (i / n) * TAU + rnd() * .15, v = v0 * (inner ? .42 + rnd() * .12 : .88 + rnd() * .14);
      sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col: inner ? 1 : 0, tw: rnd() * TAU });
    }
    S.bursts.push({ x: r.x, y: r.y, age: 0, life: 2.4 + rnd() * .6, cols: r.cols, sparks });
    sfx.push(['firework', r.x]);
  }
  S.rockets = S.rockets.filter(r => r.k < 1);
  const drag = Math.pow(.25, dt);
  for (const b of S.bursts) {
    b.age += dt;
    for (const p of b.sparks) {
      p.vx *= drag;
      p.vy = p.vy * drag + 40 * ss * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }
  S.bursts = S.bursts.filter(b => b.age < b.life);
}

export function drawSeasonBack(c, S, K, P, t) {
  if (!S.rockets.length && !S.bursts.length) return;
  const gs = sprite(P.light);
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  // A rocket is a bright head with a short trail behind it, slowing as it climbs.
  for (const r of S.rockets) {
    const e = 1 - (1 - r.k) * (1 - r.k), x = r.x0 + (r.x - r.x0) * e, y = r.y0 + (r.y - r.y0) * e, back = Math.max(0, e - .08);
    c.strokeStyle = rgba(r.cols[0], .45);
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(r.x0 + (r.x - r.x0) * back, r.y0 + (r.y - r.y0) * back);
    c.lineTo(x, y);
    c.stroke();
    dab(c, gs, x, y, 5, .8);
  }
  // A burst: a flash where it opened, then sparks that streak outward, droop and twinkle out.
  const ss = Math.max(K.s, .7);
  for (const b of S.bursts) {
    const k = b.age / b.life, fade = 1 - k * k, cs = [sprite(b.cols[0]), sprite(b.cols[1])];
    // The flash lights a patch of sky in the burst's colour, which lingers as the sparks spread.
    dab(c, cs[0], b.x, b.y, (90 + 150 * Math.min(1, b.age)) * ss, (b.age < .15 ? .5 : .22) * fade * fade);
    // While the sparks are young each one glows, so the burst reads as light rather than lines.
    if (b.age < .9) for (const p of b.sparks) dab(c, cs[p.col], p.x, p.y, 9 * ss, .35 * (1 - b.age / .9));
    for (const ci of [0, 1]) {
      c.strokeStyle = rgba(b.cols[ci], .9 * fade);
      c.lineWidth = 2 * ss;
      c.beginPath();
      for (const p of b.sparks) {
        if (p.col !== ci || (k > .5 && Math.sin(t * 30 + p.tw) < 0)) continue;
        // A trail that shrinks as the spark slows, but never to nothing.
        const v = Math.hypot(p.vx, p.vy) || 1, l = Math.max(v * .07, 3 * ss) / v;
        c.moveTo(p.x - p.vx * l, p.y - p.vy * l);
        c.lineTo(p.x, p.y);
      }
      c.stroke();
    }
  }
  c.globalCompositeOperation = 'source-over';
}
