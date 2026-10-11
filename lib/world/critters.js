// Leaf fish: they fall from the tree like any other leaf until they change their mind and swim back up.

import { TAU, dab, mixc, rgba, seeded, sprite } from './core';
import { D_ISLE } from './life';
import { turnTo } from './whimsy';

export function makeCritters(K) {
  const rnd = seeded(71), { phone } = K;
  return {
    fish: Array.from({ length: phone ? 4 : 6 }, (_, i) => ({ st: 'hide', wait: 2 + i * 2.5 + rnd() * 2, x: 0, y: 0, vx: 0, vy: 0, turn: 0, rot: 0, ph: rnd() * TAU, tx: 0, ty: 0 })),
    rnd,
  };
}

export function updateCritters(Lf, K, dt, ptr) {
  const C = Lf.critters, { s, tree: T } = K, rnd = C.rnd, t = Lf.t, pi = ptr(D_ISLE);
  for (const f of C.fish) {
    if (f.st === 'hide') {
      if ((f.wait -= dt) > 0) continue;
      const tp = T.tips[Math.floor(rnd() * T.tips.length)];
      Object.assign(f, { st: 'fall', x: tp[0] + (rnd() - .5) * 20 * s, y: tp[1] + 10 * s, vx: 0, vy: (13 + rnd() * 8) * s, turn: Math.min(T.y - 25 * s, Math.max(tp[1], T.cy + T.r * .5) + (60 + rnd() * 90) * s) });
    }
    // Under the pointer a fish holds still and plays leaf, so it can be looked at.
    const near = pi && Math.hypot(f.x - pi.x, f.y - pi.y) < 40 * s;
    if (f.st === 'fall') {
      // Drifts and rocks like a leaf, stalk and all, until it decides it has fallen far enough.
      if (!near) {
        f.y += f.vy * dt * Lf.mo.g;
        f.x += (Math.sin(t * 1.3 + f.ph) * 18 + 4) * s * dt;
      }
      f.rot = Math.PI / 2 + Math.sin(t * 2.1 + f.ph) * .9;
      if (f.y > f.turn) {
        f.st = 'swim';
        f.tx = T.cx + (rnd() - .5) * T.r * .9;
        f.ty = T.cy + (rnd() - .3) * T.r * .5;
        f.vx = (rnd() - .5) * 40 * s;
        f.vy = -20 * s;
      }
    } else if (f.st === 'swim') {
      // Wriggles back up into the canopy.
      const dx = f.tx - f.x, dy = f.ty - f.y, d = Math.hypot(dx, dy) || 1, sp = near ? 0 : 75 * s;
      f.vx += ((dx / d) * sp - f.vx) * dt * 2.2 + (near ? 0 : Math.cos(t * 3 + f.ph) * 40 * s * dt);
      f.vy += ((dy / d) * sp - f.vy) * dt * 2.2;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
      f.rot += turnTo(f.rot, Math.atan2(f.vy, f.vx)) * Math.min(1, dt * 8);
      if (d < 14 * s) Object.assign(f, { st: 'hide', wait: 4 + rnd() * 8 });
    }
  }
}

export function drawCritters(c, Lf, K, P, t) {
  const C = Lf.critters, H = Lf.hits, s = K.s;
  for (const f of C.fish) if (f.st !== 'hide') drawLeafFish(c, f, s, P, t, H);
}

// A leaf with a fish's tail for a stalk. Falling, the tail hangs still; swimming, it beats.
function drawLeafFish(c, f, s, P, t, H) {
  const L = 12 * s, w = 5.2 * s, beat = f.st === 'swim' ? Math.sin(t * 14 + f.ph) * .5 : 0;
  c.save();
  c.translate(f.x, f.y);
  c.rotate(f.rot);
  if (P.night) {
    c.globalCompositeOperation = 'lighter';
    dab(c, sprite(P.leafLit), 0, 0, 20 * s, .3);
    c.globalCompositeOperation = 'source-over';
  }
  const body = mixc(P.leafMid, P.leafLit, P.night ? .5 : .35);
  c.fillStyle = rgba(body);
  c.beginPath();
  c.moveTo(L, 0);
  c.quadraticCurveTo(0, -w * 1.6, -L * .75, 0);
  c.quadraticCurveTo(0, w * 1.6, L, 0);
  c.fill();
  c.save();
  c.translate(-L * .75, 0);
  c.rotate(beat);
  c.beginPath();
  c.moveTo(0, 0);
  c.lineTo(-L * .55, -w * .9);
  c.quadraticCurveTo(-L * .35, 0, -L * .55, w * .9);
  c.closePath();
  c.fill();
  c.restore();
  c.strokeStyle = rgba(P.leafDark, .5);
  c.lineWidth = .8 * s;
  c.stroke();
  c.strokeStyle = rgba(mixc(body, P.leafLit, .6), .8);
  c.lineWidth = .6 * s;
  c.beginPath();
  c.moveTo(L * .85, 0);
  c.lineTo(-L * .75, 0);
  for (const u of [.45, 0, -.4]) {
    c.moveTo(L * u, 0);
    c.lineTo(L * (u + .25), -w * .8);
    c.moveTo(L * u, 0);
    c.lineTo(L * (u + .25), w * .8);
  }
  c.stroke();
  c.restore();
  H.push(['leaffish', f.x, f.y, 18 * s, D_ISLE]);
}
