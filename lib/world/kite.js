// A kite tied to a stake at the far end of the island, or as near it as leaves the kite room to fly without leaving the
// screen, which on a phone is nearer the tree. It lies in the grass until someone pulls it up into the sky, or
// clicks it, and then the wind takes it, rocking it about on its string and tugging at it in gusts, until it tires and
// drifts back down to the grass. Clicked while it flies, it does a loop. The string is a rope of point masses, moved by
// Verlet integration and pulled back to length a few times a frame. It pays out from the stake as the kite climbs and
// winds back in as it comes down, always with a little slack, so it sags and swings under its own weight.
// While nobody is watching it may get away and catch in the tree, where it stays until a click frees it.

import { TAU, clamp, lerp, mixc, rgba } from './core';
import { D_ISLE } from './life';
import { ease } from './story';
import { gust } from './wind';

// Points along the string, how many times a frame they are pulled back to length, and the pull of gravity on them.
const KNOTS = 12, PASSES = 8, GRAVITY = 260;
// How long the wind keeps it up, in seconds, and how long a loop takes.
const AIRBORNE = [28, 40], LOOP = 1.4;
// Lying in the grass, it is tipped over with its foot toward the stake.
const LYING = 1.35;
// How big the kite is, against the island's scale.
const SIZE = 1.3;

export function makeKite(K) {
  const { s, isle, iw } = K, ss = Math.max(s, .7), len = 230 * ss;
  // Flying, it is at most about four fifths of the string's length downwind of the stake, and half its width more.
  const x = Math.min(isle.x0 + iw * .935, K.WU - len * .8 - 12 * SIZE * s), y = isle.topAt(x) - 6 * s;
  const rest = [x + 19 * s, isle.topAt(x + 19 * s) - 7.5 * s];
  const Kt = {
    sx: x, sy: y, len, rest, st: 'rest', was: 'rest', x: rest[0], y: rest[1], vx: 0, vy: 0, ang: LYING, hx: 0, hy: 0,
    left: 0, loop: -1, ph: x * .01,
    rope: [], tail: [],
  };
  // The string starts out lying in the grass from the stake to the kite, and the tail lying back under the kite.
  for (let i = 0; i < KNOTS; i++) {
    const px = lerp(x, rest[0] - 2 * s, i / (KNOTS - 1)), py = Math.min(lerp(y, rest[1] + 4 * s, i / (KNOTS - 1)), ground(K, px));
    Kt.rope.push({ x: px, y: py, px, py });
  }
  for (let i = 0; i < 6; i++) Kt.tail.push({ x: rest[0] - (13 - i * 6) * s, y: ground(K, rest[0] - (13 - i * 6) * s) });
  return Kt;
}

// The top of the turf at x, or nowhere off the island's ends.
function ground(K, x) {
  const { isle, iw } = K;
  return x > isle.x0 && x < isle.x0 + iw ? isle.topAt(x) - .6 * K.s : Infinity;
}

// Ends any loop the kite is in. A loop turns it all the way over, so its angle is brought back within half a turn of
// upright, for it to right itself the short way rather than spin back round.
function endLoop(Kt) {
  Kt.loop = -1;
  Kt.ang -= TAU * Math.round(Kt.ang / TAU);
}

// A press on the kite takes hold of it. True if the press was on it.
export function grab(Lf, K, x, y) {
  const Kt = Lf.kite;
  if (Math.hypot(x - Kt.x, y - Kt.y) > 22 * SIZE * Math.max(K.s, .7)) return false;
  Object.assign(Kt, { was: Kt.st, st: 'held', hx: x, hy: y });
  endLoop(Kt);
  return true;
}
export function pull(Lf, x, y) {
  const Kt = Lf.kite;
  if (Kt.st !== 'held') return;
  Kt.hx = x;
  Kt.hy = y;
}
// Let go. A click launches a kite lying in the grass or caught in the tree, and loops one that is flying. Pulled up
// high enough, the wind takes it; let go low, it drifts back down.
export function letGo(Lf, K, click) {
  const Kt = Lf.kite;
  if (Kt.st !== 'held') return;
  const fly = click || Kt.y < Kt.sy - 50 * Math.max(K.s, .7);
  if (click && Kt.was === 'fly') {
    Object.assign(Kt, { st: 'fly', loop: 0 });
    Lf.sfx.push(['kite', Kt.x, 1]);
    return;
  }
  Kt.st = fly ? 'fly' : 'fall';
  if (!fly) return;
  Kt.left = AIRBORNE[0] + Math.random() * (AIRBORNE[1] - AIRBORNE[0]);
  Lf.sfx.push(['kite', Kt.x]);
}

// While the page was out of sight, a kite lying in the grass got up on its own and caught in the tree, in the twigs
// nearest the stake that its string reaches. True if it did.
export function snag(Lf, K) {
  const Kt = Lf.kite;
  if (Kt.st !== 'rest') return false;
  let tip = null, best = Kt.len * .99;
  for (const [x, y] of K.tree.tips) {
    const d = Math.hypot(x - Kt.sx, y - Kt.sy);
    if (d < best) [tip, best] = [[x, y], d];
  }
  if (!tip) return false;
  Object.assign(Kt, { st: 'caught', tip, x: tip[0], y: tip[1], vx: 0, vy: 0, ang: .9 });
  // The string runs taut from the stake to it, and the tail hangs below it.
  Kt.rope.forEach((p, i) => {
    const u = i / (Kt.rope.length - 1);
    p.x = p.px = lerp(Kt.sx, tip[0], u);
    p.y = p.py = lerp(Kt.sy, tip[1], u);
  });
  Kt.tail.forEach((p, i) => [p.x, p.y] = [tip[0], tip[1] + (16 + i * 6) * K.s]);
  return true;
}

export function updateKite(Lf, K, dt) {
  const Kt = Lf.kite, t = Lf.t, s = K.s, ss = Math.max(s, .7);
  if (!dt) return;
  // A dozing world lets the wind drop.
  if (Kt.st === 'fly' && ((Kt.left -= dt) < 0 || Lf.doze > .5)) {
    Kt.st = 'fall';
    endLoop(Kt);
  }
  // The wind's gusts swing it round downwind and back, whichever way they blow.
  const g = Math.min(1, Math.abs(gust(Lf.wind, K, Kt.x)) / .6);
  let tx, ty, ks, damp, tilt;
  if (Kt.st === 'held') {
    // Follows the pointer as far as the string reaches, and no lower than the grass.
    const dx = Kt.hx - Kt.sx, dy = Kt.hy - Kt.sy, d = Math.hypot(dx, dy) || 1, r = Math.min(d, Kt.len);
    [tx, ty, ks, damp] = [Kt.sx + (dx / d) * r, Math.min(Kt.sy + (dy / d) * r, ground(K, Kt.sx + (dx / d) * r) - 6 * s), 40, 11];
    tilt = clamp(Kt.vx * .004, -.7, .7);
  } else if (Kt.st === 'caught') {
    // Stuck in the twigs, tugging a little in each gust.
    [tx, ty, ks, damp] = [Kt.tip[0] + g * 3 * s, Kt.tip[1] - g * 2 * s, 30, 8];
    tilt = .9 + Math.sin(t * .8 + Kt.ph) * .06 + g * .15;
  } else if (Kt.st === 'fly') {
    // Downwind of the stake, high up on the string, swaying, and pushed round lower in a gust.
    const a = .95 + .14 * Math.sin(t * .7 + Kt.ph) + .08 * Math.sin(t * 1.9 + Kt.ph * 3) - .28 * g, r = Kt.len * .97;
    [tx, ty, ks, damp] = [Kt.sx + Math.cos(a) * r, Kt.sy - Math.sin(a) * r, 2.6, 1.8];
    tilt = .3 + clamp(Kt.vx * .003, -.5, .5) + Math.sin(t * 2.3 + Kt.ph) * .1 + .25 * g;
    if (Kt.loop >= 0) {
      // A loop: round a circle a little in from where it was, all the way over.
      const u = (Kt.loop += dt / LOOP), th = TAU * ease(u), R = 34 * ss, ox = Math.cos(a), oy = -Math.sin(a);
      tx += -ox * R + (ox * Math.cos(th) - oy * Math.sin(th)) * R;
      ty += -oy * R + (oy * Math.cos(th) + ox * Math.sin(th)) * R;
      [ks, damp] = [30, 9];
      tilt += th;
      if (u >= 1) {
        tilt -= TAU;
        endLoop(Kt);
      }
    }
  } else {
    // Back down to the grass, rocking like a falling leaf, and then lying there.
    const [rx, ry] = Kt.rest, d = Math.hypot(Kt.x - rx, Kt.y - ry);
    [tx, ty, ks, damp] = [rx + Math.sin(t * 1.3 + Kt.ph) * Math.min(40 * ss, d * .4), ry, .9, 1.7];
    tilt = Kt.st === 'rest' ? LYING : lerp(LYING, Math.sin(t * 1.6 + Kt.ph) * .6, clamp(d / (30 * ss), 0, 1));
    if (Kt.st === 'fall' && d < 3 * s && Math.hypot(Kt.vx, Kt.vy) < 10 * s) Kt.st = 'rest';
    if (Kt.st === 'rest') [ks, damp] = [20, 10];
  }
  Kt.vx += ((tx - Kt.x) * ks - Kt.vx * damp) * dt;
  Kt.vy += ((ty - Kt.y) * ks - Kt.vy * damp) * dt;
  Kt.x += Kt.vx * dt;
  Kt.y += Kt.vy * dt;
  // The string holds it to the stake: whatever would carry it further is taken off.
  const dx = Kt.x - Kt.sx, dy = Kt.y - Kt.sy, d = Math.hypot(dx, dy);
  if (d > Kt.len) {
    const nx = dx / d, ny = dy / d, out = Kt.vx * nx + Kt.vy * ny;
    Kt.x = Kt.sx + nx * Kt.len;
    Kt.y = Kt.sy + ny * Kt.len;
    if (out > 0) {
      Kt.vx -= out * nx;
      Kt.vy -= out * ny;
    }
  }
  Kt.y = Math.min(Kt.y, ground(K, Kt.x) - 7.5 * s);
  Kt.ang += (tilt - Kt.ang) * Math.min(1, dt * (Kt.loop >= 0 ? 14 : 5));
  updateRope(Kt, K, dt, g);
  updateTail(Kt, K, dt, t);
}

// The string, tied to the stake at one end and to the kite's bridle at the other, sagging under its own weight and
// blown a little downwind. As much is paid out as reaches the kite and a tenth more, up to all of it.
function updateRope(Kt, K, dt, g) {
  const R = Kt.rope, n = R.length, drag = Math.pow(.02, dt), [bx, by] = bridle(Kt, K);
  const seg = Math.min(Kt.len, Math.hypot(bx - Kt.sx, by - Kt.sy) * 1.1 + 3 * K.s) / (n - 1);
  for (let i = 1; i < n - 1; i++) {
    const p = R[i], vx = (p.x - p.px) * drag, vy = (p.y - p.py) * drag;
    p.px = p.x;
    p.py = p.y;
    p.x += vx + (20 + 40 * g) * dt * dt;
    p.y += vy + GRAVITY * dt * dt;
  }
  Object.assign(R[0], { x: Kt.sx, y: Kt.sy });
  Object.assign(R[n - 1], { x: bx, y: by });
  for (let j = 0; j < PASSES; j++) {
    for (let i = 0; i < n - 1; i++) {
      const a = R[i], b = R[i + 1], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - seg) / d;
      // The ends are held: all the correction goes to the free point beside one.
      const wa = i === 0 ? 0 : i + 1 === n - 1 ? 1 : .5, wb = 1 - wa;
      a.x += dx * f * wa;
      a.y += dy * f * wa;
      b.x -= dx * f * wb;
      b.y -= dy * f * wb;
    }
    for (let i = 1; i < n - 1; i++) R[i].y = Math.min(R[i].y, ground(K, R[i].x));
  }
}

// Where the string meets the kite: a little below its middle, turned with it.
function bridle(Kt, K) {
  const r = 3 * SIZE * K.s;
  return [Kt.x - Math.sin(Kt.ang) * r, Kt.y + Math.cos(Kt.ang) * r];
}

// The tail of bows hangs from the kite's foot, each bow trailing the one before it, blown downwind and lying in the
// grass when the kite does.
function updateTail(Kt, K, dt, t) {
  const s = K.s, z = SIZE * s, gap = 5 * z, flying = Kt.st !== 'rest';
  let ax = Kt.x - Math.sin(Kt.ang) * 15 * z, ay = Kt.y + Math.cos(Kt.ang) * 15 * z;
  Kt.tail.forEach((p, i) => {
    p.x += (flying ? 30 + Math.sin(t * 4 + i * .9) * 26 : 6) * s * dt;
    p.y += (flying ? 40 : 30) * s * dt;
    const dx = p.x - ax, dy = p.y - ay, d = Math.hypot(dx, dy) || 1;
    p.x = ax + (dx / d) * gap;
    p.y = Math.min(ay + (dy / d) * gap, ground(K, p.x));
    [ax, ay] = [p.x, p.y];
  });
}

export function drawKite(c, Lf, K, P) {
  const Kt = Lf.kite, s = K.s, z = SIZE * s, night = P.night, R = Kt.rope;
  // The stake, with the spare string wound round it.
  const wood = mixc([110, 82, 58], P.rock, night ? .55 : .2);
  c.fillStyle = rgba(wood);
  c.fillRect(Kt.sx - 1.1 * s, Kt.sy - 1.5 * s, 2.2 * s, 9 * s);
  c.fillStyle = rgba(mixc([236, 226, 204], P.haze, night ? .5 : .1));
  c.fillRect(Kt.sx - 1.8 * s, Kt.sy + 1 * s, 3.6 * s, 2.2 * s);
  // The string, as a smooth curve through its points.
  c.strokeStyle = rgba(night ? [196, 214, 226] : [252, 246, 232], night ? .5 : .75);
  c.lineWidth = .6 * s;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(R[0].x, R[0].y);
  for (let i = 1; i < R.length - 1; i++) c.quadraticCurveTo(R[i].x, R[i].y, (R[i].x + R[i + 1].x) / 2, (R[i].y + R[i + 1].y) / 2);
  c.lineTo(R[R.length - 1].x, R[R.length - 1].y);
  c.stroke();
  // The tail: a thread with bows tied along it.
  const red = mixc([226, 92, 78], P.haze, night ? .45 : .08), gold = mixc([248, 206, 112], P.haze, night ? .45 : .08);
  c.beginPath();
  c.moveTo(Kt.x - Math.sin(Kt.ang) * 15 * z, Kt.y + Math.cos(Kt.ang) * 15 * z);
  for (const p of Kt.tail) c.lineTo(p.x, p.y);
  c.stroke();
  Kt.tail.forEach((p, i) => {
    c.fillStyle = rgba(i % 2 ? gold : red);
    c.beginPath();
    c.moveTo(p.x, p.y);
    c.lineTo(p.x - 2.6 * z, p.y - 1.6 * z);
    c.lineTo(p.x - 2.6 * z, p.y + 1.6 * z);
    c.moveTo(p.x, p.y);
    c.lineTo(p.x + 2.6 * z, p.y - 1.6 * z);
    c.lineTo(p.x + 2.6 * z, p.y + 1.6 * z);
    c.fill();
  });
  // The kite: a diamond of four panels in two colours, on crossed spars, the panels toward the light a shade paler.
  c.save();
  c.translate(Kt.x, Kt.y);
  c.rotate(Kt.ang);
  const pts = [[0, -14], [9, -3], [0, 16], [-9, -3]].map(([x, y]) => [x * z, y * z]);
  const lit = Math.cos(Kt.ang) * (K.L.x > Kt.x ? 1 : -1);
  pts.forEach(([x, y], i) => {
    const [x1, y1] = pts[(i + 1) % 4], col = i % 2 ? gold : red;
    c.fillStyle = rgba(mixc(col, [255, 250, 240], (i === 0 || i === 1) === lit > 0 ? .2 : 0));
    c.beginPath();
    c.moveTo(0, -3 * z);
    c.lineTo(x, y);
    c.lineTo(x1, y1);
    c.fill();
  });
  c.strokeStyle = rgba(wood, .9);
  c.lineWidth = .7 * z;
  c.beginPath();
  c.moveTo(0, -14 * z);
  c.lineTo(0, 16 * z);
  c.moveTo(-9 * z, -3 * z);
  c.lineTo(9 * z, -3 * z);
  c.stroke();
  c.restore();
  Lf.hits.push(['kite', Kt.x, Kt.y, 12 * z, D_ISLE]);
}
