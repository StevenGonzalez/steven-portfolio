// Static layers of the world. Each painter runs once per resize or theme change; after that the browser only slides the canvases for parallax.

import { PAD, TAU, awayFrom, clamp, ell, grain, lerp, makeCanvas, mixc, puff, rgba, rimLight, seeded, skyAt, smoothPath, taper } from './core';
import { FOG_BACK, FOG_RANGE, buildFar, paintChains, paintGiant, paintNear, paintSpires } from './depth';
import { buildLand, paintHills, paintMeadow, paintRange } from './land';
import { paintSkyIsles, paintTowers } from './whimsy';

export function layout(W, H) {
  const U = H / 1000, WU = W / U, phone = W < 760;
  const s = phone ? clamp(WU / 760, .5, .64) : clamp(WU / 1800, .72, 1.02);
  const K = { W, H, U, WU, EX: PAD / U, phone, s, ix: phone ? WU * .56 : WU * .67, top: phone ? 720 : 505, HZ: phone ? 905 : 835 };
  K.iw = 760 * s;
  K.idepth = 300 * s;
  buildIsland(K);
  buildGate(K);
  buildFar(K);
  buildLand(K);
  return K;
}

// The sun sits behind the tree at dusk; the moon hangs top right at night.
export function setLight(K, night) {
  K.L = night
    ? { x: K.WU * (K.phone ? .84 : .87), y: K.phone ? 110 : 140 }
    : { x: K.tree.cx - 8 * K.s, y: K.tree.cy - 20 * K.s };
}

// Outline of a floating island: a gently domed top and a hanging underside that tapers to rocky points.
export function islandShape(rnd, cx, top, w, depth, tipU) {
  const n = 72, x0 = cx - w / 2, p = Math.log(.5) / Math.log(tipU);
  const tops = [], unders = [];
  const spikes = Array.from({ length: 5 }, () => [.15 + rnd() * .7, .02 + rnd() * .05, .1 + rnd() * .25]);
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = x0 + u * w, arch = Math.sin(Math.PI * u);
    tops.push([x, top - arch * w * .018 + (rnd() - .5) * w * .006]);
    let d = Math.pow(Math.sin(Math.PI * Math.pow(u, p)), 1.5);
    for (const [c, sw, a] of spikes) d += a * Math.exp(-(((u - c) / sw) ** 2)) * arch;
    d *= depth * (.92 + rnd() * .1);
    unders.push([x, top + Math.max(d, w * .03 * Math.sqrt(arch) + 2)]);
  }
  const at = arr => x => {
    const f = clamp((x - x0) / w, 0, 1) * n, i = Math.min(n - 1, Math.floor(f));
    return lerp(arr[i][1], arr[i + 1][1], f - i);
  };
  return { path: smoothPath(tops.concat(unders.slice().reverse())), tops, unders, x0, w, top, depth, topAt: at(tops), underAt: at(unders) };
}

// Recursive branching. Inner and outer branch ends both become leaf clusters so the crown reads as full.
export function grow(rnd, T, x, y, ang, len, wid, depth) {
  const bend = (rnd() - .5) * .6;
  const ex = x + Math.cos(ang) * len, ey = y + Math.sin(ang) * len;
  const cx = x + Math.cos(ang + bend) * len * .55, cy = y + Math.sin(ang + bend) * len * .55;
  const w1 = wid * .68;
  taper(x, y, cx, cy, ex, ey, wid, w1, T.limbs);
  // The first limbs off the trunk, so things can hang from them.
  if (depth === 4) T.arms.push([x, y, cx, cy, ex, ey]);
  if (depth <= 2) T.tips.push([ex, ey, depth]);
  if (depth === 0) return;
  const kids = depth >= 4 ? 2 : rnd() < .6 ? 2 : 3;
  for (let k = 0; k < kids; k++) {
    const spread = (k / (kids - 1) - .5) * (.9 + rnd() * .4);
    const a = lerp(ang + spread + (rnd() - .5) * .2, -Math.PI / 2, .12);
    grow(rnd, T, ex, ey, a, len * (.7 + rnd() * .14), w1, depth - 1);
  }
}

function buildIsland(K) {
  const rnd = seeded(7), { s, ix, top, iw, idepth } = K;
  K.isle = islandShape(rnd, ix, top, iw, idepth, .52);
  const tx = ix - 6 * s, T = { limbs: new Path2D(), tips: [], arms: [], x: tx, y: K.isle.topAt(tx) };
  grow(rnd, T, tx, T.y + 8 * s, -Math.PI / 2 + .04, 92 * s, 34 * s, 5);
  T.cx = T.tips.reduce((a, p) => a + p[0], 0) / T.tips.length;
  T.cy = T.tips.reduce((a, p) => a + p[1], 0) / T.tips.length;
  T.r = Math.max(...T.tips.map(p => Math.hypot(p[0] - T.cx, p[1] - T.cy))) + 30 * s;
  K.tree = T;
  const ax = ix + 262 * s;
  K.arm = { x: ax, y: K.isle.topAt(ax) - 70 * s, r: 22 * s, base: K.isle.topAt(ax) };
  const fall = (u, w, dir) => {
    const x = ix - iw / 2 + u * iw;
    return { x, y0: K.isle.topAt(x) + 2 * s, y1: K.HZ + 16, w: w * s, dir };
  };
  K.falls = [fall(.085, 15, -1), fall(.905, 21, 1)];
  K.ruins = { x: ix - 255 * s, y: K.isle.topAt(ix - 266 * s) - 62 * s, r: 66 * s };
  // The arch in the ruins: two pillars of width pw and a span of outer radius rr centred on (mx, my). The desk behind
  // it shows through the opening.
  const x1 = ix - 300 * s, x2 = ix - 232 * s;
  K.arch = { x1, x2, pw: 15 * s, mx: (x1 + x2) / 2, my: K.isle.topAt(x1) - 105 * s, rr: (x2 - x1) / 2 + 7 * s };
  // Lumen bells along the turf, kept clear of the trunk, the pedestal and the waterfalls.
  K.bells = [];
  for (let i = 0; i < 40 && K.bells.length < 15; i++) {
    const u = .13 + rnd() * .74, x = ix - iw / 2 + u * iw;
    if (Math.abs(x - tx) < 46 * s || Math.abs(x - ax) < 30 * s || K.bells.some(b => Math.abs(b.x - x) < 16 * s)) continue;
    K.bells.push({ x, y: K.isle.topAt(x) + 3 * s, h: (15 + rnd() * 20) * s, lean: (rnd() < .5 ? -1 : 1) * (.4 + rnd() * .4), ph: rnd() * TAU, o: 0, hit: 0 });
  }
  // Debris floating beneath the island: [position along the island, depth below the lip as a share of the island's depth, size].
  K.shards = [[.17, .8, 36], [.26, 1.05, 21], [.8, .84, 29], [.88, 1.1, 17], [.68, 1.26, 14]].map(([u, dv, r], i) => {
    const x = ix - iw / 2 + u * iw, R = r * s, path = new Path2D(), turf = new Path2D();
    // Faceted outline: a slightly domed top, then a jagged underside that drops to one or two points.
    const pts = [[-R, 0], [-R * .5, -R * .1], [R * .5, -R * .1], [R, 0]], tip = (rnd() - .5) * R * .5;
    for (let k = 5; k >= 1; k--) {
      const xk = -R + (2 * R * k) / 6, d = Math.max(0, 1 - Math.abs(xk - tip) / R);
      pts.push([xk + (rnd() - .5) * R * .15, R * (.25 + 1.3 * d * d) * (.75 + rnd() * .5)]);
      if (k === 3) pts.push([tip, R * (1.5 + rnd() * .5)]);
    }
    path.moveTo(pts[0][0], pts[0][1]);
    for (const [px, py] of pts) path.lineTo(px, py);
    path.closePath();
    for (let k = 0; k < 9; k++) ell(turf, -R * .85 + (1.7 * R * k) / 8, -R * .06, R * (.14 + rnd() * .1), R * .08, rnd() * 3);
    return { x, y: top + K.idepth * dv, r: R, ph: i * 1.9, path, turf, glow: i % 2 ? null : [(rnd() - .5) * R * .4, R * .55] };
  });
}

// A cloud bank made of soft dabs: a darker body, then a lit layer nudged toward the light.
export function cloud(c, rnd, K, P, cx, cy, w, h, n, fog, a = 1) {
  const sky = skyAt(P, cy), dark = mixc(P.cloudDark, sky, fog), lit = mixc(P.cloudLit, sky, fog * .7), pts = [];
  for (let i = 0; i < n; i++) {
    const u = rnd(), hump = Math.sin(Math.PI * u);
    pts.push([cx + (u - .5) * w, cy - hump * h * .35 * rnd() + (rnd() - .3) * h * .2, h * (.3 + .7 * hump) * (.55 + rnd() * .5)]);
  }
  for (const [x, y, r] of pts) puff(c, x, y, r, dark, .8 * a);
  for (const [x, y, r] of pts) {
    const dx = K.L.x - x, dy = K.L.y - y, d = Math.hypot(dx, dy) || 1, near = clamp(1.2 - d / 1400, .25, 1);
    puff(c, x + (dx / d) * r * .3, y + (dy / d) * r * .2 - r * .12, r * .72, lit, .62 * a * near);
  }
}

// One row of the cloud sea: billows spaced evenly across the whole width.
export function seaRow(c, rnd, K, P, y, r, fog, a = 1) {
  const sky = skyAt(P, y - 80), dark = mixc(P.cloudDark, sky, fog), lit = mixc(P.cloudLit, sky, fog * .6), pts = [];
  for (let x = -K.EX - r; x < K.WU + K.EX + r; x += r * (.55 + rnd() * .5)) pts.push([x, y + (rnd() - .5) * r * .5, r * (.7 + rnd() * .6)]);
  for (const [x, yy, rr] of pts) puff(c, x, yy, rr, dark, .92 * a);
  for (const [x, yy, rr] of pts) {
    const dx = K.L.x - x, dy = K.L.y - yy, d = Math.hypot(dx, dy) || 1, near = clamp(1.25 - d / 1500, .22, 1);
    puff(c, x + (dx / d) * rr * .3, yy - rr * .2, rr * .7, lit, .6 * a * near);
  }
}

function stretchedPuff(c, x, y, r, sx, sy, rot, col, a) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(sx, sy);
  puff(c, 0, 0, r, col, a);
  c.restore();
}

export function paintSky(c, K, P) {
  const { WU, EX, L, HZ } = K, rnd = seeded(3);
  const g = c.createLinearGradient(0, 0, 0, 1000);
  for (const [o, col] of P.sky) g.addColorStop(o, rgba(col));
  c.fillStyle = g;
  c.fillRect(-EX, -EX, WU + EX * 2, 1000 + EX * 2);

  if (P.night) {
    for (let i = 0; i < 460; i++) {
      const x = -EX + rnd() * (WU + EX * 2), y = -EX + Math.pow(rnd(), 1.5) * 780, r = .6 + rnd() * rnd() * 1.8;
      const a = clamp(1 - y / 820, 0, 1) * (.25 + rnd() * .75);
      c.fillStyle = rgba([222, 236, 255], a);
      c.fillRect(x, y, r, r);
      if (r > 1.5) puff(c, x, y, r * 6, [170, 210, 255], a * .3);
    }
    // Aurora: thin vertical curtains following two slow waves.
    c.globalCompositeOperation = 'lighter';
    for (let band = 0; band < 2; band++) {
      const base = 90 + band * 100, amp = 46 + band * 26, f = .0024 + band * .0012, ph = rnd() * 6, x0 = WU * .3;
      for (let x = x0; x < WU + EX; x += 3) {
        const y = base + Math.sin(x * f + ph) * amp + Math.sin(x * f * 2.7 + ph * 2) * amp * .35;
        const a = (Math.sin(x * .0042 + ph) * .5 + .5) * (.06 + .11 * Math.max(0, Math.sin(x * .019 + band))) * clamp((x - x0) / 400, 0, 1);
        const h = 160 + 110 * Math.sin(x * .006 + ph);
        const ag = c.createLinearGradient(0, y, 0, y + h);
        ag.addColorStop(0, rgba([150, 116, 236], 0));
        ag.addColorStop(.3, rgba([150, 120, 230], a * .55));
        ag.addColorStop(.65, rgba([90, 236, 190], a));
        ag.addColorStop(1, rgba([90, 236, 190], 0));
        c.fillStyle = ag;
        c.fillRect(x, y, 3.6, h);
      }
    }
    puff(c, L.x, L.y, 460, P.bloom, .2);
    puff(c, L.x, L.y, 110, P.light, .3);
    // A faint lunar corona.
    const halo = c.createRadialGradient(L.x, L.y, 40, L.x, L.y, 78);
    halo.addColorStop(0, rgba(P.light, 0));
    halo.addColorStop(.75, rgba([200, 226, 255], .07));
    halo.addColorStop(1, rgba(P.light, 0));
    c.fillStyle = halo;
    c.fillRect(L.x - 80, L.y - 80, 160, 160);
    c.globalCompositeOperation = 'source-over';
    c.save();
    c.beginPath();
    c.arc(L.x, L.y, 24, 0, TAU);
    c.fillStyle = rgba([226, 236, 232]);
    c.fill();
    c.clip();
    puff(c, L.x - 8, L.y - 4, 11, [160, 180, 184], .5);
    puff(c, L.x + 8, L.y + 7, 8, [160, 180, 184], .4);
    puff(c, L.x - 16, L.y - 14, 24, [255, 255, 255], .35);
    c.restore();
  } else {
    c.globalCompositeOperation = 'lighter';
    puff(c, L.x, L.y, 900, P.bloom, .3);
    puff(c, L.x, L.y, 340, P.light, .45);
    puff(c, L.x, L.y, 90, [255, 250, 236], .9);
  }
  c.globalCompositeOperation = 'source-over';
  paintRange(c, K, P, K.land.far, P.night ? .7 : .78, false, 43);
  c.globalCompositeOperation = 'lighter';
  stretchedPuff(c, L.x, HZ - 40, 260, 4.5, 1, 0, P.bloom, P.night ? .14 : .32);
  c.globalCompositeOperation = 'source-over';

  paintGiant(c, K, P);

  // High, thin streaks of cloud catching the light.
  for (let i = 0; i < 10; i++) {
    const y = 110 + rnd() * 420, col = mixc(P.cloudLit, skyAt(P, y), .45);
    stretchedPuff(c, rnd() * WU, y, 40, (140 + rnd() * 260) / 40, .22 + rnd() * .1, (rnd() - .5) * .1, col, .12 + rnd() * .12);
  }
  grain(c, P.night ? .05 : .04, 'overlay');
}

// Small distant island with a bush of a tree and, usually, a thread of water.
export function farIsle(c, rnd, K, P, cx, top, w, fog) {
  const sh = islandShape(rnd, cx, top, w, w * .5, .42 + rnd() * .16), sky = skyAt(P, top + w * .2);
  paintRock(c, rnd, K, P, sh, fog);
  const [ax, ay] = awayFrom(K, cx, top, 2.5);
  const tx = cx + (rnd() - .5) * w * .3, ty = sh.topAt(tx);
  const leaves = new Path2D();
  taper(tx, ty, tx + 2, ty - w * .14, tx + (rnd() - .5) * 6, ty - w * .26, w * .035, w * .015, leaves);
  for (let i = 0; i < 40; i++) {
    const a = rnd() * TAU, rr = Math.sqrt(rnd()) * w * .16;
    ell(leaves, tx + Math.cos(a) * rr * 1.4, ty - w * .3 + Math.sin(a) * rr * .8, w * .03, w * .02, rnd() * 3);
  }
  c.fillStyle = rgba(mixc(P.leafDark, sky, fog));
  c.fill(leaves);
  rimLight(c, r => r.fill(leaves), ax, ay, mixc(P.leafLit, sky, fog * .5), .5);
  if (rnd() < .75) {
    const x = cx + (rnd() - .5) * w * .7, y = sh.topAt(x), len = w * .9, g = c.createLinearGradient(0, y, 0, y + len);
    g.addColorStop(0, rgba(mixc(P.water, sky, fog * .5), .5));
    g.addColorStop(1, rgba(P.water, 0));
    c.fillStyle = g;
    c.fillRect(x - w * .012, y, w * .024, len);
    puff(c, x, y + len * .8, w * .12, mixc(P.water, sky, fog * .5), .12);
  }
}

// The bare rock of a small distant island: shaded body, streaks, strata and a rim of light.
export function paintRock(c, rnd, K, P, sh, fog) {
  const { x0, w, top } = sh, sky = skyAt(P, top + w * .2), [ax, ay] = awayFrom(K, x0 + w / 2, top, 2.5);
  const g = c.createLinearGradient(0, top, 0, top + sh.depth);
  g.addColorStop(0, rgba(mixc(mixc(P.rock, P.rockLit, .3), sky, fog * .85)));
  g.addColorStop(1, rgba(mixc(P.rock, mixc(sky, P.haze, .4), Math.min(1, fog + .25))));
  c.fillStyle = g;
  c.fill(sh.path);
  c.save();
  c.clip(sh.path);
  for (let i = 0; i < 60; i++) {
    c.fillStyle = rgba(rnd() < .5 ? mixc(P.rockLit, sky, fog) : mixc([0, 0, 0], sky, fog), .14);
    c.beginPath();
    c.ellipse(x0 + rnd() * w, top + rnd() * sh.depth, w * (.006 + rnd() * .01), w * (.02 + rnd() * .05), 0, 0, TAU);
    c.fill();
  }
  for (let k = 0; k < 4; k++) {
    const y0 = top + w * (.05 + k * .07);
    c.beginPath();
    for (let x = x0; x <= x0 + w; x += w / 20) c.lineTo(x, y0 + Math.sin(x * 9 / w + k) * w * .012);
    c.strokeStyle = rgba(mixc(k % 2 ? P.rockLit : [0, 0, 0], sky, fog), .2);
    c.lineWidth = w * .006;
    c.stroke();
  }
  c.restore();
  rimLight(c, r => r.fill(sh.path), ax, ay, mixc(P.rim, sky, fog * .5), .55);
}

export function paintFar(c, K, P) {
  const rnd = seeded(5), { WU, phone } = K;
  paintRange(c, K, P, K.land.near, P.night ? .55 : .64, true, 44);
  paintSpires(c, K, P, K.far.back, FOG_BACK, 7);
  for (let i = 0; i < 7; i++) {
    if (i === 4) {
      paintSpires(c, K, P, K.far.front, FOG_RANGE, 8);
      paintChains(c, K, P);
      paintTowers(c, K, P);
    }
    cloud(c, rnd, K, P, rnd() * WU, 590 + rnd() * 150, 320 + rnd() * 520, 70 + rnd() * 50, 18, .62);
  }
  const isles = phone ? [[.62, 470, 70]] : [[.22, 420, 90]];
  for (const [u, y, w] of isles) farIsle(c, rnd, K, P, WU * u, y, w, .7);
  paintSkyIsles(c, K, P);
}

export function paintMid(c, K, P) {
  const rnd = seeded(9), { WU, HZ, phone, EX } = K;
  for (let i = 0; i < 6; i++) cloud(c, rnd, K, P, rnd() * WU, HZ - 70 - rnd() * 120, 260 + rnd() * 380, 60 + rnd() * 40, 16, .4);
  if (phone) farIsle(c, rnd, K, P, WU * .14, 610, 90, .45);
  paintHills(c, K, P);
  // The back of the cloud sea: a solid floor so nothing behind it shows, then rows of billows.
  const floor = mixc(P.cloudDark, skyAt(P, HZ), .3), g = c.createLinearGradient(0, HZ - 30, 0, HZ + 40);
  g.addColorStop(0, rgba(floor, 0));
  g.addColorStop(1, rgba(floor, 1));
  c.fillStyle = g;
  c.fillRect(-EX, HZ - 30, WU + EX * 2, 1000 + EX * 2 - HZ);
  for (let row = 0; row < 4; row++) seaRow(c, rnd, K, P, HZ + row * 46, 42 + row * 20, .32 - row * .07);
  c.globalCompositeOperation = 'lighter';
  stretchedPuff(c, K.L.x, HZ - 6, 200, 5, .45, 0, P.haze, P.night ? .1 : .22);
  c.globalCompositeOperation = 'source-over';
}

export function paintIsland(c, K, P) {
  const rnd = seeded(31), { s, ix, top, iw, idepth, isle, tree: T } = K;
  const [ax, ay] = awayFrom(K, ix, top + idepth * .4, 5 * s);
  // The spikes hang well below idepth, so washes over the rock must reach the lowest tip.
  const bottom = Math.max(...isle.unders.map(p => p[1])) + 4 * s;

  // Roots hang beneath the rock and end in small lights.
  const roots = new Path2D(), bulbs = [];
  for (let i = 0; i < 18; i++) {
    const u = .12 + rnd() * .76, x = isle.x0 + u * iw, y = isle.underAt(x) - 8 * s;
    const len = (30 + rnd() * 150) * s * (1.1 - Math.abs(u - .52)), sway = (rnd() - .5) * 40 * s;
    taper(x, y, x + sway, y + len * .6, x + sway * .4, y + len, 5 * s, .6 * s, roots);
    bulbs.push([x + sway * .4, y + len]);
  }
  c.fillStyle = rgba(mixc(P.rock, P.leafDark, .5));
  c.fill(roots);

  // Rock body.
  const g = c.createLinearGradient(0, top - 10 * s, 0, top + idepth);
  g.addColorStop(0, rgba(mixc(P.rock, P.rockLit, .35)));
  g.addColorStop(.14, rgba(P.rock));
  g.addColorStop(1, rgba(mixc(P.rock, P.haze, .3)));
  c.fillStyle = g;
  c.fill(isle.path);
  c.save();
  c.clip(isle.path);
  // Vertical brush strokes for weathered stone.
  for (let i = 0; i < 520; i++) {
    const x = isle.x0 + rnd() * iw, y = top + rnd() * idepth, light = rnd() < .5;
    c.fillStyle = rgba(light ? mixc(P.rock, P.rockLit, .3 + rnd() * .3) : mixc(P.rock, [0, 0, 0], .4), .12);
    c.beginPath();
    c.ellipse(x, y, (2 + rnd() * 5) * s, (8 + rnd() * 22) * s, (rnd() - .5) * .3, 0, TAU);
    c.fill();
  }
  // Strata.
  for (let k = 0; k < 8; k++) {
    const y0 = top + (22 + k * 26) * s, ph = rnd() * 6;
    c.beginPath();
    for (let x = isle.x0; x <= isle.x0 + iw; x += 8 * s) c.lineTo(x, y0 + Math.sin(x * .02 / s + ph) * 5 * s + Math.sin(x * .07 / s + ph) * 1.5 * s);
    c.strokeStyle = rgba(k % 2 ? P.rockLit : [0, 0, 0], k % 2 ? .1 : .16);
    c.lineWidth = (1.5 + rnd() * 2) * s;
    c.stroke();
  }
  // Soft ridges running down the hanging rock toward its points: a shadowed groove beside a lit edge on the side facing the light.
  const side = Math.sign(K.L.x - ix) || 1;
  c.filter = `blur(${(2.5 * s * c.getTransform().a).toFixed(1)}px)`;
  for (let i = 0; i < 24; i++) {
    const u = .08 + rnd() * .84, x = isle.x0 + u * iw, yb = isle.underAt(x) - 6 * s, y0 = top + (30 + rnd() * 50) * s;
    if (yb - y0 < 50 * s) continue;
    const x1 = lerp(x, ix, .12 + rnd() * .1), bend = (rnd() - .5) * 30 * s, wd = (5 + rnd() * 7) * s;
    for (const [dx, col, a] of [[0, [0, 0, 0], .16], [side * wd * .8, P.rockLit, P.night ? .1 : .13]]) {
      c.beginPath();
      c.moveTo(x + dx, y0);
      c.quadraticCurveTo(x + bend + dx, (y0 + yb) / 2, x1 + dx * .5, yb);
      c.strokeStyle = rgba(col, a);
      c.lineWidth = wd;
      c.lineCap = 'round';
      c.stroke();
    }
  }
  c.filter = 'none';
  const fx = c.createLinearGradient(isle.x0, 0, isle.x0 + iw, 0), lean = clamp((K.L.x - ix) / iw, -.3, .3);
  fx.addColorStop(0, 'rgba(0,0,0,.4)');
  fx.addColorStop(clamp(.35 + lean, .05, .95), 'rgba(0,0,0,0)');
  fx.addColorStop(clamp(.65 + lean, .05, .95), 'rgba(0,0,0,0)');
  fx.addColorStop(1, 'rgba(0,0,0,.4)');
  c.fillStyle = fx;
  c.fillRect(isle.x0, top - 20 * s, iw, bottom - top + 20 * s);
  // Light falling on the side that faces the sun or moon, and shade under the overhanging turf.
  puff(c, ix - ax * 60, top + idepth * .2 - ay * 40, iw * .55, P.rockLit, .26);
  const sh = c.createLinearGradient(0, top, 0, top + 46 * s);
  sh.addColorStop(0, 'rgba(0,0,0,.35)');
  sh.addColorStop(1, 'rgba(0,0,0,0)');
  c.fillStyle = sh;
  c.fillRect(isle.x0, top - 20 * s, iw, 70 * s);
  // Crystal veins.
  c.globalCompositeOperation = 'lighter';
  for (let v = 0; v < 5; v++) {
    let x = isle.x0 + iw * (.2 + rnd() * .6), y = top + (40 + rnd() * 60) * s;
    c.beginPath();
    c.moveTo(x, y);
    for (let k = 0; k < 7; k++) {
      x += (rnd() - .5) * 26 * s;
      y += (8 + rnd() * 16) * s;
      c.lineTo(x, y);
      if (rnd() < .4) puff(c, x, y, 16 * s, P.glow, P.night ? .3 : .16);
    }
    c.strokeStyle = rgba(P.glow, P.night ? .55 : .3);
    c.lineWidth = 1.3 * s;
    c.stroke();
  }
  c.globalCompositeOperation = 'source-over';
  // The lower rock fades into the air.
  const hz = c.createLinearGradient(0, top + idepth * .25, 0, top + idepth);
  hz.addColorStop(0, rgba(P.haze, 0));
  hz.addColorStop(1, rgba(P.haze, P.night ? .3 : .42));
  c.fillStyle = hz;
  c.fillRect(isle.x0, top, iw, bottom - top);
  c.restore();
  rimLight(c, r => r.fill(isle.path), ax, ay, P.rim, .8, 1.2);

  c.globalCompositeOperation = 'lighter';
  for (const [x, y] of bulbs) {
    puff(c, x, y, 12 * s, P.glow, .45);
    puff(c, x, y, 3 * s, P.light, .9);
  }
  c.globalCompositeOperation = 'source-over';

  // Turf along the lip, with moss spilling over the edges.
  const turf = new Path2D();
  for (let i = 0; i < 260; i++) {
    const x = isle.x0 + rnd() * iw, y = isle.topAt(x) + rnd() * 8 * s;
    ell(turf, x, y, (4 + rnd() * 6) * s, (2.5 + rnd() * 3) * s, rnd() * TAU);
  }
  for (let i = 0; i < 26; i++) {
    const u = rnd() < .5 ? rnd() * .14 : 1 - rnd() * .14, x = isle.x0 + u * iw, y = isle.topAt(x);
    taper(x, y, x + (rnd() - .5) * 6 * s, y + 18 * s, x + (rnd() - .5) * 8 * s, y + (16 + rnd() * 40) * s, 4 * s, .5 * s, turf);
  }
  c.fillStyle = rgba(P.leafDark);
  c.fill(turf);
  rimLight(c, r => r.fill(turf), ax * .5, ay * .5 + 2 * s, P.leafLit, .5);
  paintMeadow(c, K, P, ax, ay);

  paintRuins(c, rnd, K, P, ax, ay);
  paintPedestal(c, K, P, ax, ay);

  // The tree: flared roots over the turf, then trunk and limbs.
  const wood = T.limbs;
  for (let i = 0; i < 6; i++) {
    const dir = i < 3 ? -1 : 1, len = (30 + rnd() * 50) * s;
    taper(T.x, T.y + 4 * s, T.x + dir * len * .5, T.y + 2 * s, T.x + dir * len, isle.topAt(T.x + dir * len) + 4 * s, 16 * s, 1.5 * s, wood);
  }
  c.fillStyle = rgba(mixc(P.leafDark, P.rock, .45));
  c.fill(wood);
  rimLight(c, r => r.fill(wood), ax * .7, ay * .7, P.rim, .9, 1);

  paintCanopy(c, rnd, K, P);
  grain(c, .035);
}

function paintCanopy(c, rnd, K, P) {
  const { s, tree: T, L } = K;
  const clusters = T.tips.map(([x, y, d]) => [x + (rnd() - .5) * 10 * s, y - 8 * s, (24 + rnd() * 20) * s * (d ? 1.2 : 1)]);
  clusters.sort((a, b) => a[1] - b[1]);
  const glints = [];
  for (const [cx, cy, R] of clusters) {
    let lx = L.x - cx, ly = L.y - cy;
    const ld = Math.hypot(lx, ly) || 1, prox = clamp(1 - ld / (320 * s), 0, 1);
    lx /= ld;
    ly /= ld;
    puff(c, cx, cy + R * .1, R * 1.05, P.leafDark, .9);
    const dabs = [];
    for (let i = 0; i < 90; i++) {
      const a = rnd() * TAU, rr = R * Math.sqrt(rnd()), nx = Math.cos(a) * rr / R, ny = Math.sin(a) * rr / R, edge = nx * nx + ny * ny;
      const facing = nx * lx + ny * ly;
      const lit = P.night
        ? clamp(.08 + .46 * facing - .12 * ny, 0, 1)
        : clamp(.2 + .45 * facing + .6 * edge * Math.max(.25, facing) * (.4 + prox) - .15 * ny + prox * .2, 0, 1);
      dabs.push([cx + nx * R, cy + ny * R * .85, lit, rnd()]);
    }
    dabs.sort((a, b) => a[2] - b[2]);
    for (const [x, y, lit, r] of dabs) {
      const col = lit < .5 ? mixc(P.leafDark, P.leafMid, lit * 2) : mixc(P.leafMid, P.leafLit, (lit - .5) * 2);
      const glow = P.night && r < .012;
      c.fillStyle = rgba(glow ? mixc(P.leafLit, [255, 255, 255], .3) : col, .94);
      c.beginPath();
      c.ellipse(x, y, (4 + r * 5) * s, (2.2 + r * 2) * s, r * 7, 0, TAU);
      c.fill();
      if (glow || !P.night && lit > .85 && r < .25) glints.push([x, y, glow]);
    }
  }
  // Lantern strands hanging from the crown.
  const strands = [];
  for (let i = 0; i < 12; i++) {
    const [cx, cy, R] = clusters[Math.floor(rnd() * clusters.length)];
    const x = cx + (rnd() - .5) * R, y = cy + R * .6, len = (24 + rnd() * 90) * s;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + 4 * s, y + len * .5, x + (rnd() - .5) * 6 * s, y + len);
    c.strokeStyle = rgba(P.leafDark, .9);
    c.lineWidth = 1 * s;
    c.stroke();
    for (let b = 1; b <= 3; b++) if (rnd() < .8) strands.push([x + (rnd() - .5) * 3 * s, y + len * b / 3]);
  }
  c.globalCompositeOperation = 'lighter';
  for (const [x, y, glow] of glints) puff(c, x, y, (glow ? 9 : 7) * s, glow ? P.glow : P.leafLit, glow ? .32 : .22);
  for (const [x, y] of strands) {
    puff(c, x, y, 9 * s, P.glow, .5);
    puff(c, x, y, 2 * s, P.light, .95);
  }
  c.globalCompositeOperation = 'source-over';
}

function paintRuins(c, rnd, K, P, ax, ay) {
  const { s, ix, isle } = K, p = new Path2D(), base = x => isle.topAt(x) + 4 * s;
  const pillar = (x, h, w) => {
    const y = base(x);
    p.rect(x - w / 2, y - h, w, h);
    p.rect(x - w * .7, y - h - 5 * s, w * 1.4, 5 * s);
  };
  const { x1, x2, pw, mx, my, rr } = K.arch;
  pillar(x1, 104 * s, pw);
  pillar(x2, 104 * s, pw);
  // Arch over the two standing pillars.
  p.moveTo(mx + rr, my);
  p.arc(mx, my, rr, 0, Math.PI, true);
  p.lineTo(mx - rr + 11 * s, my);
  p.arc(mx, my, rr - 11 * s, Math.PI, 0, false);
  p.closePath();
  // A broken pillar and a fallen drum.
  const x3 = ix - 186 * s, y3 = base(x3);
  p.moveTo(x3 - 7 * s, y3);
  p.lineTo(x3 - 7 * s, y3 - 52 * s);
  p.lineTo(x3 - 1 * s, y3 - 60 * s);
  p.lineTo(x3 + 3 * s, y3 - 50 * s);
  p.lineTo(x3 + 7 * s, y3 - 56 * s);
  p.lineTo(x3 + 7 * s, y3);
  p.closePath();
  ell(p, x3 + 30 * s, base(x3 + 30 * s) - 6 * s, 14 * s, 7 * s, .1);
  c.fillStyle = rgba(mixc(P.stone, P.rock, .55));
  c.fill(p);
  c.save();
  c.clip(p);
  for (let i = 0; i < 40; i++) {
    const y = my - 60 * s + rnd() * 200 * s;
    c.fillStyle = rgba([0, 0, 0], .18);
    c.fillRect(x1 - 30 * s, y, 160 * s, .8 * s);
  }
  c.restore();
  rimLight(c, r => r.fill(p), ax * .6, ay * .6, P.rim, .85, 1);
  // Moss on the stones.
  const moss = new Path2D();
  for (let i = 0; i < 70; i++) {
    const x = lerp(x1 - 20 * s, x3 + 10 * s, rnd()), y = rnd() < .5 ? my - rr * Math.sqrt(Math.max(0, 1 - ((x - mx) / rr) ** 2)) : base(x) - rnd() * 20 * s;
    if (x < x1 - rr || x > x3 + 40 * s) continue;
    ell(moss, x, y, (3 + rnd() * 4) * s, (1.5 + rnd() * 2) * s, rnd() * 3);
  }
  c.fillStyle = rgba(P.leafMid, .9);
  c.fill(moss);
}

function paintPedestal(c, K, P, ax, ay) {
  const { s, arm } = K, p = new Path2D(), b = arm.base + 3 * s;
  p.rect(arm.x - 20 * s, b - 7 * s, 40 * s, 7 * s);
  p.rect(arm.x - 14 * s, b - 13 * s, 28 * s, 6 * s);
  p.moveTo(arm.x - 4 * s, b - 13 * s);
  p.lineTo(arm.x - 3 * s, arm.y + arm.r * 1.05);
  p.lineTo(arm.x + 3 * s, arm.y + arm.r * 1.05);
  p.lineTo(arm.x + 4 * s, b - 13 * s);
  p.closePath();
  ell(p, arm.x, arm.y + arm.r * 1.05, 9 * s, 3 * s, 0);
  c.fillStyle = rgba(mixc(P.stone, P.rock, .5));
  c.fill(p);
  rimLight(c, r => r.fill(p), ax * .6, ay * .6, P.rim, .85, 1);
}

// The near cloud sea and the light shafts in front of everything but the foreground.
export function paintFront(c, K, P) {
  const rnd = seeded(13), { L, phone, ix, iw, top, idepth } = K;
  for (let i = 0; i < 4; i++) {
    stretchedPuff(c, ix + (rnd() - .5) * iw, top + idepth * (.7 + rnd() * .4), 90, 3, .5, 0, P.haze, .1);
  }
  seaRow(c, rnd, K, P, phone ? 990 : 985, 100, .06);
  seaRow(c, rnd, K, P, 1055, 150, 0);
  c.globalCompositeOperation = 'lighter';
  const n = P.night ? 7 : 12;
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (.1 + .8 * (i + rnd() * .8) / n), w = .02 + rnd() * .045, len = 900 + rnd() * 600;
    const al = (P.night ? .035 : .085) * (.4 + rnd() * .6);
    const g = c.createLinearGradient(L.x, L.y, L.x + Math.cos(a) * len, L.y + Math.sin(a) * len);
    g.addColorStop(0, rgba(P.light, al));
    g.addColorStop(.3, rgba(P.light, al * .75));
    g.addColorStop(1, rgba(P.light, 0));
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(L.x, L.y);
    c.lineTo(L.x + Math.cos(a - w) * len, L.y + Math.sin(a - w) * len);
    c.lineTo(L.x + Math.cos(a + w) * len, L.y + Math.sin(a + w) * len);
    c.fill();
  }
  c.globalCompositeOperation = 'source-over';
}

// A fern frond: an arching stalk with swept leaflets that shrink toward the tip.
function frond(p, rnd, x, y, ang, len, f) {
  const n = 22, side = Math.cos(ang) >= 0 ? 1 : -1, droop = .25 + rnd() * .4, pts = [];
  let a = ang;
  for (let i = 0; i <= n; i++) {
    pts.push([x, y, a]);
    x += Math.cos(a) * len / n;
    y += Math.sin(a) * len / n;
    a += droop * .06 * side;
  }
  for (let i = 0; i < n; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
    taper(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2, x1, y1, lerp(8, 1.5, i / n) * f, lerp(8, 1.5, (i + 1) / n) * f, p);
  }
  for (let i = 2; i <= n; i++) {
    const [px, py, pa] = pts[i], t = i / n, ll = 52 * f * Math.sin(Math.PI * Math.pow(t, .55)) * (.85 + rnd() * .3);
    for (const sd of [-1, 1]) {
      const la = pa + sd * (1.05 - t * .3);
      ell(p, px + Math.cos(la) * ll * .5, py + Math.sin(la) * ll * .5, ll * .5, ll * .13, la);
    }
  }
}

function vine(p, rnd, x, y, len, f) {
  const n = 18, ph = rnd() * 6;
  let px = x, py = y;
  for (let i = 0; i < n; i++) {
    const t = i / n, nx = x + Math.sin(t * 3 + ph) * 14 * f * t, ny = y + len * (i + 1) / n;
    taper(px, py, (px + nx) / 2, (py + ny) / 2, nx, ny, lerp(5, 1.5, t) * f, lerp(5, 1.5, t + 1 / n) * f, p);
    if (i % 2 === 0) {
      const sd = i % 4 ? 1 : -1, la = Math.PI / 2 - sd * (.9 + rnd() * .4), ll = (18 + rnd() * 10) * f * (1 - t * .4);
      ell(p, nx + Math.cos(la) * ll * .5, ny + Math.sin(la) * ll * .5, ll * .5, ll * .24, la);
    }
    px = nx;
    py = ny;
  }
}

// Dark, softly focused silhouettes framing the scene, like plants right in front of the camera.
export function paintFg(c, K, P) {
  const rnd = seeded(21), { WU, EX, phone } = K, f = phone ? .62 : clamp(WU / 1700, .8, 1.15), p = new Path2D();
  const by = 1000 + EX * .6;
  // We stand on an island too: its mossy lip fills the bottom corners, with grass along the edge and roots hanging off
  // it, and a bough reaches in over the top right, so everything framing the view grows from somewhere.
  const lips = [[-EX - 20, phone ? 845 : 785, 1], [WU + EX + 20, phone ? 830 : 765, -1]];
  for (const [x0, y0, sd] of lips) {
    const pts = [[x0, y0], [x0 + sd * 150 * f, y0 + 10 * f], [x0 + sd * 270 * f, y0 + 45 * f], [x0 + sd * 350 * f, y0 + 120 * f], [x0 + sd * 380 * f, 1000 + EX + 20], [x0, 1000 + EX + 20]];
    smoothPath(pts, true, p);
    const on = (k, t) => [lerp(pts[k][0], pts[k + 1][0], t), lerp(pts[k][1], pts[k + 1][1], t) + 5 * f];
    for (let i = 0; i < 30; i++) {
      const [x, y] = on(Math.floor(rnd() * 3), rnd()), h = (10 + rnd() * 24) * f;
      taper(x, y, x + sd * h * .1, y - h * .6, x + sd * (rnd() - .3) * h * .6, y - h, 3 * f, 0, p);
    }
    for (let i = 0; i < 6; i++) {
      const [x, y] = on(2 + Math.floor(rnd() * 2), .3 + rnd() * .5), len = (30 + rnd() * 60) * f;
      taper(x, y, x + sd * 8 * f, y + len * .5, x + sd * (rnd() - .2) * 16 * f, y + len, 4 * f, 0, p);
    }
  }
  taper(WU + EX + 10, 70 * f, WU * .9, 46 * f, WU * .76, -EX, 30 * f, 8 * f, p);
  for (let i = 0; i < 10; i++) frond(p, rnd, -40 * f + rnd() * 80 * f, by, -Math.PI * (.58 - i * .04 + (rnd() - .5) * .04), (300 + rnd() * 240) * f, f);
  for (let i = 0; i < 7; i++) vine(p, rnd, WU * (phone ? .74 : .8) + i * 34 * f + rnd() * 20, -EX, (130 + rnd() * 260) * f, f);
  for (let i = 0; i < 30; i++) {
    const r = (24 + rnd() * 40) * f;
    ell(p, WU + EX - rnd() * 260 * f, -EX + rnd() * 120 * f, r, r * .5, rnd() * TAU);
  }
  for (let i = 0; i < 12; i++) {
    const x = WU + EX - rnd() * 300 * f, h = (110 + rnd() * 220) * f, lean = (rnd() - .7) * 90 * f;
    taper(x, by, x + lean * .3, by - h * .6, x + lean, by - h, 11 * f, 0, p);
  }
  c.fillStyle = rgba(P.fg);
  c.fill(p);
  const [ax, ay] = awayFrom(K, WU / 2, 700, 4 * f);
  rimLight(c, r => r.fill(p), ax, ay, P.rim, P.night ? .4 : .55, 2);
  paintNear(c, K, P);
}

// The far gate: a broken stone ring standing in the cloud sea on the horizon, carved with runes.
function buildGate(K) {
  const rnd = seeded(41), { WU, HZ, phone, s } = K, R = (phone ? 140 : 200) * Math.max(s, .64);
  const runes = [];
  for (let i = 0; i < 26; i++) {
    const strokes = [];
    for (let k = 0; k < 3; k++) strokes.push([(rnd() - .5) * 2, (rnd() - .5) * 2, (rnd() - .5) * 2, (rnd() - .5) * 2]);
    runes.push({ a: -Math.PI + (i + .5) * (TAU / 26), strokes });
  }
  // One block has come loose and hangs a little way out from the gap it left.
  K.gate = { x: WU * (phone ? .3 : .43), y: HZ - R * .5, R, band: R * .17, runes, gap: -2.25, gapW: .2 };
}

// Painted once per theme into its own canvas, so the animated layer only has to stamp it and light the runes.
export function paintGate(K, P, scale) {
  const G = K.gate, { R, band } = G, size = R * 2.7, cv = G.cv || makeCanvas();
  cv.width = cv.height = Math.ceil(size * scale);
  const c = cv.getContext('2d'), fog = .52, sky = skyAt(P, G.y - R * .6);
  c.setTransform(scale, 0, 0, scale, (size / 2) * scale, (size / 2) * scale);
  const stone = mixc(mixc(P.stone, P.rock, .45), sky, fog), dark = mixc(mixc(P.rock, [0, 0, 0], .3), sky, fog);
  const ring = new Path2D(), r0 = R - band, a0 = G.gap - G.gapW / 2, a1 = G.gap + G.gapW / 2;
  ring.arc(0, 0, R, a1, a0 + TAU);
  ring.arc(0, 0, r0, a0 + TAU, a1, true);
  ring.closePath();
  const block = new Path2D(), lift = band * .9, bc = G.gap + .02;
  const bx = Math.cos(bc) * lift, by = Math.sin(bc) * lift;
  block.arc(0, 0, R - band * .05, a0 + .02, a1 - .05);
  block.arc(0, 0, r0 + band * .1, a1 - .05, a0 + .02, true);
  block.closePath();
  const g = c.createLinearGradient(0, -R, 0, R);
  g.addColorStop(0, rgba(mixc(stone, P.rockLit, .25)));
  g.addColorStop(1, rgba(dark));
  c.fillStyle = g;
  c.fill(ring);
  // Seams between the blocks, and the carved rune channel.
  c.save();
  c.clip(ring);
  c.strokeStyle = rgba(dark, .9);
  c.lineWidth = 1.6;
  for (let i = 0; i < 26; i++) {
    const a = -Math.PI + i * (TAU / 26);
    c.beginPath();
    c.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
    c.lineTo(Math.cos(a) * R, Math.sin(a) * R);
    c.stroke();
  }
  for (const rr of [r0 + band * .22, R - band * .22]) {
    c.beginPath();
    c.arc(0, 0, rr, 0, TAU);
    c.strokeStyle = rgba(dark, .5);
    c.lineWidth = 1.2;
    c.stroke();
  }
  c.restore();
  const [ax, ay] = awayFrom(K, G.x, G.y - R, 3);
  rimLight(c, r => r.fill(ring), ax, ay, mixc(P.rim, sky, .35), .7);
  // The loose block gets its own sprite so the calling can slide it back into the gap.
  // Cropped tight around the block, since it is drawn every frame.
  const bm = R - band / 2, bcx = Math.cos(G.gap) * bm, bcy = Math.sin(G.gap) * bm, bh = band + (R * G.gapW) / 2 + 8;
  const bcv = G.bcv || makeCanvas();
  bcv.width = bcv.height = Math.ceil(bh * 2 * scale);
  const bctx = bcv.getContext('2d');
  bctx.setTransform(scale, 0, 0, scale, (bh - bcx) * scale, (bh - bcy) * scale);
  bctx.fillStyle = g;
  bctx.fill(block);
  rimLight(bctx, r => r.fill(block), ax, ay, mixc(P.rim, sky, .35), .7);
  G.bcv = bcv;
  G.lift = [bx, by];
  G.blk = [bcx, bcy, bh];
  // Moss on the crown and a few long strands hanging inside the ring.
  const moss = new Path2D(), rnd = seeded(43);
  for (let i = 0; i < 60; i++) {
    const a = -Math.PI * (.12 + rnd() * .76), rr = R - rnd() * band * .3;
    if (Math.abs(a - G.gap) < G.gapW) continue;
    ell(moss, Math.cos(a) * rr, Math.sin(a) * rr - 1, 3 + rnd() * 5, 1.6 + rnd() * 2, a + Math.PI / 2);
  }
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * (.25 + rnd() * .5), x = Math.cos(a) * r0, y = Math.sin(a) * r0, len = 30 + rnd() * 90;
    taper(x, y, x + (rnd() - .5) * 10, y + len * .5, x + (rnd() - .5) * 14, y + len, 3, .4, moss);
  }
  c.fillStyle = rgba(mixc(P.leafDark, sky, fog * .8));
  c.fill(moss);
  G.cv = cv;
  G.size = size;
}
