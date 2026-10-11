// Moments: a click on certain landmarks sets off something big for a few seconds, then the world settles back. The mill's
// sails take off, the upfall turns gravity over, the far gate calls the light early, or the giant or the moon sheds a
// meteor shower. Only one runs at a time, so they never pile up on each other.

import { dab, rgba, sprite } from './core';
import { ease } from './story';

const LENGTH = { mill: 11, flip: 9, shower: 10 };

// `g` is gravity's sign for things that fall or rise; `flow` is a clock that runs backwards while gravity is flipped,
// for water that streams.
export const makeMoment = () => ({ k: null, t: 0, g: 1, flow: 0, stars: [], spawn: 0, big: false, at: null });

// Starts a moment unless one is already running. `at` is the click in far-layer units, where a shower radiates from.
export function startMoment(Lf, k, at) {
  const M = Lf.mo;
  if (M.k || (k === 'call' && Lf.call.ct >= 0)) return;
  Object.assign(M, { k, t: 0, at, spawn: 0, big: false });
  if (k === 'call') Lf.call.next = Lf.t;
}

export function updateMoment(Lf, dt) {
  const M = Lf.mo, t = (M.t += dt);
  M.g = M.k === 'flip' ? 1 - 2 * (ease(t / 1.2) - ease((t - 7.5) / 1.5)) : 1;
  M.flow += dt * M.g;

  // A shower throws a meteor every fraction of a second away from where it was clicked, with one fireball midway.
  if (M.k === 'shower' && t < LENGTH.shower - 1.5 && (M.spawn -= dt) <= 0) {
    M.spawn = .2 + Math.random() * .4;
    const big = !M.big && t > 4, a = Math.PI / 2 + (Math.random() - .5) * 2.6, dx = Math.cos(a), dy = Math.sin(a), r = 30 + Math.random() * 140;
    if (big) M.big = true;
    M.stars.push({ x: M.at.x + dx * r, y: M.at.y + dy * r, dx, dy, v: big ? 330 : 420 + Math.random() * 260, tail: big ? 240 : 90 + Math.random() * 80, age: 0, life: big ? 1.7 : .6 + Math.random() * .5, big });
  }
  for (const s of M.stars) s.age += dt;
  M.stars = M.stars.filter(s => s.age < s.life + (s.big ? 2.5 : 0));

  if (M.k === 'call' ? t > 1 && Lf.call.ct < 0 : t > LENGTH[M.k]) M.k = null;
}

// The meteor shower, drawn on the far layer.
export function drawShower(c, Lf, P) {
  const M = Lf.mo;
  if (!M.stars.length) return;
  const col = P.night ? [236, 246, 255] : [255, 248, 230], head = sprite(col);
  c.globalCompositeOperation = 'lighter';
  c.lineCap = 'round';
  for (const s of M.stars) {
    const run = Math.min(s.age, s.life) * s.v, hx = s.x + s.dx * run, hy = s.y + s.dy * run;
    // A fireball leaves a glowing trail along its whole path that hangs in the sky for a moment.
    if (s.big) {
      const fade = s.age < s.life ? 1 : 1 - (s.age - s.life) / 2.5;
      c.strokeStyle = rgba(col, .16 * fade);
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(s.x, s.y);
      c.lineTo(hx, hy);
      c.stroke();
      if (s.age >= s.life) continue;
    }
    const k = s.age / s.life, a = Math.sin(Math.PI * k), tail = s.tail * Math.min(1, k * 3);
    const g = c.createLinearGradient(hx - s.dx * tail, hy - s.dy * tail, hx, hy);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(1, rgba(col, (P.night ? .85 : .7) * a));
    c.strokeStyle = g;
    c.lineWidth = s.big ? 3.2 : 1.5;
    c.beginPath();
    c.moveTo(hx - s.dx * tail, hy - s.dy * tail);
    c.lineTo(hx, hy);
    c.stroke();
    dab(c, head, hx, hy, s.big ? 22 : 7, (s.big ? .8 : .5) * a);
  }
  c.globalCompositeOperation = 'source-over';
}

// Where the mill's sails are while they fly: an offset from the hub, a wobble, and how fast they turn.
export function millFlight(Lf, ws) {
  const f = Lf.mo.k === 'mill' ? Lf.mo.t : -1;
  if (f < 0) return null;
  const air = ease((f - 1.6) / 2.2) * (1 - ease((f - 5) / 5.5));
  return { f, air, x: Math.sin(f * 1.3) * 34 * ws * air, y: -150 * ws * air, tilt: Math.sin(f * 2.2) * .5 * air, spin: f < 5 ? 18 : 4 };
}
