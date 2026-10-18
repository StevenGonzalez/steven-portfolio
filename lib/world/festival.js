// The lantern festival, for a visitor who finishes the field guide, and again on the first visit each day after that.
// Every lantern in the tree flares in turn, left to right, rings its note and lets go of a sky lantern of its own, and
// they all rise slowly up and out of the sky. Everyone comes to watch: the sheep put their heads out, the dandelion
// folk gather under the tree and lean back to look up, the moths see the lanterns off a little way, the snails stop
// and wave their feelers, and the whales spout. A world held still for reduced motion never has one.

import { clamp, dab, rgba, seeded, sprite } from './core';
import { LAMP } from './whimsy';

// How long everyone watches, in seconds from the start, and how long a sky lantern is in the air.
const WATCH = 28;
const FLIGHT = 30;

export function startFestival(Lf, K) {
  if (Lf.fest) return;
  const rnd = seeded(97), k = Math.max(K.s, .7), T = K.tree, L = T.lanterns;
  const x0 = Math.min(...L.map(l => l.x)), x1 = Math.max(...L.map(l => l.x));
  const sky = L.map(l => ({
    l, x: l.x, y: l.y, vx: 0, vy: 0, d: .6 + ((l.x - x0) / (x1 - x0 || 1)) * 5.5 + rnd() * .2, up: false, age: 0,
    sp: (17 + rnd() * 8) * k, sway: (4 + rnd() * 4) * k, ph: rnd() * 6, r: (5 + rnd() * 1.5) * k,
  }));
  Lf.fest = { t: 0, sky, spouted: false };
  Lf.sfx.push(['festival', T.cx]);
  // The moths each pick a lantern to see off, and the folk a place to stand under the tree, either side of the trunk.
  const C = Lf.critters, folk = [...C.folk].sort((a, b) => a.x - b.x);
  C.moths.forEach((m, i) => Object.assign(m, { see: Math.floor(((i + .5) / C.moths.length) * sky.length), st: 'fly', next: 8 }));
  folk.forEach((f, i) => {
    const j = i - (folk.length - 1) / 2;
    f.spot = clamp(T.x + j * 26 * k + Math.sign(j || 1) * 18 * k, C.fa, C.fb);
  });
}

// Whether everyone is still gathered to watch.
export const watching = Lf => !!Lf.fest && Lf.fest.t < WATCH;

export function updateFestival(Lf, K, dt) {
  const F = Lf.fest;
  if (!F) return;
  const t = (F.t += dt), wind = 5 * Math.max(K.s, .7), cx = K.tree.cx;
  let left = 0;
  for (const s of F.sky) {
    if (t < s.d) {
      left++;
      continue;
    }
    if (!s.up) {
      s.up = true;
      s.l.ring = 1;
      Lf.sfx.push(['lift', s.x, s.l.step]);
    }
    s.age += dt;
    // Lifting off gently, then rising steadily, spreading out from the tree on the breeze.
    s.vy += (-s.sp - s.vy) * Math.min(1, dt * .45);
    s.vx = wind + (s.l.x - cx) * .06 + Math.cos(Lf.t * .5 + s.ph) * s.sway;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    if (s.age < FLIGHT) left++;
  }
  // The whales in sight blow a spout for it, once the lanterns are up.
  if (!F.spouted && t > 7) {
    F.spouted = true;
    const W = Lf.whales.filter(w => !(w.wait > 0) && w.x > 0 && w.x < K.WU);
    for (const w of W) w.spout = 0;
    if (W.length) Lf.sfx.push(['spout', W[0].x]);
  }
  if (!left) Lf.fest = null;
}

// The sky lanterns, on the island layer: a paper lantern lit from the flame inside, brightest at the open bottom, in a
// warm glow, flickering. Each fades in as it lets go and out as it reaches the top of the sky or the end of its flight.
export function drawFestival(c, Lf, K, P) {
  const F = Lf.fest;
  if (!F) return;
  const glow = sprite(LAMP), core = sprite([255, 244, 220]), t = Lf.t, lit = [];
  for (const s of F.sky) {
    if (!s.up) continue;
    const a = clamp(s.age / .8, 0, 1) * clamp((FLIGHT - s.age) / 3, 0, 1) * clamp((s.y + 60) / 140, 0, 1);
    // Smaller as it goes up and away.
    if (a > 0) lit.push([s.x, s.y, s.r * clamp(.6 + .4 * (s.y / s.l.y), .6, 1), a, .82 + .18 * Math.sin(t * 9 + s.ph * 3) * Math.sin(t * 5.3 + s.ph)]);
  }
  if (!lit.length) return;
  c.globalCompositeOperation = 'lighter';
  for (const [x, y, r, a, f] of lit) dab(c, glow, x, y, r * 7, (P.night ? .45 : .35) * a * f);
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = rgba(P.night ? [255, 188, 112] : [244, 150, 92]);
  for (const [x, y, r, a] of lit) {
    c.globalAlpha = .92 * a;
    c.beginPath();
    c.moveTo(x - r * .6, y + r);
    c.lineTo(x - r * .95, y - r * .7);
    c.quadraticCurveTo(x, y - r * 1.6, x + r * .95, y - r * .7);
    c.lineTo(x + r * .6, y + r);
    c.fill();
  }
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'lighter';
  for (const [x, y, r, a, f] of lit) dab(c, core, x, y + r * .45, r * 1.3, .85 * a * f);
  c.globalCompositeOperation = 'source-over';
}
