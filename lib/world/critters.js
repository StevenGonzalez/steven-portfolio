// The island's small creatures. Leaf fish fall from the tree like any other leaf until they change their mind and swim
// back up. Cloud sheep graze on the cloud sea, lantern moths keep to the lanterns in the tree, dandelion folk walk the
// turf until a breeze takes them, and glow snails creep along the underside of the island, upside down. They get in
// each other's way: a breeze off the end of the island can land a dandelion on a sheep's back, which ends with the sheep
// sneezing it out as seeds; moths call on the firefly jar after dark; the snails hide from the whale; and a koi jumping
// near the sheep makes them jump too.

import { TAU, clamp, dab, ell, lerp, makeCanvas, mixc, puff, rgba, seeded, sprite } from './core';
import { D_ISLE, pulseAt } from './life';
import { pastureTones } from './scene';
import { turnTo } from './whimsy';
import { ease } from './story';

// How long a clicked sheep floats, in seconds.
const FLOAT = 6;

// `night` sets everyone's starting pose, which is all a world held still for reduced motion ever shows.
export function makeCritters(K, night) {
  const rnd = seeded(71), { phone, s, iw, isle, tree: T } = K, k = Math.max(s, .7);
  // The sheep graze a cloud of their own beside the island, or under it on a phone. At night they sleep in a heap in
  // the middle of their pasture, one on top.
  const { a: ha, b: hb } = K.pasture, n = phone ? 3 : 4;
  const heap = (n === 4 ? [[-13, 0], [0, 0], [13, 0], [-6, -9]] : [[-7, 0], [7, 0], [0, -9]]).map(([dx, dy]) => [(ha + hb) / 2 + dx * k, dy * k]);
  const sheep = heap.map((slot, i) => {
    const x = night ? slot[0] : ha + ((hb - ha) * (i + .3 + rnd() * .4)) / n;
    return {
      x, tx: x, slot, dir: rnd() < .5 ? -1 : 1, st: 'graze', next: 2 + rnd() * 6, ph: rnd() * TAU, head: 0, look: 0, bite: 0, biteIn: rnd() * 2,
      hop: 0, fl: -1, x0: x, fdir: 1, up: 0, puff: 0, sleep: night ? 1 : 0, a: 1, wait: 0, voice: .9 + rnd() * .2, e: { hit: 0 },
    };
  });
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
    sheep, ha, hb, grey: 0, drizzle: 0, moths, glitter: [], folk, fa, fb, gust: 14 + rnd() * 10, seeds: [], snails,
    // The pasture is off the island's end only on a wider screen, so only there can a breeze carry anyone to it.
    ride: !phone, rnd,
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

// Cloud sheep wander their pasture and graze, taking bites out of the cloud they stand on. Pointed at, one looks up at
// the pointer. Clicked, it puffs up, bleats and floats off, then drifts back down where it was, and the others nearby
// jump, as they do when a koi jumps close by. At night, and whenever the world dozes off, they walk to the heap and
// sleep, and waking from a doze they get up with a stretch, one after another. A storm turns them grey, and while it
// rains they rise a little and rain too.
function updateSheep(C, Lf, K, dt, pi, pulses, night) {
  const { rnd } = C, k = Math.max(K.s, .7), S = Lf.play.storm, bed = night || Lf.doze > .5;
  C.grey = S ? S.power : 0;
  C.drizzle = S ? S.rain : 0;
  if (C.bed && !bed) C.sheep.forEach((o, i) => o.fl < 0 && (o.hop = 1.3 + i * .35));
  C.bed = bed;
  // A koi jumping out of the cloud close by makes the ones awake near it jump.
  for (const f of Lf.kois) {
    if (f.shy) continue;
    f.shy = true;
    for (const o of C.sheep) if (o.fl < 0 && !o.sleep && Math.abs(o.x - f.x0) < 70 * k) o.hop = 1.05 + rnd() * .3;
  }
  for (const o of C.sheep) {
    if (o.wait > 0) {
      o.wait -= dt;
      continue;
    }
    o.a = Math.min(1, o.a + dt / 1.5);
    o.hop = Math.max(0, o.hop - dt / .5);
    o.bite = Math.max(0, o.bite - dt / .7);
    const cy = K.HZ - 20 * k + o.slot[1] * o.sleep - o.up;
    const near = pi && Math.hypot(pi.x - o.x, pi.y - cy) < 26 * k;
    const hit = pulseAt(pulses, D_ISLE, o.x, cy, o.e);
    if (hit && hit[2] < 22 * k && o.fl < 0) {
      Object.assign(o, { fl: 0, x0: o.x, fdir: rnd() < .5 ? -1 : 1 });
      Lf.sfx.push(['baa', o.x, o.voice]);
      // Values over 1 wait before they jump, so the others don't all jump at once. The same click can't send them up too.
      for (const b of C.sheep) {
        if (b === o || b.fl >= 0 || Math.abs(b.x - o.x) >= 120 * k) continue;
        b.hop = 1.1 + rnd() * .35;
        b.e.hit = o.e.hit;
      }
    }
    if (o.fl >= 0) {
      // Puffs up, rises, hangs there, and comes back down where it was, letting the air out on the way.
      const u = (o.fl += dt) / FLOAT;
      o.puff = Math.min(1, o.fl / .35, (1 - u) / .35);
      o.up = 80 * k * ease(Math.min(u, 1 - u) / .3);
      o.x = o.x0 + Math.sin(Math.PI * Math.min(u, 1)) * 36 * k * o.fdir;
      o.head = Math.min(1, o.head + dt * 4);
      if (u >= 1) Object.assign(o, { fl: -1, up: 0, puff: 0, x: o.x0, st: 'graze', next: 1 + rnd() * 3 });
      continue;
    }
    if (bed || o.sleep > 0) {
      // Bedtime: off to its place in the heap, then down. At dawn it gets up again. Pointed at, it lifts its head, sleepily.
      if (bed && Math.abs(o.slot[0] - o.x) > .5 && o.sleep === 0) {
        walk(o, o.slot[0], 10 * k, dt);
        o.head += (.6 - o.head) * Math.min(1, dt * 3);
        continue;
      }
      o.sleep = bed ? Math.min(1, o.sleep + dt / 1.5) : Math.max(0, o.sleep - dt / 1.2);
      o.head += ((near ? .7 : 0) - o.head) * Math.min(1, dt * 3);
      if (!o.sleep) Object.assign(o, { st: 'graze', next: 1 + rnd() * 3 });
      continue;
    }
    if (near) {
      o.dir = pi.x > o.x ? 1 : -1;
      o.look = 1.2;
    }
    o.look -= dt;
    if (o.st === 'walk' && !near) {
      if (walk(o, o.tx, 6 * k, dt)) Object.assign(o, { st: 'graze', next: 4 + rnd() * 7 });
    } else if (o.st === 'graze') {
      if ((o.biteIn -= dt) < 0) {
        o.bite = 1;
        o.biteIn = 1.6 + rnd() * 2.2;
      }
      if ((o.next -= dt) < 0) {
        // Somewhere new to graze, not on top of anyone.
        for (let i = 0; i < 4; i++) {
          o.tx = clamp(o.x + (rnd() - .5) * 140 * k, C.ha, C.hb);
          if (C.sheep.every(b => b === o || Math.abs(b.x - o.tx) > 18 * k)) break;
        }
        o.st = 'walk';
      }
    }
    o.head += ((o.look > 0 ? 1 : o.st === 'walk' ? .6 : 0) - o.head) * Math.min(1, dt * 3);
  }
}

// Walks a sheep toward x; true once it is there.
function walk(o, x, sp, dt) {
  const d = x - o.x;
  o.dir = Math.sign(d) || o.dir;
  o.x += Math.sign(d) * Math.min(Math.abs(d), sp * dt);
  o.ph += dt * 7;
  return Math.abs(d) < .5;
}

// Lantern moths circle the lanterns, sometimes moving to another, sometimes sitting on one, and a lantern that rings
// sends its sitter off. After dark, with fireflies in the jar, they take turns calling on it. Pointed at, they take the
// pointer for a lamp and circle that instead. Clicked, they scatter in a shower of glitter and the lanterns nearby
// flicker.
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
    const l = m.home < 0 ? jar : L[m.home];
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
// A breeze toward the pasture may carry the one in front right off the end of the island. It floats down under its
// head like a parachute onto a sheep's back and rides about on it for a while, napping if the sheep sleeps. Then it
// hops down in front of the sheep, which has a good look at it, breathes it in and sneezes it out as seeds.
function updateFolk(C, Lf, K, dt, pi, pulses) {
  const { rnd, fa, fb } = C, { isle } = K, k = Math.max(K.s, .7), t = Lf.t, nod = Lf.doze;
  // No breezes while the world dozes.
  if (!nod && (C.gust -= dt) < 0) {
    const on = C.folk.filter(f => f.wait <= 0 && (f.st === 'idle' || f.st === 'walk'));
    const lo = Math.min(...on.map(f => f.x)), hi = Math.max(...on.map(f => f.x)), dir = fb - hi > lo - fa ? 1 : -1;
    const dist = Math.min(dir > 0 ? fb - hi : lo - fa, (90 + rnd() * 90) * k);
    C.gust = 5;
    if (on.length > 1 && dist > 30 * k) {
      C.gust = 22 + rnd() * 16;
      // The one at the front goes first, and each of the others a moment after the one ahead of it.
      on.sort((a, b) => (b.x - a.x) * dir).forEach((f, i) => Object.assign(f, { st: 'fly', fx: f.x, fd: dist * dir, fu: -i * .45, fdur: 2.4 + dist / (26 * k), fh: (38 + rnd() * 22) * k }));
      const awake = C.sheep.filter(o => o.fl < 0 && !o.sleep && o.wait <= 0 && !C.bed);
      if (C.ride && dir < 0 && awake.length && rnd() < .7 && !C.folk.some(f => f.sheep)) {
        Object.assign(on[0], { st: 'drift', sheep: awake[Math.floor(rnd() * awake.length)], fx: on[0].x, fy: on[0].y, fu: 0, fdur: 8 + rnd() * 2 });
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
      if (hit && hit[2] < 18 * k) {
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
      // Lifted at first, then down a long slow slope, swaying, to wherever its sheep has got to.
      const o = f.sheep, u = Math.min(1, (f.fu += dt) / f.fdur), [sx, sy] = o.seat || [o.x, K.HZ - 30 * k], arc = Math.sin(Math.PI * u);
      f.x = lerp(f.fx, sx, ease(u)) + Math.sin(t * 1.1 + f.ph) * 10 * k * arc;
      f.y = lerp(f.fy, sy, ease(u)) - Math.sin(Math.PI * Math.sqrt(u)) * 45 * k;
      f.lean = Math.sin(t * 1.7 + f.ph) * .22 * arc - .1 * arc;
      if (u >= 1) Object.assign(f, { st: 'ride', fu: 0, fdur: 10 + rnd() * 6 });
    } else if (f.st === 'ride') {
      // Rocking along as the sheep walks, and nodding off on it when it sleeps, which stops the clock.
      const o = f.sheep, walking = o.st === 'walk' && o.fl < 0 && !o.sleep;
      if (o.seat) [f.x, f.y] = o.seat;
      f.lean += ((walking ? -o.dir * .16 + Math.sin(o.ph) * .12 : o.sleep ? (Math.sin(f.ph) > 0 ? .4 : -.4) * o.sleep : 0) - f.lean) * Math.min(1, dt * 4);
      if (!o.sleep && !C.bed && o.fl < 0 && (f.fu += dt) > f.fdur) Object.assign(f, { st: 'hop', fu: 0, fx: f.x, fy: f.y, tx: o.x + o.dir * 22 * k });
    } else if (f.st === 'hop' || f.st === 'snack') {
      const o = f.sheep, d = Math.sign(f.tx - o.x) || 1, u = (f.fu += dt);
      // The sheep stops to see what this is. If it floats off or goes to bed instead, the dandelion goes POOF in fright.
      if (o.fl >= 0 || C.bed) {
        o.puff = 0;
        poof(C, Lf, f, k);
        continue;
      }
      Object.assign(o, { st: 'graze', next: Math.max(o.next, 1), dir: d, look: .5 });
      if (f.st === 'hop') {
        const e = Math.min(1, u / .6);
        f.x = lerp(f.fx, f.tx, e);
        f.y = lerp(f.fy, K.HZ - 7 * k, e) - Math.sin(Math.PI * e) * 12 * k;
        f.lean = d * .3 * Math.sin(Math.PI * e);
        if (e === 1) Object.assign(f, { st: 'snack', fu: 0 });
      } else {
        // A long look, a breath in that swells the sheep up, and at the top of it the sneeze, timed to the sound.
        f.lean += (-d * .25 - f.lean) * Math.min(1, dt * 3);
        if (u > 1.1 && !f.sniff) {
          f.sniff = true;
          Lf.sfx.push(['sneeze', o.x, o.voice]);
        }
        o.puff = u > 1.1 ? .3 * ease((u - 1.1) / .55) : 0;
        if (u > 1.65) {
          Object.assign(o, { puff: 0, hop: .99, head: 1 });
          poof(C, Lf, f, k, o);
        }
      }
    } else {
      // Dozing, each nods off to one side, breathing.
      f.near = !!pi && Math.hypot(pi.x - f.x, pi.y - (f.y - 16 * k)) < 24 * k;
      const droop = nod * (Math.sin(f.ph) > 0 ? .32 : -.32) * (1 + .15 * Math.sin(t * 1.3 + f.ph));
      f.lean += ((f.near ? (pi.x > f.x ? .3 : -.3) : droop) - f.lean) * Math.min(1, dt * 5);
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
      // Each seed hangs from its own little parachute, so it drifts down slowly on the breeze.
      sd.vx += (8 * k - sd.vx) * dt * .8;
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

// A folk bursting into seeds. Sneezed out by sheep `o`, the seeds spray from its nose the way it faces, and the sneeze
// is the only sound.
function poof(C, Lf, f, k, o) {
  const { rnd } = C;
  for (let i = 0; i < (o ? 14 : 12); i++) {
    const a = o ? (o.dir > 0 ? 0 : Math.PI) - o.dir * (.25 + (rnd() - .5) * 1.1) : rnd() * TAU, v = o ? (40 + rnd() * 60) * k : (12 + rnd() * 30) * k;
    const [x, y] = o ? [o.x + o.dir * 17 * k, o.seat[1] + 8 * k] : [f.x + Math.cos(a) * 5 * k, f.y - 20 * k + Math.sin(a) * 5 * k];
    C.seeds.push({ x, y, vx: Math.cos(a) * v + 10 * k, vy: Math.sin(a) * v - (o ? 8 : 22) * k, ph: rnd() * TAU, age: 0, land: -1, f });
  }
  Object.assign(f, { st: 'gone', regrow: 8, k: 0, lean: 0, sheep: null, sniff: false });
  if (o) return;
  Lf.sfx.push(['poof', f.x]);
  // One click, one puff: a neighbour standing close by is left alone.
  for (const n of C.folk) if (Math.abs(n.x - f.x) < 40 * k) n.e.hit = f.e.hit;
}

// Glow snails creep along their stretch of the underside, leaving a trail, and at either end pull in, turn round inside
// their shells and come back out the other way. Pointed at, one stops and waves its feelers. Clicked, it pulls in, and
// after a moment peeks back out. The great whale going by below sends them in too, quietly, until it has passed.
function updateSnails(C, Lf, K, dt, pi, pulses) {
  const k = Math.max(K.s, .7), W = Lf.whales.find(w => w.near && w.wait <= 0), wx = W ? W.x - W.dir * W.L * .4 : 0;
  for (const n of C.snails) {
    const { tx, sx, sy } = snailFrame(n, K, k), hit = pulseAt(pulses, D_ISLE, sx, sy, n.e);
    if (hit && hit[2] < 18 * k && n.st !== 'in') {
      Object.assign(n, { st: 'in', hold: 2.5, poke: true });
      Lf.sfx.push(['shloop', n.x]);
    }
    n.near = !!pi && Math.hypot(pi.x - sx, pi.y - sy) < 24 * k;
    // A dozing world sends them into their shells, quietly, until it wakes.
    const shy = Lf.doze > .5 || (W && Math.abs(n.x - wx) < W.L * .55);
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
  drawSnails(c, Lf.critters, K, P, t, Lf.hits, Lf.lite);
}

export function drawCritters(c, Lf, K, P, t) {
  const C = Lf.critters, H = Lf.hits, s = K.s;
  drawSheep(c, C, K, P, t, H);
  drawFolk(c, C, K, P, t, H);
  for (const f of C.fish) if (f.st !== 'hide') drawLeafFish(c, f, s, P, t, H);
  drawMoths(c, C, K, P, t, H, Lf.lite);
}

// Two fleeces for the theme, fair and storm grey, painted once and kept until the theme changes. Fair is the pasture's
// own cloud, a touch brighter, so a sheep looks like a bit of it that got up and walked.
function fleeces(C, K, P) {
  if (C.fleeceP !== P) {
    C.fleeceP = P;
    const { dark, lit: top } = pastureTones(K, P), lit = mixc(top, P.light, .3), shade = mixc(dark, top, .55), grey = P.night ? [44, 56, 70] : [104, 112, 122];
    C.wool = lit;
    C.fleeces = [fleece(lit, shade), fleece(mixc(lit, grey, .75), mixc(shade, grey, .8))];
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

// A sheep is a fleece on four dark legs with a dark head and a curl of wool on top. No face.
function drawSheep(c, C, K, P, t, H) {
  const k = Math.max(K.s, .7), [white, grey] = fleeces(C, K, P), dark = mixc(P.night ? [22, 30, 40] : [56, 48, 52], P.haze, .3), lift = 10 * k * C.drizzle;
  const rain = new Path2D();
  for (const o of C.sheep) {
    if (o.wait > 0) continue;
    const sl = o.sleep, hop = o.hop < 1 ? Math.sin(Math.PI * o.hop) * 7 * k : 0, walking = o.st === 'walk' && o.fl < 0 && !sl;
    const fy = K.HZ - 5 * k - o.up - lift - hop + o.slot[1] * sl + (1 - ease(o.a)) * 14 * k;
    const sc = (1 + .35 * ease(o.puff)) * (1 + .03 * Math.sin(t * 1.7 + o.ph) * (sl || .4));
    const cy = fy - (15 - 6 * sl) * k - (walking ? Math.abs(Math.sin(o.ph)) * k : 0);
    c.globalAlpha = o.a;
    // Legs, hidden once it lies down. Walking they step in pairs; floating they paddle at the air.
    if (sl < .8) {
      c.strokeStyle = rgba(dark);
      c.lineWidth = 2.1 * k;
      c.lineCap = 'round';
      c.beginPath();
      const L = fy - cy - 5 * k;
      [-8, -4, 5, 9].forEach((lx, i) => {
        const sw = walking ? Math.sin(o.ph + (i % 2) * Math.PI) * .4 : o.fl >= 0 ? Math.sin(t * 5 + i * 1.7) * .3 : 0;
        c.moveTo(o.x + lx * k * o.dir, cy + 5 * k);
        c.lineTo(o.x + (lx * k + Math.sin(sw) * L) * o.dir, cy + 5 * k + Math.cos(sw) * L);
      });
      c.stroke();
    }
    // The fleece isn't turned with the sheep, so its light stays on the side the light is.
    const w = 37 * k * sc, h = w * .75;
    c.drawImage(white, o.x - w / 2, cy - h / 2, w, h);
    if (C.grey > .02) {
      c.globalAlpha = o.a * C.grey;
      c.drawImage(grey, o.x - w / 2, cy - h / 2, w, h);
      c.globalAlpha = o.a;
    }
    // The head: up to look, down to graze, tucked in to sleep. Grazing, now and then it takes a bite of cloud.
    const hu = o.head * (1 - sl), [hx, hy, rot] = [lerp(lerp(15, 13, hu), 11, sl), lerp(lerp(10, -4, hu), 7, sl), lerp(lerp(1.1, -.3, hu), .5, sl)];
    c.save();
    c.translate(o.x, cy);
    c.scale(o.dir * sc * k, sc * k);
    c.translate(hx, hy);
    c.rotate(rot);
    c.fillStyle = rgba(dark);
    c.beginPath();
    ell(c, 0, 0, 4.4, 3, 0);
    ell(c, -2, -2.6, 2.3, .9, -.5);
    c.fill();
    c.fillStyle = rgba(C.wool, .95);
    c.beginPath();
    ell(c, -1.4, -2.6, 2.2, 1.8, 0);
    if (o.bite > 0 && hu < .3) ell(c, 5.2, 1.6, 2.6 * o.bite, 2 * o.bite, 0);
    c.fill();
    c.restore();
    // Asleep, it breathes out a little puff of cloud now and then, which drifts up and fades.
    if (sl > .6) {
      const u = (t * .22 + o.ph / TAU) % 1;
      dab(c, sprite(C.wool), o.x + (7 * o.dir + Math.sin(u * 5) * 2) * k, cy - (6 + u * 26) * k, (2 + 4 * u) * k, (.5 * Math.sin(Math.PI * u) * (sl - .6)) / .4);
    }
    if (C.drizzle > .05) {
      for (let j = 0; j < 3; j++) {
        const x = o.x + (j - 1) * 7 * k, y0 = cy + 9 * k * sc, u = (t * 1.6 + j * .37 + o.ph) % 1, y = y0 + u * (K.HZ - y0);
        rain.moveTo(x, y);
        rain.lineTo(x - .5 * k, y + 3 * k);
      }
    }
    // Where a dandelion riding it stands, on top of the fleece a little behind the middle.
    o.seat = [o.x - 3 * k * o.dir * sc, cy - 9 * k * sc];
    H.push(['sheep', o.x, cy, 20 * k * sc, D_ISLE]);
  }
  c.globalAlpha = 1;
  if (C.drizzle > .05) {
    c.strokeStyle = rgba(P.water, .55 * C.drizzle);
    c.lineWidth = .8 * k;
    c.stroke(rain);
  }
  // On a phone the pasture lies low in the haze, where a sheep without its dark legs would vanish, so there they stand
  // on top of it instead.
  const { a, b, y } = K.pasture, x0 = a - 24 * k, w = b - a + 48 * k;
  if (!K.phone) c.drawImage(lip(C, K, P), x0, y - 13 * k, w, 22 * k);
}

// The front edge of the pasture, drawn over the sheep's feet so they stand in the cloud rather than on it. Painted once
// for the theme at the most the layer is ever drawn at, 1.25 pixels to the unit.
function lip(C, K, P) {
  if (C.lipP !== P) {
    C.lipP = P;
    const { a, b } = K.pasture, k = Math.max(K.s, .7), q = 1.25 * K.U, w = b - a + 48 * k, { dark, lit } = pastureTones(K, P), col = mixc(lit, dark, .15), rnd = seeded(47);
    const cv = (C.lip = makeCanvas()), c = cv.getContext('2d');
    cv.width = Math.ceil(w * q);
    cv.height = Math.ceil(22 * k * q);
    c.scale(cv.width / w, cv.height / (22 * k));
    for (let x = 4 * k; x < w - 4 * k; x += (4 + rnd() * 3) * k) {
      const hump = Math.sin((Math.PI * x) / w);
      puff(c, x, 12 * k + (rnd() - .5) * 2 * k, (3 + 6 * hump) * k * (.85 + rnd() * .3), col, .8);
    }
  }
  return C.lip;
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
// where the middle of its shell is, which on a steep stretch hangs out to the side rather than below.
const SNAIL = 1.5;
function snailFrame(n, K, k) {
  const { isle } = K, y = isle.underAt(n.x) - .8 * k, sl = (isle.underAt(n.x + 2) - isle.underAt(n.x - 2)) / 4, d = Math.hypot(1, sl);
  const tx = n.dir / d, ty = (n.dir * sl) / d, [nx, ny] = n.dir > 0 ? [-ty, tx] : [ty, -tx], S = k * SNAIL;
  return { y, tx, ty, nx, ny, sx: n.x + S * (7.5 * nx - 2 * tx), sy: y + S * (7.5 * ny - 2 * ty) };
}

// The trails the snails leave on the rock, fading back along their way, and glowing after dark, though in lite mode
// without the haze.
function drawTrails(c, C, K, P, t, k, lite) {
  const { isle } = K, night = P.night, trail = night ? P.bio : [255, 236, 214];
  c.lineCap = 'round';
  if (night) c.globalCompositeOperation = 'lighter';
  for (const n of C.snails) {
    if (n.tl < 2 * k) continue;
    const x0 = n.x - n.dir * n.tl, p = new Path2D(), steps = Math.max(2, Math.ceil(n.tl / (8 * k)));
    for (let i = 0; i <= steps; i++) {
      const x = x0 + ((n.x - x0) * i) / steps;
      if (i) p.lineTo(x, isle.underAt(x) - .5 * k);
      else p.moveTo(x, isle.underAt(x) - .5 * k);
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
// beneath it. After dark their trails, shells and feeler tips glow.
function drawSnails(c, C, K, P, t, H, lite) {
  const k = Math.max(K.s, .7), night = P.night;
  drawTrails(c, C, K, P, t, k, lite);
  const body = night ? [110, 176, 172] : [176, 160, 178], shell = snailShell(C, P), sw = shell.width / SHELL_Q, gs = sprite(P.bio);
  for (const n of C.snails) {
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
