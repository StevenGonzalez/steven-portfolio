// The visitor's own tree. A click on bare turf plants a sapling there, once. The page keeps where in this browser, and
// on each later day the visitor comes back it is a stage bigger: a sprout, a sapling, a young tree, a small tree, and
// last a small tree with a lantern of its own.

import { TAU, clamp, dab, ell, makeCanvas, mixc, puff, rgba, rimLight, seeded, sprite, taper } from './core';
import { D_ISLE } from './layers';
import { ease } from './story';

// How tall each stage stands, in units of the island's scale, and how long a new sprout takes to come up, in seconds.
const TALL = [18, 26, 36, 50, 62];
const SPROUT = 2.4;

// `m` is what the page kept: where along the island it was planted, from 0 to 1, and how many stages it has grown.
export function makeSapling(K, m) {
  return m ? place(K, m.u, m.age, 1) : null;
}

function place(K, u, age, k) {
  const x = K.isle.x0 + u * K.iw;
  return { u, x, y: K.isle.topAt(x) + 2 * K.s, age: clamp(age | 0, 0, TALL.length - 1), k, ph: u * 40, shake: 0 };
}

// Plants a sapling where a click landed, if there is none yet and the spot is bare turf: clear of the trunk, the
// ruins, the armillary, the jar, the kite, the campfire and the waterfalls, and not out on the hanging meadow at either
// end. There is only ever the one, so once it is planted, a click on bare turf gives it a shake instead, to show where
// it is.
export function plantAt(Lf, K, x, y) {
  const { s, isle, iw } = K, u = (x - isle.x0) / iw, top = isle.topAt(x);
  if (u < .1 || u > .9 || y < top - 30 * s || y > top + 8 * s) return false;
  const keep = [[K.tree.x, 50 * s], [K.ruins.x, K.ruins.r + 10 * s], [K.arm.x, 30 * s], [Lf.play.jar.x, 20 * s], [Lf.kite.sx + 12 * s, 22 * s], [Lf.toast.x - 6 * s, 30 * s], ...K.falls.map(f => [f.x, 24 * s])];
  if (keep.some(([kx, r]) => Math.abs(x - kx) < r)) return false;
  if (Lf.sapling) {
    if (Lf.sapling.shake < .5) Lf.sfx.push(['sprout', Lf.sapling.x]);
    Lf.sapling.shake = 1;
    return false;
  }
  Lf.sapling = place(K, u, 0, 0);
  Lf.sfx.push(['plant', x]);
  return true;
}

export function updateSapling(Lf, dt) {
  const S = Lf.sapling;
  if (S && S.k < 1) S.k = Math.min(1, S.k + dt / SPROUT);
  if (S) S.shake = Math.max(0, S.shake - dt / 1.2);
}

// The tree for its stage and the theme, painted once at the most the layer is ever drawn at, 1.25 pixels to the unit,
// with its foot in the middle, `oy` down from the canvas's top. Each visitor's grows its own way, seeded by where it
// was planted.
function paintSapling(S, K, P) {
  const s = K.s, a = S.age, tall = TALL[a] * s, w = Math.max(26 * s, tall * 1.1), h = tall + 10 * s, q = 1.25 * K.U;
  const cv = makeCanvas(), c = cv.getContext('2d'), rnd = seeded(1 + Math.floor(S.u * 9973));
  cv.width = Math.ceil(w * q);
  cv.height = Math.ceil(h * q);
  c.setTransform(q, 0, 0, q, (w / 2) * q, (h - 4 * s) * q);
  // Which way the light is, as seen from the middle of the tree.
  let lx = K.L.x - S.x, ly = K.L.y - (S.y - tall * .6);
  const ld = Math.hypot(lx, ly) || 1;
  lx /= ld;
  ly /= ld;
  const lean = (rnd() - .5) * 4 * s, wood = new Path2D(), leaves = [], crown = [];
  if (a < 2) {
    // A stem with leaves up it, in pairs on a sprout and turn about on a sapling.
    taper(0, 0, lean * .3, -tall * .5, lean, -tall, (1.8 + a * .6) * s, .8 * s, wood);
    const n = a ? 5 : 1;
    for (let i = 0; i < n; i++) {
      const v = a ? .35 + (.65 * i) / (n - 1) : 1, x = lean * v * v, y = -tall * v;
      for (const sd of a ? [i % 2 ? 1 : -1] : [-1, 1]) leaves.push([x + sd * (a ? 3.8 : 4.6) * s, y - 1.2 * s, (a ? 4 : 5) * s, sd]);
    }
  } else {
    // A trunk that forks into a few limbs, each ending in a cluster of leaves round the crown.
    const cx = lean * 1.6, cy = -tall * .7, R = tall * (.2 + .02 * a), fork = -tall * (.42 + .05 * rnd());
    taper(0, 3 * s, lean * .4, fork * .5, lean, fork, (2.6 + a * 1.3) * s, (1.4 + a * .45) * s, wood);
    const n = [0, 0, 3, 5, 7][a];
    for (let i = 0; i < n; i++) {
      const ang = -Math.PI / 2 + (i / (n - 1) - .5) * 2.6 + (rnd() - .5) * .3, d = R * (.55 + rnd() * .35);
      const ex = cx + Math.cos(ang) * d, ey = cy + Math.sin(ang) * d * .8;
      taper(lean, fork, (lean + ex) / 2, (fork + ey) / 2 + 2 * s, ex, ey, (1.2 + a * .35) * s, .5 * s, wood);
      crown.push([ex, ey - 2 * s, R * (.5 + rnd() * .25)]);
    }
    crown.push([cx, cy - R * .2, R * .7]);
    // Its lantern hangs from the lowest limb on the light's side.
    if (a === 4) {
      const [bx, by] = crown.filter(([x]) => Math.sign(x - cx) === Math.sign(lx) || !lx).sort((p, q) => q[1] - p[1])[0] || crown[0];
      S.lantern = [bx, by + 12 * s, bx, by + 2 * s];
    }
  }
  // New growth comes up fresh green whatever the season, so a young one stands out from the grass round it.
  const [mid, lit0] = P.night ? [[22, 74, 64], [110, 230, 170]] : [[70, 132, 70], [184, 226, 124]];
  c.fillStyle = rgba(a < 2 ? mixc(P.leafDark, mid, .7) : mixc(P.leafDark, P.rock, .45));
  c.fill(wood);
  rimLight(c, r => r.fill(wood), -lx * .8 * s, -ly * .8 * s, P.rim, .8);
  for (const [x, y, r, sd] of leaves) {
    const lit = clamp(.62 + .38 * sd * lx, 0, 1);
    c.fillStyle = rgba(lit < .5 ? mixc(P.leafDark, mid, lit * 2) : mixc(mid, lit0, (lit - .5) * 2));
    c.beginPath();
    ell(c, x, y, r, r * .45, sd * -.5);
    c.fill();
  }
  // Leaf clusters the way the big tree's are painted: a dark mass, then dabs lit by which way they face the light.
  for (const [cx, cy, R] of crown) {
    puff(c, cx, cy + R * .1, R * 1.1, P.leafDark, .9);
    const dabs = [];
    for (let i = 0; i < 26 + R / s; i++) {
      const ang = rnd() * TAU, rr = Math.sqrt(rnd()), nx = Math.cos(ang) * rr, ny = Math.sin(ang) * rr, facing = nx * lx + ny * ly;
      const lit = P.night ? clamp(.12 + .5 * facing - .12 * ny, 0, 1) : clamp(.3 + .5 * facing + .3 * (nx * nx + ny * ny) * Math.max(.25, facing) - .15 * ny, 0, 1);
      dabs.push([cx + nx * R, cy + ny * R * .85, lit, rnd()]);
    }
    dabs.sort((p, q) => p[2] - q[2]);
    for (const [x, y, lit, r] of dabs) {
      c.fillStyle = rgba(lit < .5 ? mixc(P.leafDark, P.leafMid, lit * 2) : mixc(P.leafMid, P.leafLit, (lit - .5) * 2), .94);
      c.beginPath();
      c.ellipse(x, y, (2.6 + r * 3) * s, (1.5 + r * 1.3) * s, r * 7, 0, TAU);
      c.fill();
    }
  }
  if (S.lantern) {
    const [x, y, x0, y0] = S.lantern;
    c.strokeStyle = rgba(P.leafDark, .9);
    c.lineWidth = .7 * s;
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x, y - 2.6 * s);
    c.stroke();
    c.fillStyle = rgba(mixc(P.glow, [255, 255, 255], .35));
    c.beginPath();
    ell(c, x, y, 2 * s, 2.7 * s, 0);
    c.fill();
  }
  return { cv, w, h, oy: h - 4 * s };
}

// The tree swaying a little, the smaller the more, shaking when shaken, and a new one coming up out of the turf. Its
// lantern glows, brighter after dark.
export function drawSapling(c, Lf, K, P, t) {
  const S = Lf.sapling;
  if (!S) return;
  if (S.P !== P) {
    S.P = P;
    S.img = paintSapling(S, K, P);
  }
  const { cv, w, h, oy } = S.img, s = K.s, e = ease(S.k), sway = Math.sin(t * .9 + S.ph) * (.05 - .007 * S.age) * e + Math.sin(t * 2.3 + S.ph) * .008 + Math.sin(t * 19) * .12 * S.shake;
  c.save();
  c.translate(S.x, S.y);
  c.rotate(sway);
  c.scale(.5 + .5 * e, e);
  c.drawImage(cv, -w / 2, -oy, w, h);
  if (S.lantern && e > .9) {
    c.globalCompositeOperation = 'lighter';
    const [x, y] = S.lantern, f = .85 + .15 * Math.sin(t * 3.1 + S.ph);
    dab(c, sprite(P.glow), x, y, 11 * s, (P.night ? .55 : .3) * f);
    c.globalCompositeOperation = 'source-over';
  }
  c.restore();
  Lf.hits.push(['sapling', S.x, S.y - TALL[S.age] * s * .5 * e, Math.max(12 * s, TALL[S.age] * s * .5), D_ISLE]);
}
