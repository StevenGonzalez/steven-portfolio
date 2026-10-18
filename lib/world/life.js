// Everything that moves. Creatures live in scene units on the layer for their depth; render.js supplies the pointer and
// pulses in each layer's units.

import {
  TAU,
  blit,
  clamp,
  dab,
  ell,
  lerp,
  makeCanvas,
  mixc,
  puff,
  rgba,
  seeded,
  skyAt,
  smoothPath,
  sprite,
} from "./core";
import { D_BACK, D_FAR, D_FRONT, D_ISLE } from "./layers";
import { gust } from "./wind";

// How long a whale's spout lasts, in seconds.
const SPOUT = 2.8;

export function makeLife(K) {
  const rnd = seeded(11),
    { WU, HZ, s, ix, phone } = K,
    ss = Math.max(s, 0.7);
  // Each starling has a fixed place in the ribbon: u along it, v across it, packed toward the middle so the core reads darker.
  // In Halloween week, a few of them are bats.
  const boids = Array.from({ length: phone ? 260 : 560 }, (_, i) => ({
    u: rnd() + rnd() - 1,
    v: (rnd() + rnd() + rnd() - 1.5) / 1.5,
    ph: rnd() * TAU,
    x: 0,
    y: 0,
    px: 0,
    py: 0,
    dx: 0,
    dy: 0,
    vx: 0,
    vy: 0,
    hit: 0,
    bat: K.occasion === "halloween" && i % 16 === 0,
  }));
  const jelly = (back, i) => ({
    back,
    x: back ? WU * (0.35 + rnd() * 0.65) : ix + (rnd() - 0.5) * 1000 * s,
    y: back ? 200 + rnd() * 500 : 260 + rnd() * (HZ - 300),
    R: back ? 6 + rnd() * 5 : (14 + rnd() * 10) * ss,
    ph: rnd() * TAU,
    rate: 1.3 + rnd() * 0.5,
    flash: 0,
    ci: i % 3,
    hit: 0,
    wait: 0,
  });
  return {
    t: 0,
    boids,
    flockIn: -Infinity,
    hits: [],
    sfx: [],
    hover: null,
    still: 0,
    doze: 0,
    gateWake: 0,
    gateE: { hit: 0 },
    armT: 0,
    serpent: { wait: 16, tau: -1, dur: 20, lag: 0.3 / 72, W: (phone ? 16 : 26) * ss },
    armBoost: 0,
    treeFlash: 0,
    flash: {},
    leafGlow: {},
    treeE: { hit: 0 },
    armE: { hit: 0 },
    mists: Array.from({ length: phone ? 3 : 5 }, (_, i) => ({
      x: rnd() * WU,
      y: HZ - 50 + rnd() * 70,
      w: (phone ? 380 : 560) * (0.7 + rnd() * 0.5),
      sp: (5 + rnd() * 6) * (i % 2 ? 1 : -1),
      a: 0.5 + rnd() * 0.35,
    })),
    whales: [
      { x: WU * 0.78, y: 240, dir: -1, L: phone ? 150 : 250, sp: 15, ph: 0, fog: 0.38, grove: true },
      { x: WU * 1.6, y: 340, dir: -1, L: phone ? 110 : 170, sp: 12, ph: 2, fog: 0.5 },
      {
        x: WU * 0.86,
        y: HZ - 150 * ss,
        dir: -1,
        L: 380 * ss,
        sp: 22,
        ph: 1,
        fog: 0.08,
        near: true,
        wait: 0,
        grove: true,
      },
    ],
    jellies: [
      ...Array.from({ length: phone ? 3 : 5 }, (_, i) => jelly(true, i)),
      ...Array.from({ length: phone ? 3 : 4 }, (_, i) => jelly(false, i)),
    ],
    mantas: { x: WU * 0.95, y: phone ? 620 : 380, wait: 0, ph: 0, n: phone ? 4 : 6, S: 54 * ss },
    kois: [],
    koiWait: 3,
    splash: [],
    leaves: Array.from({ length: 16 }, () => ({ x: 0, y: 1e9, vy: 0, ph: rnd() * TAU, rot: 0 })),
    wisps: Array.from({ length: phone ? 14 : 24 }, () => ({
      x: rnd() * WU,
      y: 150 + rnd() * 820,
      vx: 0,
      vy: 0,
      r: 2 + rnd() * 3,
      ph: rnd() * TAU,
      hit: 0,
      halo: {},
    })),
    dust: Array.from({ length: phone ? 40 : 80 }, () => ({ x: rnd(), y: rnd(), ph: rnd() * TAU })),
    rnd,
  };
}

export function spawnKoi(Lf, K, x) {
  const { rnd } = Lf,
    ss = Math.max(K.s, 0.7),
    dir = rnd() < 0.5 ? -1 : 1;
  Lf.kois.push({
    x0: x,
    y0: K.HZ + 8,
    dx: dir * (150 + rnd() * 120) * ss,
    h: (120 + rnd() * 110) * ss,
    t: 0,
    dur: 1.7 + rnd() * 0.4,
    L: 30 * ss,
  });
  splashAt(Lf, x, K.HZ + 6, 10);
  Lf.sfx.push(["splash", x]);
}

function splashAt(Lf, x, y, n) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Lf.rnd() - 0.5) * 1.6,
      v = 30 + Lf.rnd() * 60;
    Lf.splash.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, r: 6 + Lf.rnd() * 10 });
  }
}

// Pulses are expanding rings of light. Returns the direction away from the first pulse ring that has newly reached a point.
export function pulseAt(pulses, d, x, y, ent) {
  for (const p of pulses) {
    // A ring sets a thing off once. Rings are numbered as they are sent, so one older than the last to reach it is
    // passed over as well: two rings over the same thing would otherwise take turns setting it off every frame.
    if (p.id <= ent.hit) continue;
    const q = p.at[d],
      dx = x - q.x,
      dy = y - q.y,
      dist = Math.hypot(dx, dy) || 1;
    if (dist < p.r) {
      ent.hit = p.id;
      return [dx / dist, dy / dist, dist];
    }
  }
  return null;
}

export function updateLife(Lf, K, dt, ptr, pulses, toLayer) {
  const t = (Lf.t += dt),
    { WU, HZ, s, phone } = K,
    rnd = Lf.rnd,
    ss = Math.max(s, 0.7);
  // Where each pulse centre sits in the sky and in each animated layer this frame.
  for (const p of pulses)
    p.at = {
      0: toLayer(0, p.px, p.py),
      [D_FAR]: toLayer(D_FAR, p.px, p.py),
      [D_BACK]: toLayer(D_BACK, p.px, p.py),
      [D_ISLE]: toLayer(D_ISLE, p.px, p.py),
      [D_FRONT]: toLayer(D_FRONT, p.px, p.py),
    };

  // Drift starlings: the ribbon folds, stretches and slides through itself. The pointer and pulses push birds out of place
  // and a damped spring brings each one home, so the flock scatters and re-forms.
  const fx0 = WU * (phone ? 0.5 + 0.28 * Math.sin(t * 0.05) : 0.64 + 0.16 * Math.sin(t * 0.035)),
    fy0 = (phone ? 560 : 112) + (phone ? 40 : 28) * Math.sin(t * 0.061 + 1);
  const A = (phone ? 140 : 230) * (1 + 0.3 * Math.sin(t * 0.13)),
    B = (phone ? 34 : 50) * (1 + 0.4 * Math.sin(t * 0.09 + 1)),
    th = (phone ? 30 : 48) * (1 + 0.5 * Math.sin(t * 0.17 + 2));
  const rot = 0.3 * Math.sin(t * 0.07),
    cr = Math.cos(rot),
    sr = Math.sin(rot),
    pb = ptr(D_BACK);
  Lf.flockAt = [fx0, fy0, A];
  // Arriving, the flock streams in from beyond the right edge, the far end of the ribbon first, and settles into shape.
  const gx = WU + K.EX + 200;
  for (const b of Lf.boids) {
    const u = b.u + 0.18 * Math.sin(t * 0.3 + b.v * 2 + b.ph * 0.1);
    const a1 = u * 2.2 + t * 0.4,
      a2 = u * 4.7 - t * 0.27;
    const sx = u * A,
      sy = Math.sin(a1) * B + Math.sin(a2) * B * 0.35,
      slope = ((Math.cos(a1) * 2.2 + Math.cos(a2) * 1.65) * B) / A;
    const nl = Math.hypot(1, slope),
      T = th * (0.35 + 0.65 * Math.cos(u * 1.4)) * (1 + 0.45 * Math.sin(u * 3.1 + t * 0.5));
    const lx = sx - (slope / nl) * b.v * T + Math.sin(t * 1.3 + b.ph) * 3,
      ly = sy + (b.v * T) / nl + Math.cos(t * 1.1 + b.ph) * 2;
    const k = clamp((t - Lf.flockIn - (b.u + 1) * 2) / 7, 0, 1),
      e = k * k * (3 - 2 * k);
    const hx = lerp(gx, fx0 + lx * cr - ly * sr, e),
      hy = fy0 + lx * sr + ly * cr - (1 - e) * 60;
    if (pb) {
      const ex = hx + b.dx - pb.x,
        ey = hy + b.dy - pb.y,
        d = Math.hypot(ex, ey) || 1;
      if (d < 130) {
        b.vx += (ex / d) * (130 - d) * 9 * dt;
        b.vy += (ey / d) * (130 - d) * 9 * dt;
      }
    }
    const hit = pulseAt(pulses, D_BACK, hx + b.dx, hy + b.dy, b);
    if (hit) {
      b.vx += hit[0] * 240;
      b.vy += hit[1] * 240;
    }
    b.vx += (-b.dx * 2.6 - b.vx * 1.5) * dt;
    b.vy += (-b.dy * 2.6 - b.vy * 1.5) * dt;
    b.dx += b.vx * dt;
    b.dy += b.vy * dt;
    b.px = b.x;
    b.py = b.y;
    b.x = hx + b.dx;
    b.y = hy + b.dy;
  }

  // A pulse lights the canopy and spins the armillary up for a moment.
  Lf.treeFlash = Math.max(0, Lf.treeFlash - dt * 0.7);
  Lf.armBoost = Math.max(0, Lf.armBoost - dt * 0.5);
  if (pulseAt(pulses, D_ISLE, K.tree.cx, K.tree.cy, Lf.treeE)) Lf.treeFlash = 1;
  if (pulseAt(pulses, D_ISLE, K.arm.x, K.arm.y, Lf.armE)) Lf.armBoost = 1;
  Lf.armT += dt * (1 + 7 * Lf.armBoost * Lf.armBoost);
  // The cloud serpent waits below the clouds, then rises in one long arc over the island and dives again.
  const S = Lf.serpent;
  if (S.tau < 0) {
    if ((S.wait -= dt) <= 0) {
      S.tau = 0;
      S.dir = rnd() < 0.5 ? 1 : -1;
      S.span = WU * (phone ? 0.8 : 0.62);
      S.x0 = S.dir > 0 ? WU * (phone ? 0.1 : 0.3) : WU * (phone ? 0.9 : 0.97);
      S.base = HZ + 50;
      S.rise = phone ? 520 : 720;
      Lf.sfx.push(["serpent", S.x0]);
    }
  } else if ((S.tau += dt / S.dur) > 1.35) {
    S.tau = -1;
    S.wait = 25 + rnd() * 25;
  }

  // The gate's runes wake while it is looked at, or when a pulse reaches it.
  if (pulseAt(pulses, D_BACK, K.gate.x, K.gate.y - K.gate.R * 0.5, Lf.gateE)) Lf.gateWake = 1;
  Lf.gateWake = Lf.hover === "gate" ? Math.min(1, Lf.gateWake + dt * 1.5) : Math.max(0, Lf.gateWake - dt * 0.35);

  // Lumen bells open as the pointer comes near and close slowly after it leaves.
  const pi = ptr(D_ISLE),
    reach = 90 * ss;
  for (const b of K.bells) {
    const near = pi && Math.hypot(pi.x - b.x, pi.y - (b.y - b.h)) < reach;
    if (pulseAt(pulses, D_ISLE, b.x, b.y - b.h, b)) b.o = 1;
    b.o = near ? Math.min(1, b.o + dt * 3) : Math.max(0, b.o - dt * 0.45);
  }

  for (const m of Lf.mists) {
    m.x += m.sp * dt;
    if (m.x > WU + K.EX + m.w) m.x = -K.EX - m.w;
    if (m.x < -K.EX - m.w) m.x = WU + K.EX + m.w;
  }

  // A click on a whale makes it blow a spout of glowing spray.
  for (const w of Lf.whales) {
    if (w.wait > 0) {
      w.wait -= dt;
      continue;
    }
    if (pulseAt(pulses, w.near ? D_ISLE : D_BACK, w.x - w.dir * w.L * 0.4, w.y, w)?.[2] < w.L * 0.45) {
      w.spout = 0;
      Lf.sfx.push(["spout", w.x]);
    }
    if (w.spout >= 0 && (w.spout += dt) > SPOUT) w.spout = -1;
    w.ph += dt * (w.near ? 0.9 : 1.1);
    w.x += w.dir * w.sp * dt;
    if (w.dir < 0 ? w.x < -w.L * 1.4 - K.EX : w.x > WU + w.L * 1.4 + K.EX) {
      w.x = w.dir < 0 ? WU + K.EX + w.L * 0.2 : -K.EX - w.L * 0.2;
      if (w.near) {
        w.wait = 12 + rnd() * 18;
        w.y = HZ - (120 + rnd() * 60) * Math.max(s, 0.7);
      } else w.y = 180 + rnd() * 200;
    }
  }

  for (const j of Lf.jellies) {
    if (j.wait > 0) {
      j.wait -= dt;
      continue;
    }
    j.ph += dt * j.rate * TAU * 0.5;
    const c = Math.max(0, Math.sin(j.ph));
    j.y -= (4 + 26 * c * c) * dt * (j.back ? 0.6 : 1);
    j.x += Math.sin(t * 0.2 + j.ph * 0.1) * 4 * dt;
    j.flash = Math.max(0, j.flash - dt * 1.4);
    if (pulseAt(pulses, j.back ? D_BACK : D_ISLE, j.x, j.y, j)) j.flash = 1;
    if (j.y < -60) {
      j.y = HZ + 40;
      j.x = j.back ? WU * (0.35 + rnd() * 0.65) : K.ix + (rnd() - 0.5) * 1000 * s;
    }
  }

  const m = Lf.mantas;
  if (m.wait > 0) m.wait -= dt;
  else {
    m.ph += dt * 3;
    m.x -= 64 * ss * dt;
    if (m.x < -K.EX - m.S * 10) {
      m.x = WU + K.EX + m.S * 2;
      m.y = (phone ? 600 : 330) + rnd() * (phone ? 60 : 140);
      m.wait = 10 + rnd() * 14;
    }
  }

  Lf.koiWait -= dt;
  if (Lf.koiWait <= 0) {
    Lf.koiWait = 6 + rnd() * 5;
    const lo = phone ? 40 : Math.max(WU * 0.48, K.ix - 520 * s),
      hi = Math.min(WU - 40, K.ix + 560 * s);
    spawnKoi(Lf, K, lo + rnd() * (hi - lo));
  }
  for (const k of Lf.kois) {
    k.t += dt / k.dur;
    if (k.t >= 1) splashAt(Lf, k.x0 + k.dx, K.HZ + 6, 8);
  }
  Lf.kois = Lf.kois.filter((k) => k.t < 1);
  for (const p of Lf.splash) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 40 * dt;
    p.vx *= 1 - dt;
    p.life -= dt * 0.9;
    p.r += dt * 14;
  }
  Lf.splash = Lf.splash.filter((p) => p.life > 0);

  for (const l of Lf.leaves) {
    if (l.y > HZ + 20) {
      const tp = K.tree.tips[Math.floor(rnd() * K.tree.tips.length)];
      l.x = tp[0] + (rnd() - 0.5) * 30 * s;
      l.y = tp[1] + rnd() * 20 * s;
      l.vy = (12 + rnd() * 14) * ss;
      if (t < 1) l.y += rnd() * (HZ - l.y);
    }
    l.y += l.vy * dt;
    l.x += Math.sin(t * 1.1 + l.ph) * 16 * dt + 4 * dt;
    l.rot = t * 1.7 + l.ph;
  }

  // Wanderlights follow a slow flow field, flee the pointer, and scatter from pulses.
  const pf = ptr(D_FRONT);
  for (const w of Lf.wisps) {
    const fa = Math.sin(w.x * 0.004 + t * 0.15) * 2 + Math.cos(w.y * 0.005 - t * 0.11) * 2;
    let ax = Math.cos(fa) * 10 - w.vx * 0.8,
      ay = Math.sin(fa) * 7 - w.vy * 0.8;
    if (pf) {
      const dx = w.x - pf.x,
        dy = w.y - pf.y,
        d = Math.hypot(dx, dy) || 1;
      if (Lf.still > 1.2) {
        // Curious once the cursor stops moving: drift in and circle it.
        if (d < 460) {
          const oa = t * 0.7 + w.ph,
            orb = 46 + (w.ph % 1) * 60,
            k = Math.min(1, (Lf.still - 1.2) * 0.5);
          ax += (pf.x + Math.cos(oa) * orb - w.x) * 1.4 * k - w.vx * 1.2 * k;
          ay += (pf.y + Math.sin(oa) * orb * 0.7 - w.y) * 1.4 * k - w.vy * 1.2 * k;
        }
      } else if (d < 170) {
        ax += (dx / d) * (170 - d) * 5;
        ay += (dy / d) * (170 - d) * 5;
      }
    }
    const hit = pulseAt(pulses, D_FRONT, w.x, w.y, w);
    if (hit) {
      w.vx += hit[0] * 220;
      w.vy += hit[1] * 220;
    }
    w.vx += ax * dt;
    w.vy += ay * dt;
    w.x += w.vx * dt;
    w.y += w.vy * dt;
    if (w.x < -K.EX) w.x += WU + K.EX * 2;
    if (w.x > WU + K.EX) w.x -= WU + K.EX * 2;
    if (w.y < 60) w.y = 1000;
    if (w.y > 1040) w.y = 100;
  }
}

// ---------- Drawing ----------

export function drawWhale(c, w, P, t) {
  const L = w.L,
    n = 26,
    up = [],
    lo = [],
    sp = [],
    fog = w.fog;
  const top = mixc(mixc(P.body, [0, 0, 0], 0.25), P.haze, fog),
    body = mixc(P.body, P.haze, fog),
    belly = mixc(P.belly, P.haze, fog * 0.8);
  for (let i = 0; i <= n; i++) {
    const u = i / n,
      x = -u * L,
      y = Math.sin(w.ph - u * 3.2) * L * 0.045 * (u * u + 0.12);
    const h = L * 0.12 * Math.pow(Math.sin(Math.PI * Math.pow(0.1 + 0.9 * u, 0.6)), 0.8);
    sp.push([x, y, h]);
    up.push([x, y - h]);
    lo.push([x, y + h * 1.15]);
  }
  c.save();
  c.translate(w.x, w.y + Math.sin(t * 0.25 + w.ph) * 8);
  c.scale(w.dir, 1);
  c.rotate(Math.sin(w.ph * 0.5) * 0.03);
  // Far pectoral fin, body, near pectoral fin.
  const fin = (k, len, col) => {
    const [bx, by, bh] = sp[8],
      swing = Math.sin(w.ph * 0.6 + k) * 0.05 * L;
    c.fillStyle = rgba(col);
    c.beginPath();
    c.moveTo(bx + 0.05 * L, by + bh * 0.7);
    c.quadraticCurveTo(bx - 0.1 * L, by + bh + len * 0.6, bx - len * 0.9, by + bh * 0.9 + len * 0.55 + swing);
    c.quadraticCurveTo(bx - 0.12 * L, by + bh * 1.2, bx - 0.08 * L, by + bh * 0.8);
    c.fill();
  };
  fin(1, 0.3 * L, mixc(top, [0, 0, 0], 0.2));
  // Tail flukes, angled with the last spine segment.
  const [tx, ty] = sp[n],
    [px, py] = sp[n - 2],
    ta = Math.atan2(ty - py, tx - px);
  c.save();
  c.translate(tx, ty);
  c.rotate(ta + Math.PI);
  c.fillStyle = rgba(body);
  c.beginPath();
  const flex = Math.sin(w.ph - 3.4) * 0.025 * L;
  c.moveTo(0.02 * L, -0.012 * L);
  c.quadraticCurveTo(-0.1 * L, -0.02 * L + flex, -0.21 * L, -0.035 * L + flex * 1.6);
  c.quadraticCurveTo(-0.15 * L, flex, -0.2 * L, 0.03 * L + flex * 1.6);
  c.quadraticCurveTo(-0.1 * L, 0.02 * L + flex, 0.02 * L, 0.012 * L);
  c.fill();
  c.restore();
  const outline = smoothPath([[L * 0.03, sp[0][1] + sp[0][2] * 0.15], ...up, ...lo.slice().reverse()]);
  const g = c.createLinearGradient(0, -0.13 * L, 0, 0.15 * L);
  g.addColorStop(0, rgba(top));
  g.addColorStop(0.5, rgba(body));
  g.addColorStop(1, rgba(belly));
  c.fillStyle = g;
  c.fill(outline);
  if (w.grove) drawGrove(c, w, sp, up, lo, P, L);
  // Throat grooves.
  c.strokeStyle = rgba(mixc(belly, [255, 255, 255], 0.2), 0.35);
  c.lineWidth = L * 0.003;
  for (let k = 1; k <= 4; k++) {
    c.beginPath();
    for (let i = 1; i <= 11; i++) c.lineTo(lo[i][0], lo[i][1] - k * L * 0.011);
    c.stroke();
  }
  fin(0, 0.36 * L, mixc(body, belly, 0.3));
  c.strokeStyle = rgba(P.rim, 0.55 * (1 - fog));
  c.lineWidth = L * 0.006;
  c.stroke(smoothPath(up.slice(0, n - 2), false));
  // Bioluminescent spots and trailing tendrils.
  c.globalCompositeOperation = "lighter";
  const spr = sprite(P.bio),
    a = (P.night ? 0.9 : 0.55) * (1 - fog * 0.8);
  for (let i = 3; i < n - 4; i += 2) {
    const [x, y, h] = sp[i];
    dab(c, spr, x, y - h * (0.1 + (i % 3) * 0.12), L * (0.01 + (i % 4) * 0.003), a * (0.6 + 0.4 * Math.sin(t * 2 + i)));
    if (i % 4 === 1) dab(c, spr, x - L * 0.02, y + h * 0.45, L * 0.009, a * 0.6);
  }
  c.strokeStyle = rgba(P.bio, 0.22 * (1 - fog * 0.6));
  c.lineWidth = L * 0.004;
  for (const i of [6, 9, 12]) {
    let [x, y, h] = sp[i];
    y += h;
    c.beginPath();
    c.moveTo(x, y);
    for (let k = 1; k <= 8; k++)
      c.lineTo(x - k * L * 0.045, y + k * L * 0.018 + Math.sin(w.ph * 0.8 - k * 0.7 + i) * L * 0.012);
    c.stroke();
  }
  // The spout: drops leave the blowhole in a fan, a few at a time, and arc back down.
  if (w.spout >= 0) {
    const [bx, by, bh] = sp[4],
      ls = sprite(P.light);
    dab(
      c,
      sprite(P.cloudLit),
      bx,
      by - bh - L * 0.12 * Math.min(1, w.spout * 3),
      L * (0.08 + 0.1 * Math.min(1, w.spout)),
      0.35 * Math.max(0, 1 - w.spout / 1.6),
    );
    for (let k = 0; k < 28; k++) {
      const age = w.spout - (k % 7) * 0.06;
      if (age <= 0) continue;
      const ang = -Math.PI / 2 + (k / 27 - 0.5) * 0.9,
        v = L * (0.42 + (0.22 * ((k * 7) % 5)) / 5),
        f = 1 - age / (SPOUT - 0.4);
      if (f <= 0) continue;
      const x = bx + Math.cos(ang) * v * age,
        y = by - bh + Math.sin(ang) * v * age + 0.5 * L * 0.75 * age * age;
      dab(c, spr, x, y, L * 0.04, a * 0.7 * f);
      dab(c, ls, x, y, L * 0.01, f);
    }
  }
  c.globalCompositeOperation = "source-over";
  c.restore();
}

// A small wood on a whale's back: a dense run of crowns with a few firs poking out, and moss trailing from the belly.
function drawGrove(c, w, sp, up, lo, P, L) {
  const fog = w.fog,
    dark = new Path2D(),
    lit = new Path2D(),
    moss = new Path2D();
  for (let i = 4; i <= 16; i++) {
    const [x, y] = up[i],
      k = Math.sin(i * 2.3) * 0.5 + 0.5,
      r = L * (0.012 + 0.014 * k) * (1 - Math.abs(i - 10) / 14);
    if (i % 4 === 1) {
      dark.moveTo(x, y - r * 4);
      dark.lineTo(x + r * 0.9, y + r * 0.4);
      dark.lineTo(x - r * 0.9, y + r * 0.4);
      dark.closePath();
    } else {
      ell(dark, x, y - r * 0.5, r * 1.3, r, 0);
      ell(dark, x + r * 0.7, y - r * 1.2, r * 0.9, r * 0.8, 0);
      ell(lit, x - r * 0.3, y - r * 1.1, r * 0.7, r * 0.5, 0);
    }
  }
  c.fillStyle = rgba(mixc(P.leafDark, P.haze, fog));
  c.fill(dark);
  c.fillStyle = rgba(mixc(P.leafMid, P.haze, fog), 0.8);
  c.fill(lit);
  for (let i = 6; i <= 20; i++) {
    const [x, y] = lo[i],
      len = L * (0.015 + (Math.sin(i * 1.7) * 0.5 + 0.5) * 0.035),
      sw = Math.sin(w.ph * 0.7 + i) * L * 0.006;
    moss.moveTo(x, y - L * 0.006);
    moss.quadraticCurveTo(x + sw, y + len * 0.5, x + sw * 2 + L * 0.008, y + len);
  }
  c.strokeStyle = rgba(mixc(P.leafMid, P.haze, fog * 0.8 + 0.2), 0.45);
  c.lineCap = "round";
  c.lineWidth = L * 0.006;
  c.stroke(moss);
}

// A veil ray seen from above at a low angle: the classic diamond silhouette squashed by perspective, wingtips rising and falling.
function drawManta(c, x, y, S, ph, P) {
  const e = Math.sin(ph),
    sy = 0.42,
    lift = -e * S * 0.22,
    bend = -e * S * 0.1;
  const tipX = -S * 0.1,
    near = [tipX, S * 0.5 * sy + lift],
    far = [tipX, -S * 0.5 * sy + lift * 0.8];
  c.save();
  c.translate(x, y);
  c.scale(-1, 1);
  const g = c.createLinearGradient(0, far[1], 0, near[1]);
  g.addColorStop(0, rgba(mixc(P.body, [0, 0, 0], 0.35)));
  g.addColorStop(1, rgba(mixc(P.body, P.belly, 0.25)));
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(S * 0.2, -S * 0.03 * sy);
  c.quadraticCurveTo(S * 0.06, far[1] * 0.55 + bend * 0.5, far[0], far[1]);
  c.quadraticCurveTo(-S * 0.14, far[1] * 0.4, -S * 0.3, -S * 0.05 * sy);
  c.lineTo(-S * 0.32, S * 0.05 * sy);
  c.quadraticCurveTo(-S * 0.14, near[1] * 0.4, near[0], near[1]);
  c.quadraticCurveTo(S * 0.06, near[1] * 0.55 + bend * 0.5, S * 0.2, S * 0.03 * sy);
  c.closePath();
  c.fill();
  // Cephalic fins and the long tail.
  c.strokeStyle = rgba(mixc(P.body, [0, 0, 0], 0.2));
  c.lineCap = "round";
  c.lineWidth = S * 0.03;
  c.beginPath();
  c.moveTo(S * 0.19, -S * 0.03 * sy);
  c.quadraticCurveTo(S * 0.27, -S * 0.06 * sy, S * 0.29, S * 0.0);
  c.moveTo(S * 0.19, S * 0.03 * sy);
  c.quadraticCurveTo(S * 0.27, S * 0.08 * sy, S * 0.28, S * 0.06);
  c.stroke();
  c.lineWidth = S * 0.012;
  c.beginPath();
  c.moveTo(-S * 0.3, 0);
  c.quadraticCurveTo(-S * 0.65, Math.sin(ph - 1.2) * S * 0.05, -S * 1.05, Math.sin(ph - 2.2) * S * 0.07);
  c.stroke();
  // Light catching the far leading edge.
  c.strokeStyle = rgba(P.rim, 0.55);
  c.lineWidth = S * 0.014;
  c.beginPath();
  c.moveTo(S * 0.2, -S * 0.03 * sy);
  c.quadraticCurveTo(S * 0.06, far[1] * 0.55 + bend * 0.5, far[0], far[1]);
  c.stroke();
  c.globalCompositeOperation = "lighter";
  const spr = sprite(P.bio);
  dab(c, spr, far[0], far[1], S * 0.06, P.night ? 0.9 : 0.45);
  dab(c, spr, near[0], near[1], S * 0.06, P.night ? 0.9 : 0.45);
  c.globalCompositeOperation = "source-over";
  c.restore();
}

function drawJelly(c, j, P, t) {
  const col = P.jelly[j.ci],
    p = Math.max(0, Math.sin(j.ph)),
    R = j.R;
  const w = R * (1 - 0.16 * p),
    h = R * (0.78 + 0.18 * p),
    a = (j.back ? 0.55 : 1) * (0.75 + j.flash * 0.5),
    { x, y } = j;
  c.globalCompositeOperation = "lighter";
  dab(c, sprite(col), x, y, R * (3 + j.flash * 2.5), 0.22 * a + 0.35 * j.flash, j.flash ? null : j);
  c.strokeStyle = rgba(col, 0.26 * a);
  c.lineWidth = R * 0.035;
  c.beginPath();
  for (let k = 0; k < 8; k++) {
    const x0 = x + (k / 7 - 0.5) * w * 1.7,
      y0 = y + h * 0.12,
      len = R * (2.4 + (k % 3) * 0.5);
    c.moveTo(x0, y0);
    for (let i = 1; i <= 8; i++)
      c.lineTo(x0 + (Math.sin(t * 2.2 + k - i * 0.6) * R * 0.14 * i) / 8, y0 + (len * i) / 8);
  }
  c.stroke();
  c.lineWidth = R * 0.09;
  c.strokeStyle = rgba(col, 0.2 * a);
  c.beginPath();
  for (let k = -1; k <= 1; k++) {
    c.moveTo(x + k * R * 0.15, y);
    for (let i = 1; i <= 6; i++)
      c.lineTo(x + k * R * 0.15 + Math.sin(t * 1.6 + k * 2 - i * 0.8) * R * 0.12, y + (R * 1.6 * i) / 6);
  }
  c.stroke();
  c.beginPath();
  c.moveTo(x - w, y + h * 0.15);
  c.bezierCurveTo(x - w, y - h * 1.15, x + w, y - h * 1.15, x + w, y + h * 0.15);
  for (let k = 5; k >= 0; k--) {
    const sx = x - w + (2 * w * k) / 6;
    c.quadraticCurveTo(sx + w / 6, y + h * 0.15 + R * 0.14, sx, y + h * 0.15);
  }
  const g = c.createRadialGradient(x, y - h * 0.35, 0, x, y - h * 0.2, w * 1.1);
  g.addColorStop(0, rgba(mixc(col, [255, 255, 255], 0.5), 0.55 * a));
  g.addColorStop(0.6, rgba(col, 0.28 * a));
  g.addColorStop(1, rgba(col, 0.12 * a));
  c.fillStyle = g;
  c.fill();
  c.strokeStyle = rgba(mixc(col, [255, 255, 255], 0.5), 0.45 * a);
  c.lineWidth = R * 0.04;
  c.beginPath();
  c.moveTo(x - w * 0.92, y - h * 0.1);
  c.bezierCurveTo(x - w * 0.9, y - h * 1.05, x + w * 0.9, y - h * 1.05, x + w * 0.92, y - h * 0.1);
  c.stroke();
  for (let k = 0; k < 4; k++)
    dab(c, sprite(mixc(col, [255, 255, 255], 0.4)), x + (k - 1.5) * R * 0.22, y - h * 0.2, R * 0.2, 0.5 * a);
  c.globalCompositeOperation = "source-over";
}

function drawKoi(c, k, P) {
  const u = k.t,
    x = k.x0 + k.dx * u,
    y = k.y0 - 4 * k.h * u * (1 - u);
  const vx = k.dx,
    vy = -4 * k.h * (1 - 2 * u),
    L = k.L,
    sway = Math.sin(u * 30) * L * 0.06;
  c.save();
  c.translate(x, y);
  c.rotate(Math.atan2(vy, vx));
  if (P.night) {
    c.globalCompositeOperation = "lighter";
    dab(c, sprite(P.koi[0]), 0, 0, L * 1.6, 0.35);
    c.globalCompositeOperation = "source-over";
  }
  c.fillStyle = rgba(P.koi[1], 0.75);
  c.beginPath();
  c.moveTo(-0.36 * L, 0);
  c.quadraticCurveTo(-0.6 * L, -0.1 * L, -0.72 * L, -0.22 * L + sway);
  c.quadraticCurveTo(-0.6 * L, 0, -0.72 * L, 0.22 * L + sway);
  c.quadraticCurveTo(-0.6 * L, 0.1 * L, -0.36 * L, 0);
  c.fill();
  const g = c.createLinearGradient(0.5 * L, 0, -0.4 * L, 0);
  g.addColorStop(0, rgba(P.koi[0]));
  g.addColorStop(0.55, rgba(mixc(P.koi[0], P.koi[1], 0.5)));
  g.addColorStop(1, rgba(P.koi[1]));
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(0.5 * L, 0);
  c.bezierCurveTo(0.42 * L, -0.2 * L, -0.12 * L, -0.19 * L, -0.4 * L, -0.04 * L);
  c.lineTo(-0.4 * L, 0.04 * L);
  c.bezierCurveTo(-0.12 * L, 0.18 * L, 0.42 * L, 0.18 * L, 0.5 * L, 0);
  c.fill();
  c.fillStyle = rgba(P.koi[1], 0.8);
  c.beginPath();
  c.moveTo(0.08 * L, -0.15 * L);
  c.quadraticCurveTo(-0.08 * L, -0.3 * L, -0.2 * L, -0.12 * L);
  c.fill();
  c.restore();
}

// A waterfall leaves the lip with a little forward speed, so it arcs outward and then drops almost straight,
// widening and loosening into spray as it falls toward the cloud sea.
function drawFall(c, f, t, P, lite) {
  const { x, y0, y1, w, dir } = f,
    len = y1 - y0,
    n = 28,
    mid = [],
    hw = [];
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    mid.push([x + dir * w * 1.5 * Math.sqrt(k), y0 + k * len]);
    hw.push(w * (0.5 + 1.1 * k) * (1 + 0.07 * Math.sin(k * 15 - t * 4.2)));
  }
  const band = (sc, from = 0) => {
    c.beginPath();
    for (let i = from; i <= n; i++) c.lineTo(mid[i][0] - hw[i] * sc, mid[i][1]);
    for (let i = n; i >= from; i--) c.lineTo(mid[i][0] + hw[i] * sc, mid[i][1]);
    c.closePath();
  };
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, rgba(P.water, 0.78));
  g.addColorStop(0.55, rgba(P.water, 0.42));
  g.addColorStop(1, rgba(P.water, 0));
  c.fillStyle = g;
  c.globalAlpha = 0.22;
  band(2.1, 2);
  c.fill();
  c.globalAlpha = 0.75;
  band(1);
  c.fill();
  c.globalAlpha = 1;
  // Streaks of falling water at slightly different speeds.
  const hi = mixc(P.water, [255, 255, 255], 0.5),
    sg = c.createLinearGradient(0, y0, 0, y1);
  sg.addColorStop(0, rgba(hi, 0.85));
  sg.addColorStop(0.7, rgba(hi, 0.3));
  sg.addColorStop(1, rgba(hi, 0));
  // The dashes are cut by hand, and the streaks of each width share one stroke: a canvas dash pattern costs about as
  // much again as the stroke itself.
  c.strokeStyle = sg;
  const widths = [new Path2D(), new Path2D(), new Path2D()];
  for (let s = 0; s < 8; s += lite ? 2 : 1) {
    const o = (s / 7 - 0.5) * 1.7,
      pts = [];
    for (let i = 0; i <= n; i++) pts.push([mid[i][0] + o * hw[i] * 0.9, mid[i][1]]);
    dashes(widths[s % 3], pts, w * (2.5 + ((s * 5) % 4)), w * (1.2 + ((s * 7) % 3)), t * (170 + (s % 4) * 26) + s * 37);
  }
  widths.forEach((p, k) => {
    c.lineWidth = w * (0.07 + k * 0.045);
    c.stroke(p);
  });
  // Edge that catches the light, then the bright crest at the lip.
  c.strokeStyle = rgba(P.rim, 0.35);
  c.lineWidth = w * 0.06;
  c.beginPath();
  for (let i = 0; i <= n * 0.6; i++) c.lineTo(mid[i][0] - dir * hw[i], mid[i][1]);
  c.stroke();
  c.globalCompositeOperation = "lighter";
  const spr = sprite(P.water);
  dab(c, spr, x + dir * w * 0.3, y0 + w * 0.3, w * 1.3, 0.45);
  // Spray thrown up where the water meets the cloud sea, and mist rolling off it.
  const bx = mid[n][0];
  for (let i = 0; i < 14; i++) {
    const k = (t * (0.35 + (i % 5) * 0.04) + i * 0.618) % 1,
      sx = Math.sin(i * 12.9898) * 0.5;
    dab(
      c,
      spr,
      bx + sx * w * 5 * k,
      y1 - 18 - Math.sin(k * Math.PI) * w * (1.4 + (i % 3) * 0.5),
      w * (0.35 + k * 0.6),
      0.5 * (1 - k),
    );
  }
  for (let k = 0; k < 5; k++)
    dab(
      c,
      spr,
      bx + Math.sin(t * 0.7 + k * 1.7) * w * 1.8,
      y1 - 16 - k * 9,
      w * (2.8 + Math.sin(t * 1.1 + k) * 0.5),
      0.17,
      f.mists[k],
    );
  c.globalCompositeOperation = "source-over";
}

// Adds the dashes of a dashed line through `pts` to path `p`: `on` long, `off` apart, the pattern slid `shift` along the
// line, as a canvas dash pattern does with a line dash offset of -shift.
function dashes(p, pts, on, off, shift) {
  const period = on + off;
  let u = ((-shift % period) + period) % period,
    down = u < on;
  if (down) p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1],
      [x1, y1] = pts[i],
      len = Math.hypot(x1 - x0, y1 - y0);
    let at = 0;
    while (at < len) {
      const step = Math.min(len - at, (down ? on : period) - u);
      at += step;
      u += step;
      const x = x0 + ((x1 - x0) * at) / len,
        y = y0 + ((y1 - y0) * at) / len;
      if (down) p.lineTo(x, y);
      if (u >= (down ? on : period) - 1e-9) {
        down = !down;
        if (down) {
          u = 0;
          p.moveTo(x, y);
        }
      }
    }
  }
}

// Broken-off chunks of the island drifting beneath it, each on its own slow bob.
function drawShards(c, K, P, t) {
  const s = K.s;
  for (const sh of K.shards) {
    const y = sh.y + Math.sin(t * 0.55 + sh.ph) * 5 * s,
      r = sh.r;
    c.save();
    c.translate(sh.x, y);
    c.rotate(Math.sin(t * 0.4 + sh.ph) * 0.06);
    const g = c.createLinearGradient(0, -r * 0.2, 0, r * 1.7);
    g.addColorStop(0, rgba(mixc(P.rock, P.rockLit, 0.4)));
    g.addColorStop(0.3, rgba(P.rock));
    g.addColorStop(1, rgba(mixc(P.rock, P.haze, 0.45)));
    c.fillStyle = g;
    c.fill(sh.path);
    c.fillStyle = rgba(P.leafDark);
    c.fill(sh.turf);
    c.strokeStyle = rgba(P.rim, 0.6);
    c.lineWidth = 1.2 * s;
    c.beginPath();
    c.moveTo(-r * 0.95, -r * 0.02);
    c.quadraticCurveTo(0, -r * 0.2, r * 0.95, -r * 0.02);
    c.stroke();
    if (sh.glow) {
      c.globalCompositeOperation = "lighter";
      dab(c, sprite(P.glow), sh.glow[0], sh.glow[1], r * 0.7, P.night ? 0.55 : 0.3);
      dab(c, sprite(P.light), sh.glow[0], sh.glow[1], r * 0.14, 0.9);
      c.globalCompositeOperation = "source-over";
    }
    c.restore();
  }
}

// A soft, wide bank of mist, painted once per theme and slid across the cloud sea.
let mistCv, mistKey;
export function mistSprite(P) {
  const key = P.night ? "n" : "d";
  if (mistKey === key) return mistCv;
  mistKey = key;
  mistCv ||= makeCanvas();
  mistCv.ver = (mistCv.ver || 0) + 1;
  mistCv.width = 512;
  mistCv.height = 144;
  const c = mistCv.getContext("2d"),
    rnd = seeded(17),
    lit = mixc(P.haze, P.cloudLit, P.night ? 0.3 : 0.5);
  for (let i = 0; i < 26; i++) {
    const u = rnd(),
      hump = Math.sin(Math.PI * u);
    puff(c, 30 + u * 452, 82 - hump * 22 * rnd(), 26 + 46 * hump * (0.5 + rnd() * 0.5), lit, 0.26 * hump + 0.06);
  }
  return mistCv;
}

// The tree's flash, a wide glow with a brighter heart, painted once per theme so that a flash is a single copy.
let flashCv, flashKey;
function flashSprite(P) {
  const key = P.night ? "n" : "d";
  if (flashKey === key) return flashCv;
  flashKey = key;
  flashCv ||= makeCanvas();
  flashCv.ver = (flashCv.ver || 0) + 1;
  flashCv.width = flashCv.height = 512;
  const c = flashCv.getContext("2d");
  c.globalCompositeOperation = "lighter";
  puff(c, 256, 256, 256, P.glow, 0.3);
  puff(c, 256, 256, (256 * 0.7) / 1.5, P.light, 0.25);
  return flashCv;
}

function drawArmillary(c, A, t, P) {
  const { x, y, r } = A,
    gold = mixc(P.rim, [255, 196, 110], P.night ? 0.25 : 0.5);
  c.globalCompositeOperation = "lighter";
  dab(c, sprite(P.glow), x, y, r * 2.8, 0.28, A);
  c.globalCompositeOperation = "source-over";
  c.strokeStyle = rgba(gold, 0.95);
  c.lineWidth = r * 0.07;
  const ring = (rx, ry, rot) => {
    c.beginPath();
    c.ellipse(x, y, Math.max(0.5, Math.abs(rx)), Math.max(0.5, Math.abs(ry)), rot, 0, TAU);
    c.stroke();
  };
  ring(r * Math.cos(t * 0.5), r, 0.35);
  ring(r * 0.92, r * 0.92 * Math.sin(t * 0.37 + 1), -0.35);
  ring(r * 0.8, r * 0.8 * Math.sin(t * 0.23 + 2.4), Math.PI / 2 + 0.2);
  c.lineWidth = r * 0.04;
  c.beginPath();
  c.moveTo(x - Math.sin(0.35) * r * 1.25, y + Math.cos(0.35) * r * 1.25);
  c.lineTo(x + Math.sin(0.35) * r * 1.25, y - Math.cos(0.35) * r * 1.25);
  c.stroke();
  c.globalCompositeOperation = "lighter";
  dab(c, sprite(P.light), x, y, r * 0.45, 0.9);
  c.globalCompositeOperation = "source-over";
}

// Head of the serpent's path at time tau. Before 0 and after 1 the path runs on below the cloud sea, so the body rises out of it and sinks back in.
function serpentAt(S, tau) {
  return [S.x0 + S.dir * tau * S.span, S.base - Math.sin(Math.PI * tau) * S.rise + Math.sin(tau * 17) * 58];
}

function drawSerpent(c, S, P, t, H) {
  const n = 72,
    pts = [],
    fog = 0.22;
  for (let i = 0; i <= n; i++) pts.push(serpentAt(S, S.tau - i * S.lag));
  const body = mixc(P.body, P.haze, fog),
    back = mixc(mixc(P.body, [0, 0, 0], 0.3), P.haze, fog),
    belly = mixc(P.belly, P.haze, fog);
  const up = [],
    dn = [],
    frill = [],
    ws = [];
  for (let i = 0; i <= n; i++) {
    const a = pts[Math.max(0, i - 1)],
      b = pts[Math.min(n, i + 1)],
      dx = a[0] - b[0],
      dy = a[1] - b[1],
      d = Math.hypot(dx, dy) || 1;
    // The dorsal side stays on top whichever way the serpent travels.
    const nx = (-dy / d) * S.dir,
      ny = (dx / d) * S.dir,
      u = i / n;
    const w =
      S.W *
      (u < 0.05 ? 0.6 + (0.4 * u) / 0.05 : 0.12 + 0.88 * Math.pow(1 - (u - 0.05) / 0.95, 0.75)) *
      (1 + 0.1 * Math.sin(u * 22 - t * 3));
    const [x, y] = pts[i];
    ws.push(w);
    up.push([x + nx * w * 0.5, y + ny * w * 0.5]);
    dn.push([x - nx * w * 0.5, y - ny * w * 0.5]);
    const fh = i > 4 && i < n - 3 ? w * (0.9 + 0.6 * Math.sin(i * 0.5 - t * 5)) * (1 - u * 0.4) : 0;
    frill.push([x + nx * (w * 0.5 + fh), y + ny * (w * 0.5 + fh)]);
  }
  // Translucent dorsal frill that ripples along the back.
  c.globalCompositeOperation = "lighter";
  c.fillStyle = rgba(P.bio, P.night ? 0.26 : 0.2);
  c.beginPath();
  for (const [x, y] of up) c.lineTo(x, y);
  for (let i = n; i >= 0; i--) c.lineTo(frill[i][0], frill[i][1]);
  c.fill();
  c.strokeStyle = rgba(P.bio, P.night ? 0.3 : 0.2);
  c.lineWidth = 0.9;
  c.beginPath();
  for (let i = 5; i < n - 3; i += 3) {
    c.moveTo(up[i][0], up[i][1]);
    c.lineTo(frill[i][0], frill[i][1]);
  }
  c.stroke();
  c.globalCompositeOperation = "source-over";
  // Swept fins behind the head and at mid body.
  for (const [i, sc] of [
    [9, 1],
    [30, 0.7],
  ]) {
    const [x, y] = pts[i],
      [bx, by] = pts[i + 6],
      sw = Math.sin(t * 2.4 + i) * 0.35;
    const fl = S.W * 2.4 * sc,
      ang = Math.atan2(by - y, bx - x);
    for (const side of [-1, 1]) {
      const fa = ang + side * (0.75 + sw * side);
      c.fillStyle = rgba(side > 0 ? back : body, 0.85);
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(
        x + Math.cos(fa - side * 0.5) * fl * 0.7,
        y + Math.sin(fa - side * 0.5) * fl * 0.7,
        x + Math.cos(fa) * fl,
        y + Math.sin(fa) * fl,
      );
      c.quadraticCurveTo(x + Math.cos(ang) * fl * 0.5, y + Math.sin(ang) * fl * 0.5, bx, by);
      c.fill();
    }
  }
  const outline = new Path2D();
  outline.moveTo(up[0][0], up[0][1]);
  for (const [x, y] of up) outline.lineTo(x, y);
  for (let i = n; i >= 0; i--) outline.lineTo(dn[i][0], dn[i][1]);
  outline.closePath();
  c.fillStyle = rgba(body);
  c.fill(outline);
  // Pale belly and a lit spine.
  c.strokeStyle = rgba(belly, 0.55);
  c.lineCap = "round";
  for (let i = 0; i < n - 4; i++) {
    c.lineWidth = ws[i] * 0.3;
    c.beginPath();
    c.moveTo(lerp(pts[i][0], dn[i][0], 0.45), lerp(pts[i][1], dn[i][1], 0.45));
    c.lineTo(lerp(pts[i + 1][0], dn[i + 1][0], 0.45), lerp(pts[i + 1][1], dn[i + 1][1], 0.45));
    c.stroke();
  }
  c.strokeStyle = rgba(P.rim, 0.5);
  c.lineWidth = 1.2;
  c.beginPath();
  for (let i = 0; i < n - 6; i++) c.lineTo(up[i][0], up[i][1]);
  c.stroke();
  // Head: a blunt snout, a glowing eye, and two long whiskers trailing back along the body.
  const [hx, hy] = pts[0],
    [nx2, ny2] = pts[2],
    ha = Math.atan2(hy - ny2, hx - nx2);
  c.fillStyle = rgba(body);
  c.beginPath();
  c.ellipse(hx + Math.cos(ha) * S.W * 0.4, hy + Math.sin(ha) * S.W * 0.4, S.W * 0.95, S.W * 0.55, ha, 0, TAU);
  c.fill();
  c.strokeStyle = rgba(P.bio, 0.45);
  c.lineWidth = 1;
  for (const side of [-1, 1]) {
    c.beginPath();
    c.moveTo(hx, hy);
    for (let i = 1; i < 26; i++) {
      const [x, y] = pts[i],
        o = S.W * (0.7 + i * 0.05) + Math.sin(t * 3 - i * 0.45 + side) * S.W * 0.45;
      const nx = (up[i][0] - dn[i][0]) / ws[i],
        ny = (up[i][1] - dn[i][1]) / ws[i];
      c.lineTo(x + nx * side * o, y + ny * side * o);
    }
    c.stroke();
  }
  c.globalCompositeOperation = "lighter";
  const spr = sprite(P.bio);
  dab(
    c,
    sprite(P.light),
    hx + Math.cos(ha - 0.5 * S.dir) * S.W * 0.55,
    hy + Math.sin(ha - 0.5 * S.dir) * S.W * 0.55,
    S.W * 0.35,
    0.95,
  );
  dab(c, spr, hx, hy, S.W * 2, P.night ? 0.35 : 0.2);
  for (let i = 4; i < n - 4; i += 3) {
    const a = 0.35 + 0.65 * Math.max(0, Math.sin(i * 0.28 - t * 4));
    dab(
      c,
      spr,
      lerp(pts[i][0], up[i][0], 0.3),
      lerp(pts[i][1], up[i][1], 0.3),
      ws[i] * 0.55,
      (P.night ? 0.9 : 0.5) * a,
    );
  }
  // Tail streamers.
  const [tx, ty] = pts[n];
  c.strokeStyle = rgba(P.bio, 0.35);
  for (let k = -1; k <= 1; k++) {
    c.beginPath();
    c.moveTo(tx, ty);
    const [px, py] = pts[n - 4],
      ta = Math.atan2(ty - py, tx - px) + k * 0.25;
    for (let j = 1; j <= 8; j++)
      c.lineTo(tx + Math.cos(ta) * j * 7, ty + Math.sin(ta) * j * 7 + Math.sin(t * 4 - j * 0.7 + k) * j * 0.9);
    c.stroke();
  }
  c.globalCompositeOperation = "source-over";
  for (let i = 0; i <= n; i += 12) H.push(["serpent", pts[i][0], pts[i][1], i ? 34 : 60, D_BACK]);
}

// The gate is stamped from its painted canvas; the runes are drawn live, with a slow light chasing around the ring.
function drawGate(c, K, P, t, wake) {
  const G = K.gate;
  if (!G.cv) return;
  const { x, y, R, band } = G,
    glow = mixc(P.glow, [255, 255, 255], 0.25);
  // A faint shimmer fills the ring, stronger while it is awake.
  c.globalCompositeOperation = "lighter";
  const sh = 0.05 + 0.03 * Math.sin(t * 0.8) + wake * 0.16;
  dab(c, sprite(P.glow), x, y - R * 0.25, R * 1.05, sh, G.shimmer);
  for (let k = 0; k < 2; k++) {
    const ph = (t * 0.12 + k * 0.5) % 1;
    c.strokeStyle = rgba(P.glow, (1 - ph) * (0.05 + wake * 0.18));
    c.lineWidth = 2;
    c.beginPath();
    c.arc(x, y, (R - band) * ph, 0, TAU);
    c.stroke();
  }
  c.globalCompositeOperation = "source-over";
  blit(c, G.cv, x - G.size / 2, y - G.size / 2, G.size, G.size, G);
  const open = 1 - (G.close || 0),
    [lx, ly] = G.lift,
    [bcx, bcy, bh] = G.blk;
  c.drawImage(G.bcv, x + bcx + lx * open - bh, y + bcy + ly * open - bh, bh * 2, bh * 2);
  c.globalCompositeOperation = "lighter";
  // The moment the ring closes, a ring of light rolls out from it.
  if (G.flash >= 0 && G.flash < 1) {
    c.strokeStyle = rgba(P.glow, 0.5 * (1 - G.flash));
    c.lineWidth = band * (0.6 - 0.4 * G.flash);
    c.beginPath();
    c.arc(x, y, R * (1 + G.flash * 1.6), 0, TAU);
    c.stroke();
    dab(c, sprite(P.light), x, y, R * 1.2, 0.35 * (1 - G.flash), G.flashGlow);
  }
  const rr = R - band * 0.5,
    sz = band * 0.26,
    chase = t * 0.35;
  c.lineCap = "round";
  c.lineWidth = 1.4;
  for (const r of G.runes) {
    if (Math.abs(r.a - G.gap) < G.gapW * 0.7 && (G.close || 0) < 0.95) continue;
    const b = Math.min(
      1,
      0.14 + 0.86 * Math.pow(Math.max(0, Math.cos(r.a - chase)), 14) + wake * (0.6 + 0.4 * Math.sin(t * 3 + r.a * 4)),
    );
    const cx = x + Math.cos(r.a) * rr,
      cy = y + Math.sin(r.a) * rr,
      ca = Math.cos(r.a + Math.PI / 2),
      sa = Math.sin(r.a + Math.PI / 2);
    if (b > 0.25) dab(c, sprite(P.glow), cx, cy, band * 0.9, b * 0.4, G.runeGlow);
    c.strokeStyle = rgba(glow, b * 0.9);
    c.beginPath();
    for (const [x0, y0, x1, y1] of r.strokes) {
      c.moveTo(cx + (x0 * ca - y0 * sa) * sz, cy + (x0 * sa + y0 * ca) * sz);
      c.lineTo(cx + (x1 * ca - y1 * sa) * sz, cy + (x1 * sa + y1 * ca) * sz);
    }
    c.stroke();
  }
  c.globalCompositeOperation = "source-over";
}

// Lumen bells: a curved stem, a hanging bud that opens into a lit cup.
function drawBells(c, K, P, t, W) {
  const s = K.s,
    col = P.night ? P.glow : [255, 200, 120],
    H = [];
  for (const b of K.bells) {
    const o = b.o * b.o * (3 - 2 * b.o),
      sway = (Math.sin(t * 1.3 + b.ph) * 2 + gust(W, K, b.x) * 7) * s;
    const hx = b.x + b.lean * b.h * 0.55 + sway,
      hy = b.y - b.h * (1 + o * 0.12);
    c.strokeStyle = rgba(mixc(P.leafDark, P.leafMid, 0.4));
    c.lineWidth = 1.3 * s;
    c.beginPath();
    c.moveTo(b.x, b.y);
    c.quadraticCurveTo(b.x - b.lean * 2 * s, b.y - b.h * 0.9, hx, hy - 3 * s * (1 - o));
    c.stroke();
    c.save();
    c.translate(hx, hy);
    c.rotate(b.lean * (1 - o) * 0.6 + sway * 0.02);
    if (o > 0.02) {
      c.globalCompositeOperation = "lighter";
      dab(c, sprite(col), 0, 2 * s, (8 + 18 * o) * s, (P.night ? 0.3 : 0.2) + 0.45 * o);
      c.globalCompositeOperation = "source-over";
    }
    c.fillStyle = rgba(mixc(mixc(P.leafMid, col, 0.25 + 0.5 * o), [255, 255, 255], o * 0.25), 0.95);
    c.beginPath();
    const w = (2.4 + 3 * o) * s,
      h = (5 - o) * s;
    c.moveTo(-w * 0.35, 0);
    c.quadraticCurveTo(-w, h * 0.6, -w * (1 + o * 0.4), h + o * 2 * s);
    c.lineTo(-w * 0.3, h * 0.8);
    c.lineTo(0, h + o * 2.5 * s);
    c.lineTo(w * 0.3, h * 0.8);
    c.lineTo(w * (1 + o * 0.4), h + o * 2 * s);
    c.quadraticCurveTo(w, h * 0.6, w * 0.35, 0);
    c.closePath();
    c.fill();
    c.globalCompositeOperation = "lighter";
    dab(c, sprite(P.light), 0, h * 0.7, (1.2 + 2.2 * o) * s, 0.25 + 0.7 * o);
    c.globalCompositeOperation = "source-over";
    c.restore();
    H.push(["bells", hx, hy, 18 * s, D_ISLE]);
  }
  return H;
}

// A bat in silhouette, wings at `flap` from -1 (down) to 1 (up): a body with two ears, and scalloped wings.
const BAT_WING = [
  [2.2, -1.5, 0.4],
  [5.6, -0.6, 1],
  [4.4, 0.6, 0.55],
  [3.4, 0, 0.35],
  [2.3, 0.9, 0.2],
  [1.1, 0.5, 0],
];
function drawBat(c, x, y, flap) {
  const up = flap * 2.6,
    at = (side, [dx, dy, k]) => c.lineTo(x + side * dx, y + dy - up * k);
  c.moveTo(x, y - 1.2);
  c.lineTo(x + 0.5, y - 2.2);
  c.lineTo(x + 0.7, y - 1);
  for (const p of BAT_WING) at(1, p);
  c.lineTo(x, y + 1.6);
  for (let i = BAT_WING.length - 1; i >= 0; i--) at(-1, BAT_WING[i]);
  c.lineTo(x - 0.7, y - 1);
  c.lineTo(x - 0.5, y - 2.2);
  c.closePath();
}

// Back layer: the far gate, starlings, distant whales, the serpent and jellies.
export function drawBack(c, Lf, K, P, t) {
  const H = Lf.hits;
  drawGate(c, K, P, t, Lf.gateWake);
  H.push(["gate", K.gate.x, K.gate.y - K.gate.R * 0.45, K.gate.R * 0.8, D_BACK]);
  // Starlings are tiny wing-beats: a short stroke across the direction of travel that flickers as they flap.
  c.strokeStyle = P.night ? rgba(mixc(P.rim, skyAt(P, 150), 0.62), 0.6) : rgba([30, 40, 46], 0.82);
  c.lineWidth = 1.35;
  c.lineCap = "round";
  c.beginPath();
  for (const b of Lf.boids) {
    if (b.bat) continue;
    let vx = b.x - b.px,
      vy = b.y - b.py;
    const v = Math.hypot(vx, vy);
    if (v < 1e-4) {
      vx = 1;
      vy = 0;
    } else {
      vx /= v;
      vy /= v;
    }
    const flap = Math.sin(t * 16 + b.ph),
      wl = 1.1 + 0.9 * Math.abs(flap);
    c.moveTo(b.x - vy * wl - vx * 0.6, b.y + vx * wl - vy * 0.6 - flap * 0.5);
    c.lineTo(b.x, b.y);
    c.lineTo(b.x + vy * wl - vx * 0.6, b.y - vx * wl - vy * 0.6 - flap * 0.5);
  }
  c.stroke();
  if (K.occasion === "halloween") {
    c.fillStyle = P.night ? rgba(mixc(P.rim, skyAt(P, 150), 0.62), 0.7) : rgba([30, 26, 38], 0.88);
    c.beginPath();
    for (const b of Lf.boids) if (b.bat) drawBat(c, b.x, b.y, Math.sin(t * 9 + b.ph));
    c.fill();
  }
  const [fx, fy, fa] = Lf.flockAt;
  if (t > Lf.flockIn + 11) H.push(["boids", fx, fy, fa * 0.55, D_BACK]);
  for (const w of Lf.whales)
    if (!w.near) {
      drawWhale(c, w, P, t);
      H.push(["whale", w.x - w.dir * w.L * 0.4, w.y, w.L * 0.4, D_BACK]);
    }
  if (Lf.serpent.tau >= 0) drawSerpent(c, Lf.serpent, P, t, H);
  for (const j of Lf.jellies)
    if (j.back && j.wait <= 0) {
      drawJelly(c, j, P, t);
      H.push(["jelly", j.x, j.y, j.R * 2.5, D_BACK]);
    }
}

// Island layer: the bells, waterfalls, floating shards, the armillary and the tree's flash, mantas, the great whale,
// near jellies, mist, koi, splashes and falling leaves, with the hit targets for the tree, the ruins and the painted
// land.
export function drawIsle(c, Lf, K, P, t) {
  const H = Lf.hits;
  H.push(["tree", K.tree.cx, K.tree.cy, K.tree.r * 0.85, D_ISLE]);
  H.push(["ruins", K.ruins.x, K.ruins.y, K.ruins.r, D_ISLE, true]);
  // The painted land: the meadow along the lip, the hills and the near range, each at its own layer's depth. The smaller
  // of two targets wins, so on a phone the meadow's reach grows no smaller than the campfire's does, and a press on the
  // campfire finds the campfire.
  for (let u = 0.08; u < 0.95; u += 0.06) {
    const x = K.isle.x0 + K.iw * u;
    H.push(["meadow", x, K.isle.topAt(x) - 10 * K.s, 24 * Math.max(K.s, 0.7), D_ISLE]);
  }
  for (const h of K.land.hills) H.push(["hills", h.x, h.top + 45, Math.min(h.hw * 0.55, 85), 0.3]);
  for (const p of K.land.near.peaks) if (K.phone || p.x > K.WU * 0.42) H.push(["peaks", p.x, p.y + 45, 60, D_FAR]);
  H.push(...drawBells(c, K, P, t, Lf.wind));
  for (const f of K.falls) drawFall(c, f, t, P, Lf.lite);
  drawShards(c, K, P, t);
  drawArmillary(c, K.arm, Lf.armT, P);
  if (Lf.treeFlash > 0) {
    c.globalCompositeOperation = "lighter";
    c.globalAlpha = Lf.treeFlash * Lf.treeFlash;
    const r = K.tree.r * 1.5;
    blit(c, flashSprite(P), K.tree.cx - r, K.tree.cy - r, r * 2, r * 2, Lf.flash);
    c.globalAlpha = 1;
    c.globalCompositeOperation = "source-over";
  }
  H.push(["arm", K.arm.x, K.arm.y, K.arm.r * 1.6, D_ISLE, true]);
  const m = Lf.mantas;
  if (m.wait <= 0) {
    for (let i = 0; i < m.n; i++) {
      const row = Math.ceil(i / 2),
        side = i % 2 ? -1 : 1;
      const x = m.x + row * m.S * 1.3,
        y = m.y + side * row * m.S * 0.42 + Math.sin(t * 0.6 + i) * m.S * 0.1;
      drawManta(c, x, y, m.S * (1 - row * 0.06), m.ph - i * 0.55, P);
      H.push(["manta", x, y, m.S * 0.6, D_ISLE]);
    }
  }
  for (const w of Lf.whales)
    if (w.near && w.wait <= 0) {
      drawWhale(c, w, P, t);
      H.push(["whale", w.x - w.dir * w.L * 0.4, w.y, w.L * 0.38, D_ISLE]);
    }
  for (const j of Lf.jellies)
    if (!j.back && j.wait <= 0) {
      drawJelly(c, j, P, t);
      H.push(["jelly", j.x, j.y, j.R * 2, D_ISLE]);
    }
  const ms = mistSprite(P);
  for (const m of Lf.mists) {
    c.globalAlpha = m.a;
    blit(c, ms, m.x - m.w / 2, m.y - m.w * 0.14, m.w, m.w * 0.28, m);
  }
  c.globalAlpha = 1;
  for (const k of Lf.kois) {
    drawKoi(c, k, P);
    H.push(["koi", k.x0 + k.dx * k.t, k.y0 - 4 * k.h * k.t * (1 - k.t), k.L * 1.2, D_ISLE]);
  }
  c.globalCompositeOperation = "lighter";
  const ws = sprite(P.water);
  for (const p of Lf.splash) dab(c, ws, p.x, p.y, p.r, p.life * 0.5);
  const ls = sprite(P.leafLit),
    s = K.s;
  for (const l of Lf.leaves) {
    if (l.y > K.HZ) continue;
    dab(c, ls, l.x, l.y, 9 * s, 0.4, Lf.leafGlow);
    c.fillStyle = rgba(P.leafLit, 0.9);
    c.beginPath();
    c.ellipse(l.x, l.y, 4 * s * Math.abs(Math.cos(l.rot)) + 0.5, 2 * s, l.rot * 0.3, 0, TAU);
    c.fill();
  }
  c.globalCompositeOperation = "source-over";
}

// Front layer: wanderlights, dust in the light, and pulse rings.
export function drawFront(c, Lf, K, P, t, rings) {
  const H = Lf.hits,
    ws = sprite(P.glow);
  c.globalCompositeOperation = "lighter";
  for (const w of Lf.wisps) {
    const tw = 0.65 + 0.35 * Math.sin(t * 2.1 + w.ph);
    dab(c, ws, w.x, w.y, w.r * 7, 0.32 * tw, w.halo);
    dab(c, sprite(P.light), w.x, w.y, w.r * 1.3, 0.95 * tw);
    H.push(["wisp", w.x, w.y, 22, D_FRONT]);
  }
  c.fillStyle = rgba(P.light, 1);
  for (const d of Lf.dust) {
    const x = K.L.x + (d.x - 0.5) * 900 + Math.sin(t * 0.1 + d.ph) * 30,
      y = K.L.y + d.y * 700 + Math.cos(t * 0.13 + d.ph) * 20;
    const fall = clamp(1 - Math.hypot(x - K.L.x, (y - K.L.y) * 0.8) / 650, 0, 1);
    c.globalAlpha = fall * (0.25 + 0.25 * Math.sin(t * 1.5 + d.ph * 3));
    c.fillRect(x, y, 1.6, 1.6);
  }
  c.globalAlpha = 1;
  for (const r of rings) {
    const k = r.age / r.life;
    c.strokeStyle = rgba(P.glow, 0.55 * (1 - k));
    c.lineWidth = 2;
    c.beginPath();
    c.arc(r.x, r.y, r.r, 0, TAU);
    c.stroke();
    c.strokeStyle = rgba(P.glow, 0.12 * (1 - k));
    c.lineWidth = 14;
    c.stroke();
  }
  c.globalCompositeOperation = "source-over";
}
