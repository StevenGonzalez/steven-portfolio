// The campfire band: four players camped out by the landmarks, who play the song in sound.js and are never seen. Each
// has a little fire of their own: beside the mill, on the scrap of rock with the door, under the lighthouse, and on the
// giant's moon with the tree, going round with it. A fire is lit once its player has joined the band, which happens as
// the field guide fills up, and every fire burns for the festival. A phone has no door or lighthouse, and its moon
// hides behind the tree, so there the whole band shares the fire by the mill, which burns bigger with each player.
// Hovering a fire brings its players up close.

import { clamp, dab, panAt, rgba, sprite } from './core';
import { D_FAR, FIRE, FIRE_CORE } from './depth';

// `players` are the band's places: 0 the guitar, 1 the harmonica, 2 the banjo and drum, and 3 the whistle.
export function makeBand(K) {
  const W = K.wh, ws = W.ws, M = W.mill, x = (M.up.x + M.up.w / 2 + M.tx - 13 * ws) / 2;
  const camps = [{ x, y: M.sh.topAt(x), d: D_FAR, players: K.phone ? [0, 1, 2, 3] : [0], ph: 0 }];
  if (W.door) {
    const x = W.door.x + 27 * ws;
    camps.push({ x, y: W.door.sh.topAt(x), d: D_FAR, players: [1], ph: 1.7 });
  }
  if (W.lh) camps.push({ x: W.lh.x - 14 * ws, y: W.lh.base, d: D_FAR, players: [2], ph: 3.1 });
  if (!K.phone) camps.push({ moon: true, x: 0, y: 0, d: 0, players: [3], ph: 4.4 });
  return { camps, n: 0, near: -1 };
}

// Where each player sits across the world, from -1 at the left to 1 at the right, for the sound. Players sharing a fire
// sit a little apart round it.
export function bandPans(K, B) {
  return [0, 1, 2, 3].map(i => {
    const c = B.camps.find(c => c.players.includes(i)), x = c.moon ? K.far.giant.x : c.x;
    return clamp(panAt(K, x) * .7 + (c.players.length > 1 ? (c.players.indexOf(i) - 1.5) * .12 : 0), -1, 1);
  });
}

// How many of a camp's players have joined. Everyone is out for the festival.
const here = (Lf, c) => (Lf.fest ? c.players.length : c.players.filter(p => p < Lf.band.n).length);

// The players at the fire under the pointer, or null. `shown` is what the pointer is over, and `ptr` gives the pointer
// at a depth.
export function hearing(Lf, shown, ptr) {
  const B = Lf.band;
  B.near = -1;
  if (shown !== 'band') return null;
  let bd = Infinity;
  B.camps.forEach((c, i) => {
    const q = ptr(c.d), d = q && here(Lf, c) && !c.hid ? Math.hypot(q.x - c.x, q.y - c.y) : Infinity;
    if (d < bd) [B.near, bd] = [i, d];
  });
  return B.near < 0 ? null : B.camps[B.near].players.filter(p => Lf.fest || p < B.n);
}

// A little campfire at (x, y) on the ground, `k` to scale: two logs across each other and, lit, a flickering flame in a
// warm glow, throwing up sparks. `g` is how big it burns, and one with its players up close burns brighter. The
// marshmallow fire on the island is one too.
export function campfire(c, x, y, k, g, t, ph, P, close, fog = 1) {
  c.strokeStyle = rgba(P.night ? [44, 32, 30] : [84, 62, 52], fog);
  c.lineWidth = 1.3 * k;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x - 3.5 * k, y);
  c.lineTo(x + 3 * k, y - 1.6 * k);
  c.moveTo(x + 3.5 * k, y);
  c.lineTo(x - 3 * k, y - 1.6 * k);
  c.stroke();
  if (!g) return;
  const f = .82 + .18 * Math.sin(t * 11 + ph) * Math.sin(t * 7.3 + ph * 2), h = 6.5 * k * g * f, w = 2.2 * k * g;
  const core = sprite(FIRE_CORE), a = (P.night ? 1 : .7) * fog;
  c.globalCompositeOperation = 'lighter';
  dab(c, sprite(FIRE), x, y - 2 * k, (close ? 15 : 10) * k * g * f, (close ? .7 : .5) * a);
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = rgba([255, 190, 112], .95 * fog);
  c.beginPath();
  c.moveTo(x - w, y - .4 * k);
  c.quadraticCurveTo(x - w * .7, y - h * .6, x + Math.sin(t * 5 + ph) * k * .8, y - h);
  c.quadraticCurveTo(x + w * .7, y - h * .6, x + w, y - .4 * k);
  c.fill();
  c.globalCompositeOperation = 'lighter';
  dab(c, core, x, y - 1.6 * k, 2.6 * k * g, .9 * fog);
  for (let j = 0, n = close ? 5 : 3; j < n; j++) {
    const u = (t * (close ? .9 : .5) + j / n + ph) % 1;
    dab(c, core, x + Math.sin(u * 5 + j * 2 + ph) * 2.5 * k, y - 4 * k - u * 18 * k * g, .9 * k, (1 - u) * .9 * a);
  }
  c.globalCompositeOperation = 'source-over';
}

// The fires by the mill, the door and the lighthouse, on the far layer.
export function drawBand(c, Lf, K, P, t) {
  const B = Lf.band, k = 1.7 * K.wh.ws;
  B.camps.forEach((cp, i) => {
    if (cp.moon) return;
    const n = here(Lf, cp), g = n ? 1 + .2 * (n - 1) : 0;
    campfire(c, cp.x, cp.y, k, g, t, cp.ph, P, B.near === i);
    if (n) Lf.hits.push(['band', cp.x, cp.y - 3 * k, 10 * k, D_FAR]);
  });
}

// The fire on the moon with the tree, in the high sky, on the moon's shoulder under the tree. It is out of sight while
// the moon is behind the giant.
export function drawMoonCamp(c, Lf, K, P, t) {
  const B = Lf.band, i = B.camps.findIndex(cp => cp.moon), at = Lf.depth.moons.at;
  if (i < 0 || !at) return;
  const cp = B.camps[i], G = K.far.giant, k = at.m / 22;
  cp.x = at.x + at.m * .72;
  cp.y = at.y - at.m * .6;
  cp.hid = at.back && Math.hypot(cp.x - G.x, cp.y - G.y) < G.r;
  if (cp.hid) return;
  const n = here(Lf, cp);
  campfire(c, cp.x, cp.y, k, n ? 1 : 0, t, cp.ph, P, B.near === i, .8);
  if (n) Lf.hits.push(['band', cp.x, cp.y - 2 * k, 10, 0]);
}
