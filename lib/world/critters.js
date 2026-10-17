// The island's small creatures. Leaf fish fall from the tree like any other leaf until they change their mind and swim
// back up. Cloud sheep huddle up in the sky and pass for a cloud, lantern moths keep to the lanterns in the tree,
// dandelion folk walk the turf until a breeze takes them, and glow snails creep along the underside of the island,
// upside down. They get in each other's way: a breeze can carry a dandelion up onto the sheep's cloud, which ends with
// the cloud sneezing it out as seeds; moths call on the firefly jar after dark; and the snails hide from the whale.

import { TAU, blit, clamp, dab, ell, lerp, makeCanvas, mixc, puff, rgba, seeded, skyAt, sprite } from './core';
import { D_ISLE, pulseAt } from './life';
import { turnTo } from './whimsy';
import { ease } from './story';
import { watching } from './festival';
import { blow, gust } from './wind';

// How fast a scared sheep runs and a sheep creeps home, in units of the island's scale a second.
const RUN = 190, CREEP = 24;

// `night` sets everyone's starting pose, which is all a world held still for reduced motion ever shows.
export function makeCritters(K, night) {
  const rnd = seeded(71), { phone, s, iw, isle, tree: T, flock: F } = K, k = Math.max(s, .7);
  // The sheep huddle up into a cloud, a row along the bottom and one on top, each keeping its place in the huddle as
  // an offset from the middle. The one on top starts with its head out, so a world held still, where no dandelion ever
  // floats up to tickle them, still gives them away.
  const sheep = (phone ? [[-14, 4], [12, 5], [-1, -12]] : [[-25, 4], [-1, 6], [23, 3], [8, -14]]).map(([dx, dy], i, all) => ({
    dx: dx * k, dy: dy * k, x: F.x + dx * k, y: F.y + dy * k, hx: 0, hy: 0, st: 'home', tuck: 1, dir: dx < 0 ? -1 : 1, ph: rnd() * TAU, head: +(i === all.length - 1), peek: 0,
    hop: 0, puff: 0, hold: 0, sleep: night ? 1 : 0, a: 1, wait: 0, voice: .9 + rnd() * .2, top: i === all.length - 1, e: { hit: 0 },
  }));
  // Where a scared sheep may hide: open sky beside the crown, or on a phone, the right of the sky. Never in front of
  // the stackhouses, the lifter or the door, where a click on the sheep would set them off too.
  const box = phone ? [K.WU * .66, K.WU - 20 * k, 95, F.y + 140 * k] : [Math.max(K.WU * .36, F.x - 300 * k), T.cx + T.r * .3, 70, Math.min(K.top - 50 * s, F.y + 180 * k)];
  const { stack, lifter: Li, door: Dr } = K.wh, keep = [stack.hit, Li && [Li.x, Li.y, Li.r], Dr && [Dr.x, Dr.y - Dr.h / 2, Dr.h * .9]].filter(Boolean);
  // Each moth circles a lantern of its own, and now and then moves to another or sits on one.
  const L = T.lanterns;
  const moths = Array.from({ length: phone ? 3 : 5 }, () => {
    const home = Math.floor(rnd() * L.length), ph = rnd() * TAU;
    return {
      home, ph, ph2: rnd() * TAU, fp: rnd() * TAU, x: L[home].x + Math.cos(ph) * 12 * k, y: L[home].y + Math.sin(ph * 1.6) * 7 * k, vx: 0, vy: 0,
      st: 'fly', next: 3 + rnd() * 8, sc: 0, lure: false, wait: 0, e: { hit: 0 }, glow: {},
    };
  });
  const fa = isle.x0 + iw * .1, fb = isle.x0 + iw * .9;
  const folk = Array.from({ length: phone ? 3 : 5 }, () => {
    const x = fa + rnd() * (fb - fa);
    return { x, y: isle.topAt(x), tx: x, st: 'idle', next: 1 + rnd() * 4, k: 1, ph: rnd() * TAU, lean: 0, wait: 0, regrow: 0, near: false, sheep: null, e: { hit: 0 }, glow: {} };
  });
  // Each snail keeps to its own stretch of the underside, back and forth.
  const snails = (phone ? [[.22, .45], [.55, .8]] : [[.2, .38], [.44, .6], [.66, .82]]).map(([u0, u1]) => {
    const a = isle.x0 + iw * u0, b = isle.x0 + iw * u1;
    return { a, b, x: a + (b - a) * (.2 + rnd() * .6), dir: rnd() < .5 ? -1 : 1, tl: (20 + rnd() * 40) * k, hide: 0, st: 'out', hold: 0, turn: false, poke: false, near: false, ph: rnd() * TAU, e: { hit: 0 } };
  });
  return {
    fish: Array.from({ length: phone ? 4 : 6 }, (_, i) => ({ st: 'hide', wait: 2 + i * 2.5 + rnd() * 2, x: 0, y: 0, vx: 0, vy: 0, turn: 0, rot: 0, ph: rnd() * TAU, tx: 0, ty: 0 })),
    sheep, box, keep, F: { x: F.x, y: F.y, whole: 1, shiver: 0, near: false, peekIn: 10 + rnd() * 10, wisps: [], storm: {} }, grey: 0, drizzle: 0, burst: 0,
    moths, glitter: [], folk, fa, fb, gust: 14 + rnd() * 10, seeds: [], snails,
    // Which way along the island the sheep's cloud is, the way a breeze must blow to carry a dandelion up to it.
    side: Math.sign(F.x - T.x), rnd,
  };
}

export function updateCritters(Lf, K, dt, ptr, pulses, night) {
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
        f.y += f.vy * dt;
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
  updateSheep(C, Lf, K, dt, pi, pulses, night);
  updateMoths(C, Lf, K, dt, pi, pulses, night);
  updateFolk(C, Lf, K, dt, pi, pulses);
  updateSnails(C, Lf, K, dt, pi, pulses);
}

// Cloud sheep huddle up into a cloud and pass for one, drifting and breathing, and one now and then peeks out. A click
// on the cloud does nothing: only a dandelion riding on top gives them away. Pointed at while one rides, the cloud
// shivers and the one nearest can't help peeking out. When a click on the dandelion tickles them into sneezing, the
// sneeze bursts the cloud apart: they bleat and scurry off every which way, tuck in their legs and pretend to be little
// clouds, then creep back to the huddle, freezing whenever they are pointed at. Clicked while hiding or creeping, one
// runs off somewhere else. At night, and
// whenever the world dozes off, the huddle sleeps. A storm turns them grey, and while it rains they rise a little and
// rain too. At a lantern festival they all stay up and put their heads out to watch.
function updateSheep(C, Lf, K, dt, pi, pulses, night) {
  const { rnd, F } = C, k = Math.max(K.s, .7), t = Lf.t, S = Lf.play.storm, party = watching(Lf), bed = (night || Lf.doze > .5) && !party;
  C.grey = S ? S.power : 0;
  C.drizzle = S ? S.rain : 0;
  C.bed = bed;
  // The huddle drifts a little way to and fro and breathes, and squeezes up tight while it is pointed at.
  F.x = K.flock.x + Math.sin(t * .045) * 12 * k;
  F.y = K.flock.y + Math.sin(t * .27) * 2.5 * k - 10 * k * C.drizzle;
  // One asleep on the swing still counts as home: the rest keep up the cloud without it.
  const home = C.sheep.every(o => o.st === 'home' || o.st === 'swing'), here = home && C.sheep.every(o => o.wait <= 0);
  F.whole = clamp(F.whole + (home ? dt / 1.2 : -dt / .25), 0, 1);
  const rider = C.folk.some(f => f.st === 'ride' || f.st === 'snack');
  const near = here && rider && !!pi && Math.hypot((pi.x - F.x) / 1.6, pi.y - F.y) < 34 * k;
  F.shiver = clamp(F.shiver + (near ? dt * 3 : -dt * 1.5), 0, 1);
  const br = 1 + .02 * Math.sin(t * .7) - .05 * F.shiver;
  // One peeks out to see who it is, a moment after the pointer arrives, and now and then just to look round.
  if (near && !F.near) F.peekIn = Math.min(F.peekIn, .8);
  F.near = near;
  if (here && F.whole > .9 && !bed && (F.peekIn -= dt) < 0) {
    const ins = C.sheep.filter(b => b.st === 'home');
    const o = near ? ins.reduce((m, b) => (Math.abs(b.x - pi.x) < Math.abs(m.x - pi.x) ? b : m)) : ins[Math.floor(rnd() * ins.length)];
    o.peek = 1.6;
    o.dir = near ? Math.sign(pi.x - o.x) || 1 : Math.sign(o.dx) || 1;
    F.peekIn = 20 + rnd() * 25;
  }
  // A moment after a tickled sneeze, the cloud bursts, and they go out from the middle every which way.
  if (C.burst > 0 && (C.burst -= dt) <= 0 && here && F.whole > .5) {
    const ins = C.sheep.filter(o => o.st === 'home');
    for (const o of ins) scare(C, K, o, o.dx + (rnd() - .5) * 30 * k, o.dy + (rnd() - .5) * 20 * k);
    Lf.sfx.push(['scurry', F.x, ins.length]);
    const [a, b = a] = [...ins].sort(() => rnd() - .5);
    Lf.sfx.push(['baa', a.x, a.voice]);
    b.baa = .3;
    for (let i = 0; i < 9; i++) {
      const ang = rnd() * TAU, d = rnd() * 30 * k;
      F.wisps.push({ x: F.x + Math.cos(ang) * d, y: F.y + Math.sin(ang) * d * .5, vx: Math.cos(ang) * (30 + rnd() * 40) * k, vy: Math.sin(ang) * (15 + rnd() * 20) * k, r: (10 + rnd() * 8) * k, age: 0, life: .7 + rnd() * .5 });
    }
  }
  for (const w of F.wisps) {
    w.age += dt;
    w.x += w.vx * dt;
    w.y += w.vy * dt;
  }
  F.wisps = F.wisps.filter(w => w.age < w.life);
  for (const o of C.sheep) {
    const sx = F.x + o.dx * br + Math.sin(t * 37 + o.ph * 5) * .8 * k * F.shiver, sy = F.y + o.dy * br;
    if (o.wait > 0) {
      o.wait -= dt;
      [o.x, o.y] = [sx, sy];
      continue;
    }
    o.a = Math.min(1, o.a + dt / 1.5);
    o.hop = Math.max(0, o.hop - dt / .5);
    if (o.baa > 0 && (o.baa -= dt) <= 0) Lf.sfx.push(['baa', o.x, o.voice]);
    const pointed = !!pi && Math.hypot(pi.x - o.x, pi.y - o.y) < 30 * k;
    if (o.st !== 'home' && o.st !== 'run') {
      const h = pulseAt(pulses, D_ISLE, o.x, o.y, o.e);
      if (h && h[2] < 24 * k) {
        scare(C, K, o, h[0], h[1]);
        Lf.sfx.push(['scurry', o.x, 1], ['baa', o.x, o.voice]);
      }
    }
    if (party && o.st === 'home') {
      o.peek = Math.max(o.peek, .3);
      o.dir = Math.sign(K.tree.cx - o.x) || 1;
    }
    o.peek -= dt;
    let tuck = 1, head = o.peek > 0 ? 1 : 0;
    if (o.st === 'home') {
      [o.x, o.y] = [sx, sy];
      o.sleep = clamp(o.sleep + (bed ? dt / 1.5 : -dt / 1.2), 0, 1);
    } else if (o.st === 'swing') {
      // Fast asleep on the swing seat, rocking with it.
      const W = K.wh.swing, a = Lf.wh.swing.a;
      [o.x, o.y] = [W.x + Math.sin(a) * W.len, W.y + Math.cos(a) * W.len - 11 * k];
      o.sleep = 1;
    } else if (o.st === 'run') {
      // A dash with little hops in it, legs going like mad.
      const u = Math.min(1, (o.fu += dt) / o.fdur), hops = Math.max(2, Math.round(o.fdur * 4));
      o.x = lerp(o.x0, o.hx, u);
      o.y = lerp(o.y0, o.hy, u) - Math.abs(Math.sin(Math.PI * u * hops)) * 6 * k * (1 - u);
      o.ph += dt * 28;
      [tuck, head] = [u < .85 ? 0 : 1, 1];
      if (u === 1) Object.assign(o, { st: 'hide', hold: (bed ? 3 : 6) + rnd() * 4 });
    } else if (o.st === 'hide') {
      // Just a little cloud. Nobody look. It waits until nobody is.
      o.y = o.hy + Math.sin(t * .9 + o.ph) * 1.5 * k;
      if (!pointed && (o.hold -= dt) < 0) o.st = 'creep';
    } else if (!pointed) {
      // Creeping home on tiptoe, head down, the long way round nobody.
      const dx = sx - o.x, dy = sy - o.y, d = Math.hypot(dx, dy), v = Math.min(d, CREEP * k * dt);
      tuck = 0;
      head = Math.max(head, .3);
      if (o.tuck < .2) {
        o.x += (dx / (d || 1)) * v;
        o.y += (dy / (d || 1)) * v;
        o.dir = Math.sign(dx) || o.dir;
        o.ph += dt * 8;
      }
      if (d < 1) o.st = 'home';
    }
    o.tuck = clamp(o.tuck + (tuck ? dt / .35 : -dt / (o.st === 'run' ? .12 : .4)), 0, 1);
    o.head += (head - o.head) * Math.min(1, dt * 5);
  }
}

// While the page was out of sight, one of the sheep in the huddle (never the one on top, which the dandelions ride)
// slipped off to the tree swing and fell asleep on it. A click wakes it and sends it running. True if one did.
export function napOnSwing(Lf) {
  const S = Lf.critters.sheep, o = S.find(b => !b.top && b.st === 'home' && b.wait <= 0);
  if (!o || S.some(b => b.st === 'swing')) return false;
  Object.assign(o, { st: 'swing', sleep: 1, tuck: 1, head: 0, peek: 0, dir: -1 });
  return true;
}

// Sends a sheep running off to hide, away along (ax, ay): somewhere in open sky, clear of the crown and of what else a
// click there would set off, and not where another has gone.
function scare(C, K, o, ax, ay) {
  const { rnd, box: [x0, x1, y0, y1] } = C, T = K.tree, k = Math.max(K.s, .7), a0 = Math.atan2(ay, ax);
  let to = null;
  for (let i = 0; i < 12 && !to; i++) {
    const a = a0 + (rnd() - .5) * (1 + i * .25), d = (90 + rnd() * 110) * k, x = o.x + Math.cos(a) * d, y = o.y + Math.sin(a) * d * .7;
    if (x < x0 || x > x1 || y < y0 || y > y1 || Math.hypot((x - T.cx) / (T.r * .85 + 25 * k), (y - T.cy) / (T.r * .45 + 25 * k)) < 1) continue;
    if (C.keep.some(([cx, cy, r]) => Math.hypot(x - cx, y - cy) < r + 25 * k)) continue;
    if (!C.sheep.some(b => b !== o && b.st !== 'home' && Math.hypot(b.hx - x, b.hy - y) < 45 * k)) to = [x, y];
  }
  const [hx, hy] = to || [clamp(o.x + (ax < 0 ? -60 : 60) * k, x0, x1), clamp(o.y, y0, y1)];
  Object.assign(o, { st: 'run', x0: o.x, y0: o.y, hx, hy, fu: 0, fdur: clamp(Math.hypot(hx - o.x, hy - o.y) / (RUN * k), .6, 1.6), dir: Math.sign(hx - o.x) || 1, sleep: 0, peek: 0 });
}

// Lantern moths circle the lanterns, sometimes moving to another, sometimes sitting on one, and a lantern that rings
// sends its sitter off. After dark, with fireflies in the jar, they take turns calling on it. Pointed at, they take the
// pointer for a lamp and circle that instead. Clicked, they scatter in a shower of glitter and the lanterns nearby
// flicker. At a lantern festival each sees one of the sky lanterns off a little way, then comes back.
function updateMoths(C, Lf, K, dt, pi, pulses, night) {
  const { rnd } = C, L = K.tree.lanterns, k = Math.max(K.s, .7), t = Lf.t, J = Lf.play.jar;
  // A moth whose home is -1 is visiting the jar, circling a little above its lid. It never sits on it.
  const jar = { x: J.x, y: J.y - 24 * K.s };
  let burst = null;
  for (const m of C.moths) {
    if (m.wait > 0) {
      m.wait -= dt;
      continue;
    }
    const hit = pulseAt(pulses, D_ISLE, m.x, m.y, m.e);
    if (hit && hit[2] < 36 * k) burst = { x: m.x - hit[0] * hit[2], y: m.y - hit[1] * hit[2], id: m.e.hit };
    const d = pi ? Math.hypot(pi.x - m.x, pi.y - m.y) : Infinity;
    if (d < 70 * k) m.lure = true;
    else if (d > 170 * k) m.lure = false;
    m.fp += dt * (m.st === 'rest' ? 1.4 : 19 + 5 * Math.sin(t * 1.3 + m.ph2));
    // A dozing world puts them all to rest on their lanterns until it wakes.
    if (Lf.doze > .5 && m.st === 'fly' && m.sc <= 0) Object.assign(m, { st: 'rest', next: 2 + rnd() * 3, home: m.home < 0 ? Math.floor(rnd() * L.length) : m.home });
    const sk = Lf.fest?.sky[m.see], l = sk?.up && sk.age < 7 ? sk : m.home < 0 ? jar : L[m.home];
    if (m.st === 'rest') {
      m.x += (l.x - m.x) * Math.min(1, dt * 6);
      m.y += (l.y - 5 * k - m.y) * Math.min(1, dt * 6);
      if (Lf.doze > .5) continue;
      if ((m.next -= dt) < 0 || l.ring > .9 || m.lure) Object.assign(m, { st: 'fly', vx: 0, vy: -40 * k, next: 5 + rnd() * 8 });
      continue;
    }
    if (m.sc > 0) m.sc -= dt;
    else if ((m.next -= dt) < 0) {
      if (rnd() < .35 && m.home >= 0) Object.assign(m, { st: 'rest', next: 4 + rnd() * 5 });
      else Object.assign(m, { home: night && J.n && m.home >= 0 && rnd() < .4 ? -1 : Math.floor(rnd() * L.length), next: 5 + rnd() * 8 });
    }
    // A wobbly loop round the lamp, with a flutter on top. A scattered moth coasts until it has calmed down.
    m.ph += dt * (1.4 + .5 * Math.sin(t * .6 + m.ph2));
    const [tx, ty] = m.lure ? [pi.x, pi.y] : [l.x, l.y], R = (m.lure ? 16 : m.home < 0 ? 9 : 12 + 4 * Math.sin(t * .5 + m.ph2)) * k, pull = m.sc > 0 ? 0 : 10;
    const gx = tx + Math.cos(m.ph) * R + Math.sin(t * 8.3 + m.ph2) * 1.6 * k, gy = ty + Math.sin(m.ph * 1.6) * R * .55 + Math.cos(t * 6.1 + m.ph) * 1.6 * k;
    m.vx += ((gx - m.x) * pull - m.vx * 3.5) * dt;
    m.vy += ((gy - m.y) * pull - m.vy * 3.5) * dt;
    m.x += m.vx * dt;
    m.y += m.vy * dt;
  }
  if (burst) {
    Lf.sfx.push(['flutter', burst.x]);
    for (const m of C.moths) {
      const dx = m.x - burst.x, dy = m.y - burst.y, d = Math.hypot(dx, dy) || 1;
      if (m.wait > 0 || d > 140 * k) continue;
      // Marked as reached by this click, so it can't set off a second burst.
      m.e.hit = burst.id;
      Object.assign(m, { st: 'fly', sc: 1.6, lure: false, home: Math.floor(rnd() * L.length), vx: (dx / d) * 220 * k, vy: (dy / d) * 220 * k - 60 * k });
      for (let i = 0; i < 9; i++) C.glitter.push({ x: m.x, y: m.y, vx: (rnd() - .5) * 70 * k, vy: (rnd() - .7) * 50 * k, age: 0, life: 1 + rnd() * 1.2, ph: rnd() * TAU });
    }
    for (const l of L) if (l.ring < .4 && Math.hypot(l.x - burst.x, l.y - burst.y) < 60 * k) l.ring = .5;
  }
  if (C.glitter.length) {
    const drag = Math.pow(.2, dt);
    for (const g of C.glitter) {
      g.age += dt;
      g.vx *= drag;
      g.vy = g.vy * drag + 14 * k * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
    }
    C.glitter = C.glitter.filter(g => g.age < g.life);
  }
}

// Dandelion folk potter about the turf. Every so often a breeze picks them up one after another and carries them along
// the island in a wobbly line. Pointed at, one stops and leans in to look. Clicked, it bursts into seeds that blow away,
// and a new one grows where the first seed lands.
// The breeze is a gust of the wind's, the strongest it has, and the folk lean into the wind's smaller ones too.
// A breeze toward the sheep's cloud may carry the one in front right up off the island. It floats up under its head
// like a parachute and lands on top of the cloud, and rides about on it for a while, napping if the sheep sleep. Then
// the sheep under it pokes its head out, breathes in, and sneezes it out as seeds. Clicked while it rides, it tickles
// them: the sheep sneezes it off at once, and the sneeze bursts the cloud.
// At a lantern festival they gather under the tree and lean back to watch the lanterns go up.
function updateFolk(C, Lf, K, dt, pi, pulses) {
  const { rnd, fa, fb } = C, { isle } = K, k = Math.max(K.s, .7), t = Lf.t, nod = Lf.doze, party = watching(Lf);
  // No breezes while the world dozes, or while everyone watches the lanterns.
  if (!nod && !party && (C.gust -= dt) < 0) {
    const on = C.folk.filter(f => f.wait <= 0 && (f.st === 'idle' || f.st === 'walk'));
    const lo = Math.min(...on.map(f => f.x)), hi = Math.max(...on.map(f => f.x)), dir = fb - hi > lo - fa ? 1 : -1;
    const dist = Math.min(dir > 0 ? fb - hi : lo - fa, (90 + rnd() * 90) * k);
    C.gust = 5;
    if (on.length > 1 && dist > 30 * k) {
      C.gust = 22 + rnd() * 16;
      // The one at the front goes first, and each of the others a moment after the one ahead of it.
      on.sort((a, b) => (b.x - a.x) * dir).forEach((f, i) => Object.assign(f, { st: 'fly', fx: f.x, fd: dist * dir, fu: -i * .45, fdur: 2.4 + dist / (26 * k), fh: (38 + rnd() * 22) * k }));
      blow(Lf, K, dir, 1, 2.4 + dist / (26 * k));
      const top = C.sheep.find(o => o.top);
      // At night it goes up all the same, to nap on the sleeping sheep. On a phone the cloud is further up the sky, so
      // the climb is longer.
      if (dir === C.side && C.F.whole === 1 && top.wait <= 0 && rnd() < .7 && !C.folk.some(f => f.sheep)) {
        Object.assign(on[0], { st: 'drift', sheep: top, fx: on[0].x, fy: on[0].y, fu: 0, fdur: (8 + rnd() * 2) * (K.phone ? 1.35 : 1) });
      }
    }
  }
  for (const f of C.folk) {
    if (f.wait > 0) {
      f.wait -= dt;
      continue;
    }
    if (f.st !== 'gone' && f.st !== 'grow') {
      const hit = pulseAt(pulses, D_ISLE, f.x, f.y - 16 * k, f.e);
      if (hit && hit[2] < 18 * k && (f.st === 'ride' || f.st === 'snack')) {
        if (f.st === 'ride') Object.assign(f, { st: 'snack', fu: .9 });
        f.tickle = true;
      } else if (hit && hit[2] < 18 * k) {
        poof(C, Lf, f, k);
        continue;
      }
    }
    f.near = false;
    if (f.st === 'gone') {
      // No seed found room on the turf: one grows somewhere anyway.
      if ((f.regrow -= dt) < 0) {
        const x = fa + rnd() * (fb - fa);
        Object.assign(f, { st: 'grow', x, tx: x, y: isle.topAt(x), k: 0 });
      }
    } else if (f.st === 'grow') {
      if ((f.k = Math.min(1, f.k + dt / 2.6)) === 1) {
        Object.assign(f, { st: 'idle', next: 1 + rnd() * 2 });
        Lf.sfx.push(['sprout', f.x]);
      }
    } else if (f.st === 'fly') {
      const u = clamp((f.fu += dt) / f.fdur, 0, 1), lift = Math.sin(Math.PI * u);
      f.x = f.fx + f.fd * ease(u);
      f.y = isle.topAt(f.x) - lift * f.fh + Math.sin(t * 3.4 + f.ph) * 3 * k * lift;
      f.lean = Math.sign(f.fd) * .35 * lift + Math.sin(t * 2.7 + f.ph) * .15 * lift;
      if (u >= 1) Object.assign(f, { st: 'idle', next: 1 + rnd() * 3, lean: 0 });
    } else if (f.st === 'drift') {
      // Lifted on the breeze in a long slow climb, swaying, to the top of the sheep's cloud.
      const o = f.sheep, u = Math.min(1, (f.fu += dt) / f.fdur), [sx, sy] = o.seat || [o.x, o.y - 20 * k], arc = Math.sin(Math.PI * u);
      f.x = lerp(f.fx, sx, ease(u)) + Math.sin(t * 1.1 + f.ph) * 10 * k * arc;
      f.y = lerp(f.fy, sy, ease(u)) - Math.sin(Math.PI * Math.sqrt(u)) * 45 * k;
      f.lean = Math.sin(t * 1.7 + f.ph) * .22 * arc - .1 * arc;
      if (u >= 1) Object.assign(f, { st: 'ride', fu: 0, fdur: 10 + rnd() * 6 });
    } else if (f.st === 'ride' || f.st === 'snack') {
      // If the cloud runs off under it, the dandelion goes POOF in fright.
      const o = f.sheep, u = (f.fu += dt);
      if (o.st !== 'home') {
        o.puff = 0;
        poof(C, Lf, f, k);
        continue;
      }
      if (o.seat) [f.x, f.y] = o.seat;
      if (f.st === 'ride') {
        // Swaying as the cloud breathes, and nodding off on it when the sheep sleep, which stops the clock.
        f.lean += ((o.sleep ? (Math.sin(f.ph) > 0 ? .4 : -.4) * o.sleep : Math.sin(t * .8 + f.ph) * .1) - f.lean) * Math.min(1, dt * 4);
        if (o.sleep || C.bed) f.fu -= dt;
        else if (u > f.fdur) Object.assign(f, { st: 'snack', fu: 0 });
      } else {
        // The sheep under it looks out, takes a breath in that swells it up, and at the top of it sneezes, timed to
        // the sound. The whole cloud jumps.
        o.peek = .3;
        f.lean += (o.dir * .25 - f.lean) * Math.min(1, dt * 3);
        if (u > 1.1 && !f.sniff) {
          f.sniff = true;
          Lf.sfx.push(['sneeze', o.x, o.voice]);
        }
        o.puff = u > 1.1 ? .3 * ease((u - 1.1) / .55) : 0;
        if (u > 1.65) {
          o.puff = 0;
          for (const b of C.sheep) b.hop = .99;
          if (f.tickle) C.burst = .15;
          poof(C, Lf, f, k, o);
        }
      }
    } else {
      // Dozing, each nods off to one side, breathing.
      f.near = !!pi && Math.hypot(pi.x - f.x, pi.y - (f.y - 16 * k)) < 24 * k;
      const droop = nod * (Math.sin(f.ph) > 0 ? .32 : -.32) * (1 + .15 * Math.sin(t * 1.3 + f.ph));
      if (party && f.spot !== undefined) {
        const d = f.spot - f.x, far = Math.abs(d) > .5;
        f.x += Math.sign(d) * Math.min(Math.abs(d), 14 * k * dt);
        f.y = isle.topAt(f.x);
        f.st = far ? 'walk' : 'idle';
        if (far) f.ph += dt * 12;
        f.lean += ((far ? 0 : Math.sign(f.x - K.tree.x) * .32) - f.lean) * Math.min(1, dt * 2);
        continue;
      }
      f.lean += ((f.near ? (pi.x > f.x ? .3 : -.3) : droop + gust(Lf.wind, K, f.x) * .3) - f.lean) * Math.min(1, dt * 5);
      if (f.near || nod) continue;
      if (f.st === 'walk') {
        const d = f.tx - f.x;
        f.x += Math.sign(d) * Math.min(Math.abs(d), 5 * k * dt);
        f.ph += dt * 9;
        if (Math.abs(d) < .5) Object.assign(f, { st: 'idle', next: 2 + rnd() * 4 });
      } else if ((f.next -= dt) < 0) Object.assign(f, { st: 'walk', tx: clamp(f.x + (rnd() - .5) * 100 * k, fa, fb) });
      f.y = isle.topAt(f.x);
    }
  }
  if (C.seeds.length) {
    for (const sd of C.seeds) {
      sd.age += dt;
      if (sd.land >= 0) {
        sd.land += dt;
        continue;
      }
      // Each seed hangs from its own little parachute, so it drifts down slowly on the breeze, and a gust takes it.
      sd.vx += ((8 + 60 * gust(Lf.wind, K, sd.x)) * k - sd.vx) * dt * .8;
      sd.vy += (9 * k - sd.vy) * dt * 1.2;
      sd.x += sd.vx * dt + Math.sin(t * 2.3 + sd.ph) * 6 * k * dt;
      sd.y += sd.vy * dt;
      if (sd.vy > 0 && sd.x > fa && sd.x < fb && sd.y > isle.topAt(sd.x)) {
        sd.land = 0;
        if (sd.f.st === 'gone') Object.assign(sd.f, { st: 'grow', x: sd.x, tx: sd.x, y: isle.topAt(sd.x), k: 0 });
      }
    }
    C.seeds = C.seeds.filter(sd => (sd.land < 0 ? sd.age < 9 : sd.land < 1.5));
  }
}

// A folk bursting into seeds. Sneezed off by sheep `o`, the seeds spray from its head the way the sheep faces, and the
// sneeze is the only sound.
function poof(C, Lf, f, k, o) {
  const { rnd } = C;
  for (let i = 0; i < (o ? 14 : 12); i++) {
    const a = o ? (o.dir > 0 ? 0 : Math.PI) - o.dir * (.25 + (rnd() - .5) * 1.1) : rnd() * TAU, v = o ? (40 + rnd() * 60) * k : (12 + rnd() * 30) * k;
    const [x, y] = o ? [f.x + o.dir * 4 * k, f.y - 20 * k] : [f.x + Math.cos(a) * 5 * k, f.y - 20 * k + Math.sin(a) * 5 * k];
    C.seeds.push({ x, y, vx: Math.cos(a) * v + 10 * k, vy: Math.sin(a) * v - (o ? 8 : 22) * k, ph: rnd() * TAU, age: 0, land: -1, f });
  }
  Object.assign(f, { st: 'gone', regrow: 8, k: 0, lean: 0, sheep: null, sniff: false, tickle: false });
  if (o) return;
  Lf.sfx.push(['poof', f.x]);
  // One click, one puff: a neighbour standing close by is left alone.
  for (const n of C.folk) if (Math.abs(n.x - f.x) < 40 * k) n.e.hit = f.e.hit;
}

// Glow snails creep along their stretch of the underside, leaving a trail, and at either end pull in, turn round inside
// their shells and come back out the other way. Pointed at, one stops and waves its feelers. Clicked, it pulls in, and
// after a moment peeks back out. The great whale going by below sends them in too, quietly, until it has passed. At a
// lantern festival they stop where they are and wave their feelers.
function updateSnails(C, Lf, K, dt, pi, pulses) {
  const k = Math.max(K.s, .7), W = Lf.whales.find(w => w.near && w.wait <= 0), wx = W ? W.x - W.dir * W.L * .4 : 0;
  for (const n of C.snails) {
    const { tx, sx, sy } = snailFrame(n, K, k), hit = pulseAt(pulses, D_ISLE, sx, sy, n.e);
    if (hit && hit[2] < 18 * k && n.st !== 'in') {
      Object.assign(n, { st: 'in', hold: 2.5, poke: true });
      Lf.sfx.push(['shloop', n.x]);
    }
    n.near = watching(Lf) || (!!pi && Math.hypot(pi.x - sx, pi.y - sy) < 24 * k);
    // A dozing world sends them into their shells, quietly, until it wakes.
    const shy = Lf.doze > .5 || (W && !n.top && Math.abs(n.x - wx) < W.L * .55);
    if (shy && n.st !== 'in') Object.assign(n, { st: 'in', hold: .8, poke: false });
    if (n.st === 'in') {
      n.hide = Math.min(1, n.hide + dt / .3);
      if (n.hide === 1 && !shy && (n.hold -= dt) < 0) {
        if (n.turn) Object.assign(n, { dir: -n.dir, tl: 0, turn: false });
        if (n.poke) Lf.sfx.push(['peek', n.x]);
        Object.assign(n, { st: 'peek', poke: false });
      }
    } else if (n.st === 'peek') {
      if (!(n.hide = Math.max(0, n.hide - dt / 1.6))) n.st = 'out';
    } else if (!n.near) {
      // The same pace along a slope as on the flat.
      const v = 2.2 * k * Math.abs(tx);
      n.x += n.dir * v * dt;
      n.tl = Math.min(70 * k, n.tl + v * dt);
      if (n.dir > 0 ? n.x > n.b : n.x < n.a) Object.assign(n, { st: 'in', hold: 1.5, turn: true });
    }
  }
}

// The snails go on before anything else on the island layer, so the whale and the jellies pass in front of them.
export function drawUnderside(c, Lf, K, P, t) {
  drawSnails(c, Lf.critters, K, P, t, Lf.hits, Lf.lite, false);
}

export function drawCritters(c, Lf, K, P, t) {
  const C = Lf.critters, H = Lf.hits, s = K.s;
  drawSnails(c, C, K, P, t, H, Lf.lite, true);
  drawSheep(c, C, K, P, t, H);
  drawFolk(c, C, K, P, t, H);
  for (const f of C.fish) if (f.st !== 'hide') drawLeafFish(c, f, s, P, t, H);
  drawMoths(c, C, K, P, t, H, Lf.lite);
}

// The sheep's two tones, a cloud's as the sky's clouds are painted at that height, a little nearer than the far banks:
// the top in the light, and the shade underneath.
function flockTones(K, P) {
  const sky = skyAt(P, K.flock.y);
  return { dark: mixc(P.cloudDark, sky, .35), lit: mixc(P.cloudLit, sky, .25) };
}

// Two fleeces for the theme, fair and storm grey, painted once and kept until the theme changes, with a cloud to go
// round the huddle in each. Fair is the sky's own cloud, a touch brighter, so a sheep is a bit of it that got up and
// ran.
function fleeces(C, K, P) {
  if (C.fleeceP !== P) {
    C.fleeceP = P;
    const { dark, lit: top } = flockTones(K, P), lit = mixc(top, P.light, .3), shade = mixc(dark, top, .55), grey = P.night ? [44, 56, 70] : [104, 112, 122];
    C.wool = lit;
    C.fleeces = [fleece(lit, shade), fleece(mixc(lit, grey, .75), mixc(shade, grey, .8))];
    C.clouds = [huddle(K, P, dark, top), huddle(K, P, mixc(dark, grey, .8), mixc(top, grey, .75))];
  }
  return C.fleeces;
}
// A fleece of cloud, 96 by 72 pixels and lit from the upper right: a ring of lobes round a body, a lit layer over the
// top of it, a few bright curls, and a soft haze round it all.
function fleece(lit, shade) {
  const cv = makeCanvas(), c = cv.getContext('2d'), rnd = seeded(5), lobes = [];
  cv.width = 96;
  cv.height = 72;
  puff(c, 48, 38, 46, lit, .22);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * TAU;
    lobes.push([48 + Math.cos(a) * 26, 38 + Math.sin(a) * 15, 10 + rnd() * 3]);
  }
  const blob = (dx, dy, f) => {
    c.beginPath();
    for (const [x, y, r] of lobes) if (f === 1 || y < 44 || x > 52) ell(c, x + dx, y + dy, r * f, r * f, 0);
    ell(c, 48 + dx * 1.4, 38 + dy * 1.4, 28 * f, 17 * f, 0);
    c.fill();
  };
  // A soft edge, so it reads as cloud rather than cut out.
  for (const [x, y, r] of lobes) puff(c, x, y, r * 1.7, shade, .45);
  c.fillStyle = rgba(shade);
  blob(0, 0, 1);
  c.fillStyle = rgba(lit);
  blob(1.5, -2.5, .8);
  c.fillStyle = rgba(mixc(lit, [255, 255, 255], .5), .7);
  c.beginPath();
  for (let i = 0; i < 7; i++) ell(c, 44 + rnd() * 30, 18 + rnd() * 16, 2.5 + rnd() * 2, 2 + rnd() * 1.5, 0);
  c.fill();
  return cv;
}

// The cloud round the huddle, which fills in between the sheep so the lot of them reads as one: soft dabs the way the
// sky's clouds are painted, a darker body and a lit layer nudged toward the light. Painted once for the theme at the
// most the layer is ever drawn at, 1.25 pixels to the unit, HUD_W by HUD_H in units of the sheep's scale, with the
// middle of the huddle HUD_Y down from the top.
const HUD_W = 150, HUD_H = 80, HUD_Y = 46;
function huddle(K, P, dark, lit) {
  const k = Math.max(K.s, .7), q = 1.25 * K.U * k, cv = makeCanvas(), c = cv.getContext('2d'), rnd = seeded(23), pts = [];
  cv.width = Math.ceil(HUD_W * q);
  cv.height = Math.ceil(HUD_H * q);
  c.setTransform(q, 0, 0, q, (HUD_W / 2) * q, HUD_Y * q);
  const lx = K.L.x - K.flock.x, ly = K.L.y - K.flock.y, ld = Math.hypot(lx, ly) || 1;
  for (let i = 0; i < 16; i++) {
    const u = rnd(), hump = Math.sin(Math.PI * u);
    pts.push([(u - .5) * 100, 4 - hump * 14 * rnd(), (10 + 16 * hump) * (.7 + rnd() * .4)]);
  }
  for (const [x, y, r] of pts) puff(c, x, y, r, dark, .8);
  for (const [x, y, r] of pts) puff(c, x + (lx / ld) * r * .3, y + (ly / ld) * r * .2 - r * .12, r * .72, lit, .62);
  return cv;
}

// A sheep is a fleece on four dark legs with a dark head and a curl of wool on top. No face. Tucked in, legs, head and
// all, it is only a fleece, and huddled up with the others in their cloud, all of them together are just a cloud.
function drawSheep(c, C, K, P, t, H) {
  const k = Math.max(K.s, .7), F = C.F, [white, grey] = fleeces(C, K, P), dark = mixc(P.night ? [22, 30, 40] : [56, 48, 52], P.haze, .3);
  const rain = new Path2D(), here = C.sheep.reduce((m, o) => m + (o.wait > 0 ? 0 : ease(o.a)), 0) / C.sheep.length;
  const hid = ease(F.whole) * here, peeks = [];
  // Bits of the cloud flung off as it bursts apart.
  for (const w of F.wisps) {
    const u = w.age / w.life;
    dab(c, sprite(C.wool), w.x, w.y, w.r * (1 + u), .5 * (1 - u));
  }
  for (const o of C.sheep) {
    if (o.wait > 0) continue;
    const sl = o.sleep, tk = o.tuck, run = o.st !== 'home' && o.st !== 'hide' && tk < .5, hop = o.hop < 1 ? Math.sin(Math.PI * o.hop) * 5 * k : 0;
    const sc = (1 + .35 * ease(o.puff)) * (1 + tk * (o.st === 'home' ? .3 : .16)) * (1 + .03 * Math.sin(t * 1.7 + o.ph) * (sl || .4));
    const cy = o.y - hop - (run ? Math.abs(Math.sin(o.ph)) * k : 0) + (1 - ease(o.a)) * 6 * k;
    // Huddled up, they melt into their cloud, and only a head poking out of it gives them away.
    const veil = o.st === 'home' ? 1 - hid : 1;
    c.globalAlpha = o.a * veil;
    // Legs, drawn up into the fleece as it tucks in. Running they scramble, and creeping they tiptoe.
    if (tk < .95 && veil > .01) {
      c.strokeStyle = rgba(dark);
      c.lineWidth = 2.1 * k;
      c.lineCap = 'round';
      c.beginPath();
      const L = 10 * k * (1 - tk);
      [-8, -4, 5, 9].forEach((lx, i) => {
        const sw = run ? Math.sin(o.ph + (i % 2) * Math.PI) * (o.st === 'run' ? .7 : .35) : 0;
        c.moveTo(o.x + lx * k * o.dir, cy + 5 * k);
        c.lineTo(o.x + (lx * k + Math.sin(sw) * L) * o.dir, cy + 5 * k + Math.cos(sw) * L);
      });
      c.stroke();
    }
    // The head comes out from behind the fleece: up to look, low to creep. Out all the way, it goes in front.
    const out = Math.max(1 - tk, o.head), hu = o.st === 'creep' ? .3 : 1;
    const head = () => {
      c.save();
      c.translate(o.x, cy);
      c.scale(o.dir * sc * k, sc * k);
      c.translate(lerp(6, lerp(15, 13, hu), out), lerp(lerp(10, -4, hu), 0, 1 - out));
      c.rotate(lerp(1.1, -.3, hu));
      c.fillStyle = rgba(dark);
      c.beginPath();
      ell(c, 0, 0, 4.4, 3, 0);
      ell(c, -2, -2.6, 2.3, .9, -.5);
      c.fill();
      c.fillStyle = rgba(C.wool, .95);
      c.beginPath();
      ell(c, -1.4, -2.6, 2.2, 1.8, 0);
      c.fill();
      c.restore();
    };
    if (veil > .01) {
      if (out > .02 && out < .98) head();
      // The fleece isn't turned with the sheep, so its light stays on the side the light is.
      const w = 37 * k * sc, h = w * .75;
      c.drawImage(white, o.x - w / 2, cy - h / 2, w, h);
      if (C.grey > .02) {
        c.globalAlpha = o.a * veil * C.grey;
        c.drawImage(grey, o.x - w / 2, cy - h / 2, w, h);
        c.globalAlpha = o.a * veil;
      }
      if (out >= .98) head();
    }
    if (o.st === 'home' || o.st === 'swing') peeks.push([o, head, out, cy]);
    if (C.drizzle > .05) {
      for (let j = 0; j < 3; j++) {
        const x = o.x + (j - 1) * 7 * k, y0 = cy + 9 * k * sc, u = (t * 1.6 + j * .37 + o.ph) % 1, y = y0 + u * 70 * k;
        rain.moveTo(x, y);
        rain.lineTo(x - .5 * k, y + 3 * k);
      }
    }
    // Where a dandelion riding it stands, a little behind the middle, its feet sunk into the top of the cloud.
    o.seat = [o.x - 3 * k * o.dir * sc, cy - 4 * k * sc];
    // Found out only once it is out of the huddle, or has its head out.
    if (o.st !== 'home') H.push(['sheep', o.x, cy, 20 * k * sc, D_ISLE]);
    else if (out > .5) H.push(['sheep', o.x + 14 * k * sc * o.dir, cy - 2 * k * sc, 10 * k, D_ISLE]);
  }
  // Their cloud, shivering while it is pointed at and jumping when they sneeze, with any head poking out of it in front.
  if (hid > 0) {
    const jump = Math.max(...C.sheep.map(o => Math.sin(Math.PI * o.hop))) * 5 * k;
    const [fair, storm] = C.clouds, w = HUD_W * k, h = HUD_H * k, x = F.x - w / 2 + Math.sin(t * 37) * 1.2 * k * F.shiver, y = F.y - HUD_Y * k - jump;
    c.globalAlpha = hid;
    blit(c, fair, x, y, w, h, F);
    if (C.grey > .02) {
      c.globalAlpha = hid * C.grey;
      blit(c, storm, x, y, w, h, F.storm);
    }
  }
  for (const [o, head, out, cy] of peeks) {
    if (o.st === 'home' && out > .02 && hid > .01) {
      c.globalAlpha = o.a * out * hid;
      head();
    }
    // Asleep, each breathes out a little puff of cloud now and then, which drifts up out of the huddle and fades.
    if (o.sleep > .6) {
      const u = (t * .22 + o.ph / TAU) % 1;
      c.globalAlpha = 1;
      dab(c, sprite(C.wool), o.x + (7 * o.dir + Math.sin(u * 5) * 2) * k, cy - (6 + u * 26) * k, (2 + 4 * u) * k, (o.a * .5 * Math.sin(Math.PI * u) * (o.sleep - .6)) / .4);
    }
  }
  c.globalAlpha = 1;
  if (C.drizzle > .05) {
    c.strokeStyle = rgba(P.water, .55 * C.drizzle);
    c.lineWidth = .8 * k;
    c.stroke(rain);
  }
}

// A moth seen from above: two pairs of soft wings that open and close, a furry body, feathery feelers. After dark the
// lanterns light them up. Each moth is one copy from a strip of wing poses, painted once for the theme.
const MOTH_POSES = 12, MOTH_Q = 4, MOTH_W = 26, MOTH_H = 16;
function mothPoses(C, P) {
  if (C.mothP !== P) {
    C.mothP = P;
    const night = P.night, wing = night ? [190, 232, 222] : [226, 206, 176], edge = night ? [70, 140, 140] : [112, 90, 70], body = night ? [80, 120, 124] : [96, 78, 62];
    const cv = makeCanvas(), c = cv.getContext('2d');
    cv.width = MOTH_POSES * MOTH_W * MOTH_Q;
    cv.height = MOTH_H * MOTH_Q;
    c.lineCap = 'round';
    for (let i = 0; i < MOTH_POSES; i++) {
      const o = .1 + (.9 * i) / (MOTH_POSES - 1);
      c.setTransform(MOTH_Q, 0, 0, MOTH_Q, (i + .5) * MOTH_W * MOTH_Q, 8.5 * MOTH_Q);
      c.beginPath();
      for (const sd of [-1, 1]) {
        ell(c, sd * 5 * o, -1, 5.4 * o + .4, 3.6, -sd * .45);
        ell(c, sd * 3.4 * o, 2.6, 3.4 * o + .3, 2.5, sd * .55);
      }
      c.fillStyle = rgba(wing, .95);
      c.fill();
      c.strokeStyle = rgba(edge, .6);
      c.lineWidth = .6;
      c.stroke();
      c.fillStyle = rgba(edge, .7);
      c.beginPath();
      if (o > .4) for (const sd of [-1, 1]) ell(c, sd * 4.6 * o, -1.2, .9, .9, 0);
      c.fill();
      c.fillStyle = rgba(body);
      c.beginPath();
      ell(c, 0, .6, 1.3, 4.2, 0);
      ell(c, 0, -2.4, 1.6, 1.6, 0);
      c.fill();
      c.strokeStyle = rgba(body);
      c.lineWidth = .5;
      c.beginPath();
      for (const sd of [-1, 1]) {
        c.moveTo(sd * .5, -3.6);
        c.quadraticCurveTo(sd * 1.5, -6, sd * 3, -6.6);
      }
      c.stroke();
    }
    C.mothPoses = cv;
  }
  return C.mothPoses;
}
function drawMoths(c, C, K, P, t, H, lite) {
  const k = Math.max(K.s, .7), poses = mothPoses(C, P), fw = MOTH_W * MOTH_Q, fh = MOTH_H * MOTH_Q;
  if (P.night) {
    c.globalCompositeOperation = 'lighter';
    const gs = sprite(P.glow);
    for (const m of C.moths) if (m.wait <= 0) dab(c, gs, m.x, m.y, 14 * k, .18, m.glow);
    c.globalCompositeOperation = 'source-over';
  }
  for (const m of C.moths) {
    if (m.wait > 0) continue;
    const o = m.st === 'rest' ? .55 + .45 * Math.sin(m.fp) : .2 + .8 * Math.abs(Math.cos(m.fp)), i = Math.round(((o - .1) / .9) * (MOTH_POSES - 1));
    c.save();
    c.translate(m.x, m.y);
    c.rotate(clamp((m.vx * .004) / k, -.5, .5));
    c.drawImage(poses, i * fw, 0, fw, fh, (-MOTH_W / 2) * k, -8.5 * k, MOTH_W * k, MOTH_H * k);
    c.restore();
    H.push(['moths', m.x, m.y, 12 * k, D_ISLE]);
  }
  if (C.glitter.length) drawGlitter(c, C, k, P, lite);
}

// The glitter a startled moth sheds, twinkling as it falls. In lite mode it keeps its sparkle but not the haze round it.
function drawGlitter(c, C, k, P, lite) {
  c.globalCompositeOperation = 'lighter';
  const gs = sprite(P.glow), cs = sprite([255, 250, 235]);
  for (const g of C.glitter) {
    const f = 1 - g.age / g.life, tw = .5 + .5 * Math.sin(g.age * 24 + g.ph);
    if (!lite) dab(c, gs, g.x, g.y, 3.2 * k, .45 * f * tw);
    dab(c, cs, g.x, g.y, .9 * k, f * tw);
  }
  c.globalCompositeOperation = 'source-over';
}

// A dandelion clock for the theme, 64 pixels square: seeds on fine stalks all round a small head, and a faint haze.
function clock(C, P) {
  if (C.clockP !== P) {
    C.clockP = P;
    const cv = (C.clock = makeCanvas()), c = cv.getContext('2d'), rnd = seeded(19), col = P.night ? [214, 250, 240] : [255, 252, 244], tips = [];
    cv.width = cv.height = 64;
    puff(c, 32, 32, 32, col, P.night ? .3 : .22);
    c.strokeStyle = rgba(col, .8);
    c.lineWidth = 1;
    c.beginPath();
    for (let i = 0; i < 30; i++) {
      const a = (i / 30) * TAU + rnd() * .15, r = 22 + rnd() * 5;
      c.moveTo(32 + Math.cos(a) * 4, 32 + Math.sin(a) * 4);
      c.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
      tips.push([32 + Math.cos(a) * r, 32 + Math.sin(a) * r]);
    }
    c.stroke();
    c.fillStyle = rgba(col, .95);
    c.beginPath();
    for (const [x, y] of tips) ell(c, x, y, 1.8, 1.8, 0);
    c.fill();
    c.fillStyle = rgba(P.night ? [120, 170, 150] : [196, 176, 120]);
    c.beginPath();
    ell(c, 32, 32, 4.5, 4.5, 0);
    c.fill();
  }
  return C.clock;
}

// A dandelion folk is a seed clock on a stalk, with two leaves for arms and two thin legs. A new one grows as a stalk
// with a bud, opens into a clock, then pulls its legs out of the ground and stands up.
function drawFolk(c, C, K, P, t, H) {
  const k = Math.max(K.s, .7), img = clock(C, P), stem = P.night ? [60, 120, 104] : [74, 104, 64], leaf = P.night ? [70, 150, 126] : [96, 136, 74];
  const legs = new Path2D(), leaves = new Path2D(), heads = [];
  for (const f of C.folk) {
    if (f.wait > 0 || f.st === 'gone') continue;
    // A rider stands where its sheep was just drawn, so the two never come apart.
    if (f.st === 'ride' && f.sheep.seat) [f.x, f.y] = f.sheep.seat;
    const stalk = 9 * k * clamp(f.k / .5, 0, 1), open = ease((f.k - .4) / .4), stand = ease((f.k - .75) / .25), fly = (f.st === 'fly' && f.fu > 0) || f.st === 'drift' || f.st === 'ride';
    const hip = f.y - 6 * k * stand, tx = f.x + Math.sin(f.lean) * stalk, ty = hip - Math.cos(f.lean) * stalk;
    if (stand > 0) {
      for (const sd of [-1, 1]) {
        const sw = f.st === 'walk' ? Math.sin(f.ph + (sd > 0 ? 0 : Math.PI)) * 2.4 * k : fly ? Math.sin(t * 9 + f.ph + sd) * 1.5 * k : sd * 1.2 * k;
        legs.moveTo(f.x + sd * .8 * k, hip);
        legs.lineTo(f.x + sw, hip + 6 * k * stand);
      }
    }
    if (stalk > 0) {
      legs.moveTo(f.x, hip);
      legs.quadraticCurveTo(f.x, hip - stalk * .5, tx, ty);
    }
    if (stalk > 3 * k) {
      const ax = f.x + Math.sin(f.lean) * stalk * .45, ay = hip - stalk * .45, sw = Math.sin(t * 3 + f.ph) * .3 + (fly ? -.6 : 0);
      ell(leaves, ax - 2.2 * k, ay - .6 * k, 2.4 * k, .9 * k, -.5 + sw);
      ell(leaves, ax + 2.2 * k, ay - .6 * k, 2.4 * k, .9 * k, .5 - sw);
    }
    if (open < 1 && stalk > 0) ell(leaves, tx, ty - 1.5 * k, 1.6 * k * (1 - open), 2.4 * k * (1 - open), f.lean);
    heads.push([tx + Math.sin(f.lean) * 5 * k, ty - 5 * k * open, open, f]);
  }
  c.strokeStyle = rgba(stem);
  c.lineWidth = 1.1 * k;
  c.lineCap = 'round';
  c.stroke(legs);
  c.fillStyle = rgba(leaf);
  c.fill(leaves);
  if (P.night) {
    c.globalCompositeOperation = 'lighter';
    const gs = sprite(P.bio);
    for (const [x, y, o, f] of heads) if (o > 0) dab(c, gs, x, y, 12 * k, .22 * o, f.glow);
    c.globalCompositeOperation = 'source-over';
  }
  for (const [x, y, o, f] of heads) {
    if (o <= 0) continue;
    const w = 21 * k * o * (f.near ? 1 + .05 * Math.sin(t * 28) : 1);
    c.drawImage(img, x - w / 2, y - w / 2, w, w);
    H.push(['dandelions', x, y + 4 * k, 14 * k, D_ISLE]);
  }
  // Loose seeds, each a seed under a tiny parachute. Landed ones fade into the grass.
  if (C.seeds.length) {
    c.strokeStyle = rgba(P.night ? [214, 250, 240] : [255, 252, 244]);
    c.lineWidth = .6 * k;
    for (const sd of C.seeds) {
      const { x, y } = sd;
      c.globalAlpha = sd.land >= 0 ? 1 - sd.land / 1.5 : Math.min(1, (9 - sd.age) / 1.5);
      c.beginPath();
      c.moveTo(x, y + 3 * k);
      c.lineTo(x, y);
      for (const dx of [-2, 0, 2]) {
        c.moveTo(x, y);
        c.lineTo(x + dx * k, y - (dx ? 1.6 : 2.2) * k);
      }
      c.stroke();
    }
    c.globalAlpha = 1;
  }
}

// A snail's shell for the theme, painted once: a cream shell with a brown spiral at dusk, after dark a dark shell with
// a glowing one. 52 pixels square for a shell of radius 6.2.
const SHELL_R = 6.2, SHELL_Q = 4;
function snailShell(C, P) {
  if (C.shellP !== P) {
    C.shellP = P;
    const night = P.night, cv = makeCanvas(), c = cv.getContext('2d'), R = SHELL_R * SHELL_Q;
    cv.width = cv.height = Math.ceil(R * 2 + 4);
    c.translate(cv.width / 2, cv.height / 2);
    c.fillStyle = rgba(night ? [26, 58, 70] : [232, 206, 170]);
    c.beginPath();
    ell(c, 0, 0, R, R, 0);
    c.fill();
    if (night) c.globalCompositeOperation = 'lighter';
    c.strokeStyle = rgba(night ? P.bio : [150, 98, 72], night ? .9 : .85);
    c.lineWidth = .17 * R;
    c.lineCap = 'round';
    c.beginPath();
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * TAU * 2.2, r = (.12 + (.72 * i) / 40) * R;
      if (i) c.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      else c.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    c.stroke();
    C.shell = cv;
  }
  return C.shell;
}

// A snail's frame: where its foot meets the rock, the way along the rock it faces, and the way out from the rock, and
// where the middle of its shell is, which on a steep stretch hangs out to the side rather than below. One that has
// wandered up onto the turf goes the right way up.
const SNAIL = 1.5;
const ground = (n, K, x, k) => (n.top ? K.isle.topAt(x) + .2 * k : K.isle.underAt(x) - .5 * k);
function snailFrame(n, K, k) {
  const y = ground(n, K, n.x, k) - (n.top ? 0 : .3 * k), sl = (ground(n, K, n.x + 2, k) - ground(n, K, n.x - 2, k)) / 4, d = Math.hypot(1, sl);
  const tx = n.dir / d, ty = (n.dir * sl) / d, [nx, ny] = (n.dir > 0) === !n.top ? [-ty, tx] : [ty, -tx], S = k * SNAIL;
  return { y, tx, ty, nx, ny, sx: n.x + S * (7.5 * nx - 2 * tx), sy: y + S * (7.5 * ny - 2 * ty) };
}

// While the page was out of sight, one snail went exploring and turned up on top of the island, in the grass between
// the arch and the tree, where it carries on its race the right way up. True if one did.
export function wander(Lf, K) {
  const C = Lf.critters, n = C.snails.find(m => !m.top && m.st !== 'in');
  if (!n || C.snails.some(m => m.top)) return false;
  const a = K.isle.x0 + K.iw * .24, b = K.isle.x0 + K.iw * .4;
  Object.assign(n, { top: true, a, b, x: a + (b - a) * (.3 + C.rnd() * .4), tl: 0, st: 'out', hide: 0 });
  return true;
}

// The trails the snails leave on the rock, fading back along their way, and glowing after dark, though in lite mode
// without the haze. `top` is whether these are the ones on top of the island or the ones under it.
function drawTrails(c, C, K, P, t, k, lite, top) {
  const night = P.night, trail = night ? P.bio : [255, 236, 214];
  c.lineCap = 'round';
  if (night) c.globalCompositeOperation = 'lighter';
  for (const n of C.snails) {
    if (n.tl < 2 * k || !!n.top !== top) continue;
    const x0 = n.x - n.dir * n.tl, p = new Path2D(), steps = Math.max(2, Math.ceil(n.tl / (8 * k)));
    for (let i = 0; i <= steps; i++) {
      const x = x0 + ((n.x - x0) * i) / steps;
      if (i) p.lineTo(x, ground(n, K, x, k));
      else p.moveTo(x, ground(n, K, x, k));
    }
    const g = c.createLinearGradient(x0, 0, n.x, 0);
    g.addColorStop(0, rgba(trail, 0));
    g.addColorStop(1, rgba(trail, (night ? .55 : .35) * (.8 + .2 * Math.sin(t * 2.4 + n.ph))));
    c.strokeStyle = g;
    c.lineWidth = 1.3 * k;
    c.stroke(p);
    if (night && !lite) {
      c.globalAlpha = .25;
      c.lineWidth = 4.5 * k;
      c.stroke(p);
      c.globalAlpha = 1;
    }
  }
  c.globalCompositeOperation = 'source-over';
}

// Glow snails hang under the rock, so each is drawn the right way up on a frame turned to the slope and flipped to hang
// beneath it. After dark their trails, shells and feeler tips glow. The ones under the island are drawn behind it, and
// one up on top in front of its grass, so `top` says which.
function drawSnails(c, C, K, P, t, H, lite, top) {
  const k = Math.max(K.s, .7), night = P.night;
  drawTrails(c, C, K, P, t, k, lite, top);
  const body = night ? [110, 176, 172] : [176, 160, 178], shell = snailShell(C, P), sw = shell.width / SHELL_Q, gs = sprite(P.bio);
  for (const n of C.snails) {
    if (!!n.top !== top) continue;
    const { y, tx, ty, nx, ny, sx, sy } = snailFrame(n, K, k), b = 1 - n.hide, f = clamp(1 - n.hide * 2.5, 0, 1);
    c.save();
    c.transform(tx, ty, -nx, -ny, n.x, y);
    c.scale(k * SNAIL, k * SNAIL);
    // The foot runs along the rock with the head raised at the front, and slides back into the shell to hide.
    if (b > .05) {
      c.fillStyle = rgba(body, .95);
      c.beginPath();
      c.moveTo(-10 * b, 0);
      c.quadraticCurveTo(-4 * b, -3.2, 4 * b, -3);
      c.quadraticCurveTo(8.5 * b, -3.4, 9.6 * b, -5.2);
      c.quadraticCurveTo(11.2 * b, -2.6, 9 * b, 0);
      c.closePath();
      c.fill();
    }
    // Two eyestalks, out first and in last, waving while it is looked at.
    const tips = [];
    if (f > 0) {
      c.strokeStyle = rgba(body);
      c.lineWidth = .8;
      c.beginPath();
      for (const i of [0, 1]) {
        const a = -1.05 - i * .4 + Math.sin(t * (n.near ? 7 : 2) + n.ph + i) * (n.near ? .4 : .12), x = 9.6 * b - i * 1.2;
        const ex = x + Math.cos(a) * 5.5 * f, ey = -4.6 + Math.sin(a) * 5.5 * f;
        c.moveTo(x, -4.6);
        c.lineTo(ex, ey);
        tips.push([ex, ey]);
      }
      c.stroke();
      c.fillStyle = rgba(night ? P.bio : body);
      c.beginPath();
      for (const [x, y2] of tips) ell(c, x, y2, .95, .95, 0);
      c.fill();
    }
    c.drawImage(shell, -2 - sw / 2, -7.5 - sw / 2, sw, sw);
    if (night) {
      c.globalCompositeOperation = 'lighter';
      for (const [x, y2] of tips) dab(c, gs, x, y2, 2.2, .45);
      dab(c, gs, -2, -7.5, 9, .1);
      c.globalCompositeOperation = 'source-over';
    }
    c.restore();
    H.push(['snails', sx, sy, 14 * k, D_ISLE]);
  }
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
