// Things to play with on the island. The lanterns in the tree ring like wind chimes when the pointer sweeps across
// them. Pressing and holding on the sky brews a little storm there, which follows the pointer, rains on the island,
// opens flowers where the rain lands and, held long enough, thunders. And after dark fireflies come out over the turf:
// a click catches one, and it lives in the jar from then on, on later visits too.

import { TAU, clamp, dab, ell, mixc, rgba, seeded, sprite } from './core';
import { D_ISLE } from './life';
import { PUMPKIN } from './scene';
import { ease } from './story';

// How long a press has to stay put, in seconds, before it brews a storm, and how far it may wander, in scene units.
const HOLD = .45, STILL = 14;
// How many fireflies the jar holds.
const JAR_MAX = 20;
const FLY = [206, 255, 110], FLY_CORE = [250, 255, 214];
// The storm cloud's lobes, as [x, y, radius] in shares of its width.
const LOBES = [[-.36, .05, .25], [-.18, -.07, .31], [.04, -.12, .33], [.25, -.05, .3], [.4, .06, .22], [-.1, .1, .3], [.17, .1, .28]];

export function makePlay(K, jar = 0) {
  const rnd = seeded(83), { s, isle } = K;
  // The jar sits in the widest gap between the lumen bells from the trunk to the armillary, so no bell grows out of it.
  const xs = [K.tree.cx + 52 * s, ...K.bells.map(b => b.x).filter(x => x > K.tree.cx + 52 * s && x < K.arm.x - 36 * s), K.arm.x - 36 * s].sort((a, b) => a - b);
  let jx = xs[0], gap = 0;
  for (let i = 1; i < xs.length; i++) if (xs[i] - xs[i - 1] > gap) [gap, jx] = [xs[i] - xs[i - 1], (xs[i] + xs[i - 1]) / 2];
  return {
    rnd, press: null, storm: null, blooms: [], dirty: false,
    jar: {
      x: jx, y: isle.topAt(jx) + 2 * s, n: clamp(jar | 0, 0, JAR_MAX), glow: 0,
      spots: Array.from({ length: JAR_MAX }, () => [(rnd() - .5) * 6, -2 - rnd() * 8, rnd() * TAU]),
    },
    flies: Array.from({ length: K.phone ? 6 : 10 }, () => fly(K, rnd, 0)),
  };
}

// A firefly with a home somewhere over the turf, out after `wait` seconds.
function fly(K, rnd, wait) {
  const { s, isle, iw } = K, x = isle.x0 + iw * (.1 + rnd() * .8);
  return { hx: x, hy: isle.topAt(x) - (14 + rnd() * 80) * s, x, y: 0, ph: rnd() * TAU, wait, k: -1, fx: 0, fy: 0 };
}

// The pointer pressed, moved while pressed, and let go, all in island-layer units. `px` and `py` are where the press
// was on the page.
export function press(Lf, x, y, px, py) {
  Lf.play.press = { x, y, px, py, t: Lf.t, moved: 0, storm: false };
}
export function drag(Lf, K, x, y) {
  const pr = Lf.play.press;
  if (!pr) return;
  sweep(Lf, K, pr.x, pr.y, x, y);
  pr.moved += Math.hypot(x - pr.x, y - pr.y);
  pr.x = x;
  pr.y = y;
}
// Returns the press that ended, so a short one can be taken as a click.
export function release(Lf) {
  const pr = Lf.play.press;
  Lf.play.press = null;
  if (Lf.play.storm) Lf.play.storm.held = false;
  return pr;
}

// Rings every lantern on the line from (x0, y0) to (x1, y1): the path of a swipe, or the point of a click.
export function sweep(Lf, K, x0, y0, x1, y1) {
  const r = 9 * K.s, dx = x1 - x0, dy = y1 - y0, len = dx * dx + dy * dy;
  for (const l of K.tree.lanterns) {
    if (l.ring > .6) continue;
    const u = len ? clamp(((l.x - x0) * dx + (l.y - y0) * dy) / len, 0, 1) : 0;
    if (Math.hypot(x0 + dx * u - l.x, y0 + dy * u - l.y) > r) continue;
    l.ring = 1;
    Lf.sfx.push(['lantern', l.x, l.step]);
  }
}

// A click near a firefly catches it.
export function catchAt(Lf, K, x, y) {
  let best = null, bd = 26 * Math.max(K.s, .7);
  for (const f of Lf.play.flies) {
    const d = Math.hypot(f.x - x, f.y - y);
    if (f.k < 0 && f.wait <= 0 && d < bd) {
      best = f;
      bd = d;
    }
  }
  if (!best) return;
  best.k = 0;
  best.fx = best.x;
  best.fy = best.y;
}

export function updatePlay(Lf, K, dt) {
  const Pl = Lf.play, t = Lf.t, { s } = K, J = Pl.jar;
  for (const l of K.tree.lanterns) {
    if (l.ring > 0) l.ring = Math.max(0, l.ring - dt / 1.6);
    // Lighting up again as the world wakes, without a sound of their own: the waking has one.
    if (l.wake > 0 && (l.wake -= dt) <= 0) l.ring = Math.max(l.ring, .75);
  }
  updateStorm(Lf, K, dt);
  for (const b of Pl.blooms) if (b.k < 1) b.k = Math.min(1, b.k + dt / 1.4);
  J.glow = Math.max(0, J.glow - dt / 1.2);
  for (const f of Pl.flies) {
    if (f.k >= 0) {
      if ((f.k += dt / .9) < 1) continue;
      Object.assign(f, fly(K, Pl.rnd, 5 + Pl.rnd() * 6));
      if (J.n < JAR_MAX) {
        J.n++;
        Pl.dirty = true;
      }
      J.glow = 1;
      Lf.sfx.push(['caught', J.x]);
      continue;
    }
    if (f.wait > 0) {
      f.wait -= dt;
      continue;
    }
    f.x = f.hx + Math.sin(t * .37 + f.ph) * 34 * s + Math.sin(t * .83 + f.ph * 2) * 12 * s;
    f.y = f.hy + Math.cos(t * .29 + f.ph) * 16 * s + Math.sin(t * 1.1 + f.ph) * 5 * s;
  }
}

const cloudW = (S, K) => (150 + 70 * ease(S.power)) * Math.max(K.s, .7);

function updateStorm(Lf, K, dt) {
  const Pl = Lf.play, pr = Pl.press, rnd = Pl.rnd, { s, isle } = K, ss = Math.max(s, .7);
  // The cloud keeps to the sky above the island, however low the press.
  const sky = y => clamp(y, 150, K.top - 170 * s);
  if (pr && !pr.storm && !pr.kite && !pr.stars && !pr.toast && Lf.t - pr.t > HOLD && pr.moved < STILL && pr.y < K.HZ - 40) {
    pr.storm = true;
    Pl.storm ||= { x: pr.x, y: sky(pr.y), power: 0, rain: 0, acc: 0, drops: [], bolt: null, flash: 0, sent: 0, sentAt: 0 };
    Object.assign(Pl.storm, { held: true, heldFor: 0, next: 2.8 });
  }
  const S = Pl.storm;
  if (!S) return;
  if (S.held && pr) {
    S.x += (pr.x - S.x) * Math.min(1, dt * 3);
    S.y += (sky(pr.y) - S.y) * Math.min(1, dt * 3);
  }
  S.power = S.held ? Math.min(1, S.power + dt / 1.4) : Math.max(0, S.power - dt / 3.5);
  S.rain = S.held && S.power > .5 ? Math.min(1, S.rain + dt / .8) : Math.max(0, S.rain - dt / 1.4);
  // Held long enough, it thunders, and goes on thundering every few seconds.
  if (S.held && (S.heldFor += dt) > S.next) {
    S.next = S.heldFor + 4 + rnd() * 3;
    S.bolt = bolt(S, K, rnd);
    S.flash = 1;
    Lf.sfx.push(['thunder', S.x]);
  }
  S.flash = Math.max(0, S.flash - dt * 3);
  if (S.bolt && (S.bolt.age += dt) > .45) S.bolt = null;
  // Raindrops fall from under the cloud to the turf, or on into the clouds below.
  const w = cloudW(S, K);
  for (S.acc += S.rain * 190 * dt; S.acc >= 1; S.acc--) S.drops.push({ x: S.x + (rnd() - .5) * w * .8, y: S.y + 12 * ss, v: 520 + rnd() * 160 });
  for (const d of S.drops) {
    d.y += d.v * dt;
    d.x -= d.v * .08 * dt;
    const over = d.x > isle.x0 && d.x < isle.x0 + K.iw, ground = over ? isle.topAt(d.x) : K.HZ + 10;
    if (d.y < ground) continue;
    d.dead = true;
    if (over) water(Lf, K, d.x, ground);
  }
  S.drops = S.drops.filter(d => !d.dead);
  // The sound of the rain follows its level, told when it changes and once a second while it rains, so sound turned on
  // mid-storm picks the rain up.
  if (Math.abs(S.rain - S.sent) > .15 || (S.rain === 0 && S.sent > 0) || (S.rain > 0 && Lf.t - S.sentAt > 1)) {
    S.sent = S.rain;
    S.sentAt = Lf.t;
    Lf.sfx.push(['rain', S.x, S.rain]);
  }
  if (!S.held && S.power <= 0 && !S.drops.length && !S.bolt) Pl.storm = null;
}

// Rain landing on the turf opens the shy bells nearby, and now and then a flower, which stays open.
function water(Lf, K, x, y) {
  const Pl = Lf.play, { s } = K, rnd = Pl.rnd;
  for (const b of K.bells) if (Math.abs(b.x - x) < 20 * s) b.o = 1;
  if (rnd() > .12 || Pl.blooms.length >= 60 || Pl.blooms.some(b => Math.abs(b.x - x) < 6 * s)) return;
  Pl.blooms.push({ x, y: y - rnd() * 2 * s, r: (2.2 + rnd() * 1.4) * s, ph: rnd() * TAU, col: rnd() < .6 ? 0 : 1, k: 0 });
}

// A jagged bolt from the cloud to the ground below it, with one fork.
function bolt(S, K, rnd) {
  const ss = Math.max(K.s, .7), x0 = S.x + (rnd() - .5) * 40 * ss, y0 = S.y + 10 * ss, x1 = x0 + (rnd() - .5) * 90 * ss;
  const isle = K.isle, y1 = x1 > isle.x0 && x1 < isle.x0 + K.iw ? isle.topAt(x1) : K.HZ + 10, pts = [];
  for (let i = 0; i <= 10; i++) {
    const k = i / 10, j = i && i < 10 ? (rnd() - .5) * 22 * ss : 0;
    pts.push([x0 + (x1 - x0) * k + j, y0 + (y1 - y0) * k]);
  }
  const [bx, by] = pts[4], fork = [[bx, by]];
  for (let i = 1; i <= 4; i++) fork.push([bx + i * (rnd() < .5 ? -1 : 1) * 9 * ss, by + i * 14 * ss]);
  return { pts, fork, age: 0 };
}

export function drawPlay(c, Lf, K, P, t) {
  const Pl = Lf.play, H = Lf.hits, { s } = K;

  // Lanterns ringing: each flares, and a ring of light spreads from it as it fades.
  const col = K.occasion === 'halloween' ? PUMPKIN : P.glow, gs = sprite(col), ls = sprite(P.light);
  c.globalCompositeOperation = 'lighter';
  for (const l of K.tree.lanterns) {
    H.push(['lanterns', l.x, l.y, 7 * s, D_ISLE]);
    if (l.ring <= 0) continue;
    const e = l.ring * l.ring;
    dab(c, gs, l.x, l.y, (10 + 22 * e) * s, .6 * e);
    dab(c, ls, l.x, l.y, (2.5 + 3 * e) * s, .9 * e);
    c.strokeStyle = rgba(col, .5 * e);
    c.lineWidth = 1.2 * s;
    c.beginPath();
    c.arc(l.x, l.y, (4 + 26 * (1 - l.ring)) * s, 0, TAU);
    c.stroke();
  }
  c.globalCompositeOperation = 'source-over';

  // Flowers the rain opened: five petals each, growing open.
  if (Pl.blooms.length) {
    const cols = P.night ? [P.glow, [255, 176, 222]] : [[255, 192, 212], [255, 246, 236]];
    for (const ci of [0, 1]) {
      const p = new Path2D();
      for (const b of Pl.blooms) {
        if (b.col !== ci) continue;
        const r = b.r * ease(b.k);
        for (let i = 0; i < 5; i++) {
          const a = b.ph + (i * TAU) / 5;
          ell(p, b.x + Math.cos(a) * r * .8, b.y - r * .5 + Math.sin(a) * r * .45, r * .6, r * .32, a);
        }
      }
      c.fillStyle = rgba(cols[ci], .95);
      c.fill(p);
    }
  }

  drawJar(c, Pl, K, P, t, H);

  // Fireflies, after dark: each blinks on its own, and one being caught flies in an arc into the jar.
  if (P.night) {
    const J = Pl.jar, fs = sprite(FLY), cs = sprite(FLY_CORE);
    c.globalCompositeOperation = 'lighter';
    for (const f of Pl.flies) {
      if (f.wait > 0) continue;
      let x = f.x, y = f.y, b = 1;
      if (f.k >= 0) {
        const e = ease(f.k), m = 1 - e, mx = (f.fx + J.x) / 2, my = Math.min(f.fy, J.y) - 50 * s, ty = J.y - 10 * s;
        x = m * m * f.fx + 2 * m * e * mx + e * e * J.x;
        y = m * m * f.fy + 2 * m * e * my + e * e * ty;
      } else b = .15 + .85 * Math.max(0, Math.sin(t * 1.9 + f.ph * 3)) ** 2;
      dab(c, fs, x, y, 12 * s, .6 * b);
      dab(c, cs, x, y, 2 * s, b);
      H.push(['fireflies', x, y, 16 * s, D_ISLE]);
    }
    c.globalCompositeOperation = 'source-over';
  }

  drawStorm(c, Pl.storm, K, P, H);
}

// The jar in the grass, and the fireflies already in it, blinking.
function drawJar(c, Pl, K, P, t, H) {
  const { s } = K, J = Pl.jar, { x, y } = J, w = 6.5 * s, top = y - 15 * s, r = 2.6 * s;
  if (J.n || J.glow) {
    c.globalCompositeOperation = 'lighter';
    dab(c, sprite(FLY), x, y - 7 * s, (14 + J.n * 1.5 + 10 * J.glow) * s, (P.night ? .6 : .22) * Math.min(1, J.n / 6) + .3 * J.glow);
    c.globalCompositeOperation = 'source-over';
  }
  c.beginPath();
  c.moveTo(x - w, top + r);
  c.lineTo(x - w, y - r);
  c.quadraticCurveTo(x - w, y, x - w + r, y);
  c.lineTo(x + w - r, y);
  c.quadraticCurveTo(x + w, y, x + w, y - r);
  c.lineTo(x + w, top + r);
  c.quadraticCurveTo(x + w, top, x + w * .7, top);
  c.lineTo(x - w * .7, top);
  c.quadraticCurveTo(x - w, top, x - w, top + r);
  c.closePath();
  c.fillStyle = rgba(P.night ? [150, 200, 210] : [232, 240, 236], P.night ? .16 : .3);
  c.fill();
  c.strokeStyle = rgba(P.night ? [190, 230, 236] : [255, 255, 250], .55);
  c.lineWidth = .7 * s;
  c.stroke();
  if (J.n) {
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = rgba(FLY_CORE);
    for (let i = 0; i < J.n; i++) {
      const [dx, dy, ph] = J.spots[i];
      c.globalAlpha = (P.night ? 1 : .7) * (.3 + .7 * Math.max(0, Math.sin(t * 2.3 + ph)) ** 2);
      c.fillRect(x + dx * s - s, y + dy * 1.2 * s - s, 2 * s, 2 * s);
    }
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
  }
  c.strokeStyle = rgba([255, 255, 255], P.night ? .25 : .5);
  c.beginPath();
  c.moveTo(x - w * .55, top + 2 * s);
  c.lineTo(x - w * .55, y - 3 * s);
  c.stroke();
  c.fillStyle = rgba(mixc([126, 96, 66], P.rock, P.night ? .5 : .15));
  c.fillRect(x - w * .8, top - 2.4 * s, w * 1.6, 2.6 * s);
  H.push(['fireflies', x, y - 7 * s, 14 * s, D_ISLE]);
}

// The storm: rain under it, the cloud darkening and swelling as it gathers, and a bolt when it thunders.
function drawStorm(c, S, K, P, H) {
  if (!S) return;
  const ss = Math.max(K.s, .7), e = ease(S.power), w = cloudW(S, K);
  if (S.drops.length) {
    c.strokeStyle = rgba(P.night ? [170, 210, 230] : [78, 98, 122], P.night ? .55 : .6);
    c.lineWidth = 1.3 * ss;
    c.beginPath();
    for (const d of S.drops) {
      c.moveTo(d.x + 1.4 * ss, d.y - 17 * ss);
      c.lineTo(d.x, d.y);
    }
    c.stroke();
  }
  if (e > 0) {
    // Painted in flat tones like the rest of the scene: a dark body with a pale rim where the light catches its top,
    // over a soft shadow that keeps the edge from looking cut out.
    const body = P.night ? [24, 32, 48] : [98, 106, 124], rim = P.night ? [88, 114, 142] : [210, 214, 224], k = .6 + .4 * e;
    const lobes = (lift, scale) => {
      c.beginPath();
      for (const [dx, dy, r] of LOBES) {
        const R = r * w * k * scale, x = S.x + dx * w * k, y = S.y + (dy - r * lift) * w * k;
        c.moveTo(x + R, y);
        c.arc(x, y, R, 0, TAU);
      }
      c.fill();
    };
    dab(c, sprite(body), S.x, S.y + .05 * w, w * .62 * k, .35 * e);
    c.globalAlpha = .95 * e;
    c.fillStyle = rgba(rim);
    lobes(.12, 1);
    c.fillStyle = rgba(body);
    lobes(-.02, .97);
    c.globalAlpha = 1;
    if (e > .3) H.push(['storm', S.x, S.y, w * .45, D_ISLE]);
  }
  if (S.bolt) {
    const B = S.bolt, a = (1 - B.age / .45) * (B.age < .1 || (B.age > .16 && B.age < .24) ? 1 : .4);
    c.globalCompositeOperation = 'lighter';
    c.lineJoin = c.lineCap = 'round';
    for (const [lw, al] of [[7 * ss, .18], [2 * ss, .9]]) {
      c.strokeStyle = rgba([232, 238, 255], al * a);
      c.lineWidth = lw;
      c.beginPath();
      for (const line of [B.pts, B.fork]) line.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
      c.stroke();
    }
    c.lineJoin = 'miter';
    c.globalCompositeOperation = 'source-over';
  }
}

// Lightning lights the whole scene for a moment, drawn over everything on the front layer.
export function drawPlayFront(c, Lf, K) {
  const S = Lf.play.storm;
  if (!S || S.flash <= 0) return;
  c.globalCompositeOperation = 'lighter';
  c.fillStyle = rgba([210, 220, 255], .2 * S.flash * S.flash);
  c.fillRect(-K.EX, -K.EX, K.WU + K.EX * 2, 1000 + K.EX * 2);
  c.globalCompositeOperation = 'source-over';
}
