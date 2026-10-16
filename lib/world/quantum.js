// The shy rock: a scrap of rock with one tree on it, far off in the high sky, which only stays where it is while it is
// being looked at. Once the pointer has been on it, it is somewhere else as soon as the pointer looks away, and it is
// somewhere else again whenever the world goes out of sight. Nobody ever sees it move.

import { rgba, seeded } from './core';

// How far the pointer may stray from the rock, in page pixels, and still be looking at it.
const LOOK = 150;

// The places it can be: scattered through the open sky like the stars to join up, and clear of them too. On a phone the
// name and the buttons cover the sky on the left, and the rock is small enough to hide behind a letter, so there it
// keeps to the right of them. `stars` are those stars.
export function makeQuantum(K, stars) {
  const rnd = seeded(29), { WU, phone, s } = K, ss = Math.max(s, .7), T = K.tree, g = K.far.giant, W = K.wh;
  const keep = [
    [g.x, g.y, g.r * 2.6], [WU * (phone ? .84 : .87), phone ? 110 : 140, 90], [K.flock.x, K.flock.y, 100 * ss],
    ...T.clusters.map(([x, y, r]) => [x, y, r + 34 * s]), ...stars.map(([x, y]) => [x, y, 34 * ss]),
  ];
  if (W.door) keep.push([W.door.x, W.door.y - W.door.h / 2, 80 * ss]);
  if (W.lifter) keep.push([W.lifter.x, W.lifter.y, W.lifter.r + 40]);
  const [x0, x1, y0, y1, gap] = phone ? [.7, .94, 130, 470, 48] : [.3, .8, 55, 280, 110], spots = [];
  for (let i = 0; i < 400 && spots.length < 6; i++) {
    const x = WU * (x0 + rnd() * (x1 - x0)), y = y0 + rnd() * (y1 - y0);
    if (y * K.U < 80 || (phone ? x < WU * .82 && y * K.U > 215 : (y > 200 && x < WU * .38) || (y < 80 && x > WU * .55))) continue;
    if (keep.some(([kx, ky, r]) => Math.hypot(x - kx, y - ky) < r) || spots.some(p => Math.hypot(x - p[0], y - p[1]) < gap)) continue;
    spots.push([x, y]);
  }
  return { spots, at: Math.floor(Math.random() * spots.length), seen: false, r: 11 * ss };
}

// Somewhere else, and not looked at yet.
export function hop(Lf) {
  const Q = Lf.quantum, n = Q.spots.length;
  Q.seen = false;
  if (n > 1) Q.at = (Q.at + 1 + Math.floor(Math.random() * (n - 1))) % n;
}

// Looked at while the pointer is on it, and gone once the pointer has wandered off or left. `q` is the pointer in the
// high sky. Says whether it went.
export function glance(Lf, K, shown, q) {
  const Q = Lf.quantum;
  if (!Q.spots.length) return false;
  const [x, y] = Q.spots[Q.at];
  if (shown === 'quantum') Q.seen = true;
  else if (Q.seen && (!q || Math.hypot(q.x - x, q.y - y) * K.U > LOOK)) {
    hop(Lf);
    return true;
  }
  return false;
}

export function drawQuantum(c, Lf, K, P, t) {
  const Q = Lf.quantum;
  if (!Q.spots.length) return;
  const r = Q.r, [x, y0] = Q.spots[Q.at], y = y0 + Math.sin(t * .5 + Q.at) * 1.5;
  const rock = P.night ? [50, 56, 74] : [124, 116, 128], shade = P.night ? [32, 36, 52] : [96, 90, 108];
  const grass = P.night ? [44, 84, 82] : [112, 156, 116], leaf = P.night ? [30, 62, 60] : [72, 122, 88];
  // The rock, coming to a point underneath, darker on the side away from the light.
  c.fillStyle = rgba(rock);
  c.beginPath();
  c.moveTo(x - r, y);
  c.quadraticCurveTo(x - r * .7, y + r * .9, x + r * .1, y + r * 1.5);
  c.quadraticCurveTo(x + r * .6, y + r * .8, x + r, y);
  c.fill();
  c.fillStyle = rgba(shade, .8);
  c.beginPath();
  c.moveTo(x + r * .15, y + r * .2);
  c.quadraticCurveTo(x + r * .45, y + r * .8, x + r * .1, y + r * 1.5);
  c.quadraticCurveTo(x + r * .6, y + r * .8, x + r, y);
  c.fill();
  c.fillStyle = rgba(grass);
  c.beginPath();
  c.ellipse(x, y, r, r * .28, 0, 0, Math.PI * 2);
  c.fill();
  // Its one tree.
  c.strokeStyle = rgba(shade);
  c.lineWidth = r * .14;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x + r * .2, y);
  c.lineTo(x + r * .14, y - r * .95);
  c.stroke();
  c.fillStyle = rgba(leaf);
  c.beginPath();
  for (const [dx, dy, k] of [[.14, -1.25, .52], [-.22, -.98, .32], [.52, -1.02, .3]]) {
    c.moveTo(x + (dx + k) * r, y + dy * r);
    c.arc(x + dx * r, y + dy * r, k * r, 0, Math.PI * 2);
  }
  c.fill();
  // A fingertip gets a little more room than a pointer.
  Lf.hits.push(['quantum', x, y - r * .4, r * (K.phone ? 2.4 : 1.6), 0]);
}
