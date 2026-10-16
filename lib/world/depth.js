// Depth on both sides of the island. Behind it: two ranges of stone spires, a ringed giant in the sky, signal fires,
// sky lanterns, meteors and a leviathan far out in the haze. In front of it: out-of-focus leaves, spores, bokeh and glow vines.

import { TAU, awayFrom, blit, clamp, dab, ell, lerp, makeCanvas, mixc, puff, rgba, rimLight, seeded, skyAt, smoothPath, sprite, taper } from './core';
import { D_FRONT, mistSprite, pulseAt } from './life';
import { LAMP, PLASTER, ROOFS, WOOD, buildWhimsy, drawWhimsy, farTint } from './whimsy';
import { ease } from './story';

export const D_FAR = .1;
export const FOG_BACK = .84, FOG_RANGE = .64;
export const FIRE = [255, 178, 96], FIRE_CORE = [255, 236, 200];

// A stone spire rising out of the cloud sea, flaring into a cap with a tuft of trees on top. Most are capped; cap forces it.
export function spire(rnd, x, top, w, cap = false) {
  const L = [], R = [], n = 14, lean = (rnd() - .5) * w * 1.2, capped = rnd() < .7 || cap;
  for (let i = 0; i <= n; i++) {
    const t = i / n, y = lerp(900, top, t), cap = capped && t > .82 ? Math.sin((t - .82) / .18 * Math.PI / 2) * .24 : 0;
    // Weathered ledges: now and then a band sticks out on one side.
    const ledge = rnd() < .25 ? w * (.1 + rnd() * .14) : 0, side = rnd() < .5;
    const hw = w * (.66 - .36 * t + cap) * (.92 + rnd() * .16), cx = x + lean * t * t;
    L.push([cx - hw - (side ? ledge : 0), y]);
    R.push([cx + hw + (side ? 0 : ledge), y]);
  }
  const tx = x + lean, top2 = capped ? [[tx - w * .12, top - w * .05], [tx + w * .14, top - w * .02]] : [[tx - w * .05, top - w * .3], [tx + w * .08, top - w * .08]];
  const path = smoothPath([...L, ...top2, ...R.reverse()]);
  const tuft = new Path2D(), tw = Math.min(w, 40);
  if (capped) for (let k = 0; k < 7; k++) ell(tuft, tx + (rnd() - .5) * w * .8, top - tw * (.04 + rnd() * .16), tw * (.09 + rnd() * .08), tw * (.06 + rnd() * .04), rnd() * 3);
  return { x: tx, top: top - (capped ? 0 : w * .3), w, path, tuft, capped };
}

export function buildFar(K) {
  const rnd = seeded(31), { WU, phone, s } = K, wh = buildWhimsy(K);
  const range = (n, lo, hi, w0, w1) => Array.from({ length: n }, (_, i) => {
    const u = (i + .15 + rnd() * .7) / n, wide = rnd() < .2 ? 1.7 : 1;
    // Keep the spires low behind the headline so the copy stays calm.
    const top = phone ? lerp(lo, hi, rnd()) : u < .42 ? 560 + rnd() * 80 : lerp(lo, hi, rnd());
    return spire(rnd, WU * u, top, lerp(w0, w1, rnd()) * wide * Math.max(s, .6));
  });
  // Plain spires give way to the landmarks, which stand on spires of their own.
  const clear = p => !wh.clear.some(([x, r]) => Math.abs(p.x - x) < r);
  const back = (phone ? range(6, 500, 620, 20, 32) : range(11, 290, 500, 22, 40)).filter(clear);
  const front = (phone ? range(4, 540, 640, 30, 46) : range(6, 340, 540, 34, 58)).filter(clear);
  front.push(...wh.spires);
  const lit = front.filter(p => p.capped && !p.mark && (phone || p.x > WU * .42));
  // On a phone the far spires stand clear of the island, so every other capped one carries a fire. On a wider screen
  // the island and its tree hide most of them, so the fires get spires of their own in the gaps: beside the
  // stackhouses, either side of the trunk under the canopy, and out past the mill.
  let towers;
  if (phone) towers = [...back, ...front].filter(p => p.capped && !p.mark).sort((a, b) => a.x - b.x).filter((_, i) => i % 2 === 0);
  else {
    const fr = seeded(37), T = K.tree, up = (x, h) => K.isle.topAt(x) - h * s;
    towers = [[WU * .395, 480], [(wh.stack.hit[0] + K.arch.x1) / 2, up(K.arch.x1, 95)], [T.x - 95 * s, up(T.x - 95 * s, 125)],
      [T.x + 240 * s, up(T.x + 240 * s, 50)], [WU * .935, 400]].map(([x, top]) => spire(fr, x, top, 30 * s, true));
    front.push(...towers);
  }
  const beacons = towers.map(p => ({ x: p.x + p.w * .05, y: p.top - Math.min(p.w, 40) * .12, e: { hit: 0 } }));
  const chains = [];
  for (let i = 1; i < lit.length; i++) {
    const a = lit[i - 1], b = lit[i];
    if (b.x - a.x < 320) chains.push([a.x + a.w * .3, a.top + a.w * .5, b.x - b.w * .3, b.top + b.w * .5]);
  }
  // The leviathan swims between the two ranges, so the nearer spires cut it off.
  const clip = new Path2D();
  clip.rect(-K.EX, -K.EX, WU + K.EX * 2, 1000 + K.EX * 2);
  for (const p of front) clip.addPath(p.path);
  K.far = {
    back, front, beacons, chains, clip,
    giant: phone ? { x: WU * .86, y: 515, r: 28 } : { x: WU * .23, y: 118, r: 64 * clamp(s, .85, 1.1) },
  };
}

export function paintSpires(c, K, P, list, haze, seed) {
  // Night haze is thinner, so the spires still read against the dark sky.
  const rnd = seeded(seed), sky = y => skyAt(P, y), fog = P.night ? haze * .8 : haze;
  const g = c.createLinearGradient(0, 280, 0, 900);
  g.addColorStop(0, rgba(mixc(mixc(P.rock, P.rockLit, .3), sky(320), fog)));
  g.addColorStop(.55, rgba(mixc(P.rock, sky(620), Math.min(1, fog + .06))));
  g.addColorStop(.85, rgba(mixc(P.haze, sky(780), .6), .7));
  g.addColorStop(1, rgba(mixc(P.haze, sky(840), .6), 0));
  // Spires on each side of the light are rim-lit from opposite sides, so they are grouped by side.
  for (const side of [-1, 1]) {
    const group = list.filter(p => (p.x < K.L.x ? -1 : 1) === side);
    if (!group.length) continue;
    const body = new Path2D(), tuft = new Path2D();
    for (const p of group) {
      body.addPath(p.path);
      tuft.addPath(p.tuft);
      if (p.capped && !p.mark) woods(tuft, seeded(seed * 100 + Math.round(p.x)), p);
    }
    c.fillStyle = g;
    c.fill(body);
    c.save();
    c.clip(body);
    c.lineWidth = 1.4;
    for (const p of group) for (let k = 0; k < 5; k++) {
      const x = p.x + (rnd() - .5) * p.w * .8, y = p.top + rnd() * 60;
      c.strokeStyle = rgba(mixc(k % 2 ? P.rockLit : [0, 0, 0], sky(y), fog), .2);
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + (rnd() - .5) * 6, y + 80 + rnd() * 200);
      c.stroke();
    }
    c.restore();
    const ax = -side * 2.5, ay = K.L.y < 300 ? 1.5 : 0;
    rimLight(c, r => r.fill(body), ax, ay, mixc(P.rim, sky(400), fog * .6), (P.night ? .75 : .6) * (1.4 - fog));
    c.fillStyle = rgba(mixc(P.leafDark, sky(400), fog));
    c.fill(tuft);
    rimLight(c, r => r.fill(tuft), ax, ay, mixc(P.leafLit, sky(400), fog * .5), .45);
  }
}

// A little wood on a spire's cap: firs and round crowns along the top, and moss hanging off the rim.
function woods(path, rnd, p) {
  const tw = Math.min(p.w, 40), half = p.w * .5;
  for (let k = 0, n = 3 + Math.round(p.w / 9); k < n; k++) {
    const x = p.x + (rnd() - .5) * half * 1.7, y = p.top + Math.abs(x - p.x) * .12 + tw * .02, h = tw * (.22 + rnd() * .3);
    if (rnd() < .6) {
      path.moveTo(x, y - h);
      path.lineTo(x + h * .26, y);
      path.lineTo(x - h * .26, y);
      path.closePath();
    } else ell(path, x, y - h * .35, h * .3, h * .3, 0);
  }
  for (let k = 0, n = 2 + Math.round(p.w / 14); k < n; k++) {
    const sd = rnd() < .5 ? -1 : 1, x = p.x + sd * half * (.7 + rnd() * .35), y = p.top + tw * .1, len = tw * (.4 + rnd() * 1.2);
    taper(x, y, x + sd * 2, y + len * .5, x + sd * 1, y + len, tw * .05, tw * .01, path);
  }
}

// Rope bridges between neighbouring spires, each with a few lanterns.
export function paintChains(c, K, P) {
  c.strokeStyle = rgba(mixc(P.rock, skyAt(P, 450), FOG_RANGE - .08));
  c.lineWidth = 1.6;
  for (const [x0, y0, x1, y1] of K.far.chains) {
    const cx = (x0 + x1) / 2, cy = Math.max(y0, y1) + 70;
    c.beginPath();
    c.moveTo(x0, y0);
    c.quadraticCurveTo(cx, cy, x1, y1);
    c.stroke();
    c.globalCompositeOperation = 'lighter';
    for (const t of [.3, .55, .8]) {
      const m = 1 - t, x = m * m * x0 + 2 * m * t * cx + t * t * x1, y = m * m * y0 + 2 * m * t * cy + t * t * y1 + 4;
      puff(c, x, y, 7, FIRE, .45);
    }
    c.globalCompositeOperation = 'source-over';
  }
}

// A ringed world hanging in the high sky, washed into the haze. The back of the ring is drawn before the planet, the front after.
export function paintGiant(c, K, P) {
  const { x, y, r } = K.far.giant, sky = skyAt(P, y), fog = P.night ? .68 : .6, tilt = -.3;
  const ringCol = mixc(P.night ? [200, 214, 226] : [255, 232, 200], sky, fog);
  const ring = front => {
    c.save();
    c.translate(x, y);
    c.rotate(tilt);
    c.beginPath();
    c.rect(-r * 3, front ? 0 : -r * 3, r * 6, r * 3);
    c.clip();
    for (const [k, w, a] of [[1.5, .08, .3], [1.72, .16, .45], [2.05, .1, .28]]) {
      c.beginPath();
      c.ellipse(0, 0, r * k, r * k * .2, 0, 0, TAU);
      c.lineWidth = r * w;
      c.strokeStyle = rgba(ringCol, a * (P.night ? .6 : 1));
      c.stroke();
    }
    c.restore();
  };
  ring(false);
  const dx = K.L.x - x, dy = K.L.y - y, d = Math.hypot(dx, dy) || 1, lx = x + dx / d * r * .55, ly = y + dy / d * r * .55;
  const g = c.createRadialGradient(lx, ly, r * .1, lx, ly, r * 1.7);
  g.addColorStop(0, rgba(mixc(P.night ? [190, 210, 222] : [255, 222, 186], sky, fog)));
  g.addColorStop(1, rgba(mixc(P.night ? [14, 26, 44] : [70, 96, 108], sky, Math.min(1, fog + .15))));
  c.save();
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fillStyle = g;
  c.fill();
  c.clip();
  c.translate(x, y);
  c.rotate(tilt);
  for (let i = 0; i < 9; i++) {
    c.fillStyle = rgba(i % 2 ? [0, 0, 0] : ringCol, .07);
    c.beginPath();
    c.ellipse(0, -r + (i + .5) * r * .24, r * 1.2, r * (.04 + (i % 3) * .025), 0, 0, TAU);
    c.fill();
  }
  c.restore();
  c.strokeStyle = rgba(ringCol, .1);
  c.lineWidth = r * .05;
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.stroke();
  ring(true);
}

// The giant's two moons: orbit radius and moon size in giant radii, speed, starting angle, and whether it has a tree.
const MOONS = [[2.6, .2, .05, 0, false], [3.4, .26, -.032, 2.2, true]];

// The high sky moves too: two small moons lapping the ringed giant, and a winged ship crossing far above everything.
// Both are worked out from the clock, plus however far ahead a race has put the moons. Drawn at the sky's depth, so
// they stay with the giant.
export function drawHigh(c, Lf, K, P, t) {
  const H = Lf.hits, { x, y, r } = K.far.giant, tilt = -.3, fog = P.night ? .6 : .55;
  MOONS.forEach(([R, mr, sp, ph, tree], i) => {
    const a = t * sp + ph + Lf.depth.moons.lead[i], lx = Math.cos(a) * r * R, ly = Math.sin(a) * r * R * .3;
    const mx = x + lx * Math.cos(tilt) - ly * Math.sin(tilt), my = y + lx * Math.sin(tilt) + ly * Math.cos(tilt), m = r * mr;
    // On the far half of its lap a moon slips behind the giant.
    c.save();
    if (ly < 0) {
      c.beginPath();
      c.rect(x - r * 5, y - r * 5, r * 10, r * 10);
      c.arc(x, y, r * 1.02, 0, TAU, true);
      c.clip();
    }
    drawMoonlet(c, mx, my, m, tree, K, P, fog);
    c.restore();
    H.push(['moons', mx, my, Math.max(m * 2.2, 14), 0]);
  });
  drawSkyShip(c, Lf, K, P, t, fog);
}

function drawMoonlet(c, x, y, m, tree, K, P, fog) {
  const sky = skyAt(P, y), dx = K.L.x - x, dy = K.L.y - y, d = Math.hypot(dx, dy) || 1;
  const g = c.createRadialGradient(x + dx / d * m * .5, y + dy / d * m * .5, m * .1, x, y, m * 1.2);
  g.addColorStop(0, rgba(mixc(P.night ? [214, 222, 230] : [250, 226, 196], sky, fog)));
  g.addColorStop(1, rgba(mixc(P.night ? [30, 42, 60] : [96, 104, 110], sky, fog)));
  c.fillStyle = g;
  c.beginPath();
  c.arc(x, y, m, 0, TAU);
  c.fill();
  if (!tree) return;
  // One tree, slightly too big for its moon.
  c.fillStyle = rgba(mixc(P.leafDark, sky, fog));
  c.fillRect(x - m * .07, y - m * 1.5, m * .14, m * .6);
  c.beginPath();
  c.ellipse(x, y - m * 1.7, m * .55, m * .4, 0, 0, TAU);
  c.fill();
}

// A little cargo ship with cloth sails and a pair of long insect wings that flap now and then, like it remembered it should.
// It crosses about once every four minutes, and is out of sight for a while between crossings.
function drawSkyShip(c, Lf, K, P, t, fog) {
  const { WU, EX, s } = K, span = WU + EX * 2 + 200, per = 240, u = ((t + Lf.depth.ship) % per) / per * 1.6;
  if (u > 1) return;
  const L = (K.phone ? 36 : 60) * s, x = WU + EX + 100 - u * span, y = (K.phone ? 140 : 240) + Math.sin(t * .4) * 6;
  const sky = skyAt(P, y), col = k => rgba(mixc(k, sky, fog)), flap = Math.max(0, Math.sin(t * 9)) * (Math.sin(t * .7) > .3 ? 1 : .15);
  c.save();
  c.translate(x, y);
  c.rotate(Math.sin(t * .4 + 1) * .03);
  // Wings behind the hull.
  c.fillStyle = rgba(mixc(P.night ? [180, 210, 230] : [236, 240, 236], sky, fog), .45);
  for (const k of [-1, 1]) {
    c.save();
    c.translate(k * L * .1, -L * .02);
    c.rotate(-(.5 + flap * .8) * (k > 0 ? 1 : .8));
    c.beginPath();
    c.ellipse(L * .35, 0, L * .38, L * .07, 0, 0, TAU);
    c.fill();
    c.restore();
  }
  c.fillStyle = col(mixc(WOOD, [0, 0, 0], .2));
  c.beginPath();
  c.moveTo(-L * .55, -L * .06);
  c.quadraticCurveTo(-L * .3, L * .16, L * .3, L * .12);
  c.quadraticCurveTo(L * .5, L * .06, L * .5, -L * .12);
  c.lineTo(L * .35, -L * .02);
  c.closePath();
  c.fill();
  c.fillRect(-L * .02, -L * .62, L * .025, L * .6);
  c.fillStyle = col(PLASTER);
  for (const [sx, sw, sh] of [[-L * .02, -L * .3, L * .5], [L * .02, L * .22, L * .4]]) {
    c.beginPath();
    c.moveTo(sx, -L * .58);
    c.quadraticCurveTo(sx + sw * 1.3, -L * .58 + sh * .5, sx, -L * .58 + sh);
    c.closePath();
    c.fill();
  }
  c.strokeStyle = col(ROOFS[0]);
  c.lineWidth = L * .02;
  c.beginPath();
  c.moveTo(0, -L * .62);
  c.quadraticCurveTo(L * .1, -L * .64 + Math.sin(t * 5) * L * .02, L * .2, -L * .6);
  c.stroke();
  // A lamp on a line under the keel.
  c.strokeStyle = col(WOOD);
  c.lineWidth = L * .01;
  c.beginPath();
  c.moveTo(L * .1, L * .12);
  c.lineTo(L * .12, L * .3);
  c.stroke();
  c.fillStyle = rgba(P.night ? LAMP : mixc(LAMP, sky, .5));
  c.beginPath();
  c.arc(L * .12, L * .33, L * .035, 0, TAU);
  c.fill();
  if (P.night) {
    c.globalCompositeOperation = 'lighter';
    dab(c, sprite(LAMP), L * .12, L * .33, L * .3, .5);
    c.globalCompositeOperation = 'source-over';
  }
  c.restore();
  Lf.hits.push(['skyship', x, y - L * .2, L * .6, 0]);
}

// Out-of-focus plants right in front of the camera, painted on the foreground layer: a broad leaf from base x, y pointing along ang.
function broadLeaf(p, x, y, ang, len, wid) {
  const ux = Math.cos(ang), uy = Math.sin(ang), tx = x + ux * len, ty = y + uy * len;
  let a = [x + ux * len * .45 - uy * wid, y + uy * len * .45 + ux * wid], b = [x + ux * len * .45 + uy * wid, y + uy * len * .45 - ux * wid];
  // Wind every leaf the same way so overlapping leaves union under nonzero fill.
  if ((a[0] - x) * (ty - y) - (a[1] - y) * (tx - x) > 0) [a, b] = [b, a];
  p.moveTo(x, y);
  p.quadraticCurveTo(a[0], a[1], tx, ty);
  p.quadraticCurveTo(b[0], b[1], x, y);
  p.closePath();
}

export function paintNear(c, K, P) {
  const rnd = seeded(41), { WU, EX, phone } = K, f = phone ? .6 : clamp(WU / 1700, .85, 1.2), p = new Path2D(), by = 1000 + EX;
  for (let i = 0; i < 5; i++) broadLeaf(p, WU + EX * .3 - rnd() * 90 * f, by, -Math.PI * (.6 + i * .05 + rnd() * .03), (280 + rnd() * 160) * f, (60 + rnd() * 40) * f);
  for (let i = 0; i < 3; i++) broadLeaf(p, -EX + rnd() * 60 * f, by, -Math.PI * (.2 + i * .07 + rnd() * .03), (240 + rnd() * 120) * f, (50 + rnd() * 30) * f);
  if (!phone) {
    // An overhanging branch across the top-left corner, with leaves hanging from it.
    taper(-EX, 80 * f, 160 * f, 30 * f, 420 * f, -EX, 44 * f, 12 * f, p);
    for (let i = 0; i < 8; i++) {
      const t = .1 + i * .1, m = 1 - t, x = m * m * -EX + 2 * m * t * 160 * f + t * t * 420 * f, y = m * m * 80 * f + 2 * m * t * 30 * f + t * t * -EX;
      broadLeaf(p, x, y, Math.PI * (.5 + (rnd() - .5) * .5), (70 + rnd() * 60) * f, (22 + rnd() * 14) * f);
    }
  }
  const sc = c.getTransform().a;
  c.filter = `blur(${(5 * f * sc).toFixed(1)}px)`;
  c.fillStyle = rgba(P.fg);
  c.fill(p);
  c.filter = 'none';
  const [ax, ay] = awayFrom(K, WU / 2, 600, 5 * f);
  rimLight(c, r => r.fill(p), ax, ay, P.rim, P.night ? .22 : .3, 4 * f * sc);
}

// ---------- Life in the depths ----------

export function makeDepth(K) {
  const rnd = seeded(51), { WU, phone, s, EX } = K, L = (phone ? 520 : 1150) * clamp(s, .8, 1.1);
  return {
    rnd,
    lev: { x: WU * .78, y: phone ? 560 : 300, dir: -1, L, sp: phone ? 14 : 22, wait: 0 },
    relay: { o: 0, t0: 1.5, step: .65 },
    moons: { lead: [0, 0], race: 0, e: { hit: 0 } },
    meteor: { wait: 3, k: -1 },
    ship: 70,
    lanterns: Array.from({ length: phone ? 5 : 10 }, () => ({ x: WU * (phone ? rnd() : .35 + rnd() * .65), y: 200 + rnd() * 500, vy: -5 - rnd() * 5, ph: rnd() * TAU })),
    hazes: Array.from({ length: phone ? 2 : 4 }, (_, i) => ({ x: rnd() * WU, y: (phone ? 640 : 560) + rnd() * 80, w: (phone ? 500 : 820) * (.8 + rnd() * .4), sp: (3 + rnd() * 3) * (i % 2 ? 1 : -1) })),
    spores: Array.from({ length: phone ? 22 : 50 }, () => ({ x: rnd() * WU, y: rnd() * 1000, vx: 0, vy: 0, r: .8 + rnd() * 1.6, ph: rnd() * TAU, hit: 0 })),
    bokeh: Array.from({ length: phone ? 3 : 8 }, () => ({ x: WU * (phone ? rnd() : .45 + rnd() * .55), y: phone ? 520 + rnd() * 480 : rnd() * 1000, R: 22 + rnd() * 40, ph: rnd() * TAU, vx: (rnd() - .5) * 6 })),
    vines: Array.from({ length: phone ? 3 : 6 }, (_, i) => ({
      x: WU * (phone ? .74 : .8) + (17 + i * 34) * (phone ? .62 : clamp(WU / 1700, .8, 1.15)), len: (150 + rnd() * 190) * (phone ? .7 : 1),
      a: 0, av: 0, glow: 0, ph: rnd() * TAU, e: { hit: 0 }, tip: [0, -EX], glows: Array.from({ length: 4 }, () => ({})),
    })),
  };
}

export function updateDepth(Lf, K, dt, ptr, pulses) {
  const F = Lf.depth, t = Lf.t, { WU, EX, phone } = K, rnd = F.rnd;

  // A click on the ringed giant or its moons starts a race: both moons tear round for a few laps, and the one with the
  // tree pulls ahead. `lead` is how far each has got ahead of where the clock alone would put it.
  const Mo = F.moons, G = K.far.giant;
  if (pulseAt(pulses, 0, G.x, G.y, Mo.e)?.[2] < G.r * 3.6) {
    Mo.race = 5;
    Lf.sfx.push(['race', G.x]);
  }
  Mo.race = Math.max(0, Mo.race - dt);
  MOONS.forEach(([, , sp], i) => { Mo.lead[i] += dt * sp * 40 * (i ? 1.3 : 1) * ease(Mo.race / 1.5); });

  const V = F.lev;
  if (V.wait > 0) {
    if ((V.wait -= dt) <= 0) {
      V.dir = -V.dir;
      V.x = V.dir > 0 ? -EX - 20 : WU + EX + 20;
      V.y = (phone ? 540 : 270) + rnd() * 70;
    }
  } else {
    V.x += V.dir * V.sp * dt;
    if (V.dir < 0 ? V.x + V.L < -EX : V.x - V.L > WU + EX) V.wait = 25 + rnd() * 35;
  }

  // Signal fires pass a light from spire to spire. Hovering or pulsing one starts a relay from it.
  const B = K.far.beacons, R = F.relay;
  if (B.length) {
    if (t - R.t0 > 12 && Lf.call.ct < 0) { R.o = R.o === 0 ? B.length - 1 : 0; R.t0 = t; R.step = .65; }
    const pf = ptr(D_FAR);
    if (Lf.hover === 'beacons' && pf && t - R.t0 > 2.5) {
      let bi = 0;
      B.forEach((b, i) => { if (Math.hypot(b.x - pf.x, b.y - pf.y) < Math.hypot(B[bi].x - pf.x, B[bi].y - pf.y)) bi = i; });
      R.o = bi;
      R.t0 = t;
      R.step = .65;
    }
    B.forEach((b, i) => { if (pulseAt(pulses, D_FAR, b.x, b.y, b.e) && t - R.t0 > 1.5) { R.o = i; R.t0 = t; R.step = .65; } });
  }

  const M = F.meteor;
  if (M.k < 0) {
    if ((M.wait -= dt) <= 0) {
      const dir = rnd() < .5 ? -1 : 1, a = .35 + rnd() * .3;
      Object.assign(M, { k: 0, x: WU * (.2 + rnd() * .7), y: 30 + rnd() * 200, dx: Math.cos(a) * dir, dy: Math.sin(a), len: 300 + rnd() * 200 });
    }
  } else if ((M.k += dt / .9) > 1) { M.k = -1; M.wait = 6 + rnd() * 10; }

  for (const l of F.lanterns) {
    l.y += l.vy * dt;
    l.x += Math.sin(t * .4 + l.ph) * 4 * dt;
    if (l.y < 120) { l.y = 640 + rnd() * 80; l.x = WU * (phone ? rnd() : .35 + rnd() * .65); }
  }
  for (const h of F.hazes) {
    h.x += h.sp * dt;
    if (h.x - h.w / 2 > WU + EX) h.x = -EX - h.w / 2;
    if (h.x + h.w / 2 < -EX) h.x = WU + EX + h.w / 2;
  }

  // Spores rise on the warm air and part around the pointer; bokeh drifts slowly.
  const pf = ptr(D_FRONT);
  for (const p of F.spores) {
    let ax = Math.sin(t * .3 + p.ph) * 3 - p.vx * .9, ay = -(5 + p.r * 3) - p.vy * .9;
    if (pf) {
      const dx = p.x - pf.x, dy = p.y - pf.y, d = Math.hypot(dx, dy) || 1;
      if (d < 110) { ax += dx / d * (110 - d) * 3; ay += dy / d * (110 - d) * 3; }
    }
    const hit = pulseAt(pulses, D_FRONT, p.x, p.y, p);
    if (hit) { p.vx += hit[0] * 120; p.vy += hit[1] * 120; }
    p.vx += ax * dt;
    p.vy += ay * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.y < -EX) { p.y = 1000 + EX; p.x = rnd() * WU; }
    if (p.x < -EX) p.x += WU + EX * 2;
    if (p.x > WU + EX) p.x -= WU + EX * 2;
  }
  for (const b of F.bokeh) {
    b.x += b.vx * dt;
    b.y -= 2 * dt;
    if (b.y < -EX - b.R) b.y = 1000 + EX + b.R;
    if (b.x < -EX - b.R) b.x = WU + EX + b.R;
    if (b.x > WU + EX + b.R) b.x = -EX - b.R;
  }

  // Glow vines hang like pendulums. The pointer near one lights its bulbs; a click swings it.
  for (const v of F.vines) {
    const wind = .05 * Math.sin(t * .4 + v.ph);
    v.av += (-(v.a - wind) * 3 - v.av * 1.1) * dt;
    if (pf) {
      const mx = v.x + (v.tip[0] - v.x) * .6, my = -EX + (v.tip[1] + EX) * .6;
      if (Math.hypot(pf.x - v.tip[0], pf.y - v.tip[1]) < 70 || Math.hypot(pf.x - mx, pf.y - my) < 60) v.glow = 1;
    }
    const hit = pulseAt(pulses, D_FRONT, v.tip[0], v.tip[1], v.e);
    if (hit) { v.av += hit[0] * 1.2; v.glow = 1; }
    v.a += v.av * dt;
    v.glow = Math.max(0, v.glow - dt * .5);
  }
}

function drawLeviathan(c, V, K, P, t, H) {
  const n = 40, spine = [], up = [], dn = [], p = new Path2D();
  for (let i = 0; i <= n; i++) {
    const s = i / n;
    spine.push([V.x - V.dir * s * V.L, V.y - Math.sin(Math.PI * s) * V.L * .035 + Math.sin(t * .45 - s * 5) * V.L * .025 * (.3 + s) + s * s * V.L * .05]);
  }
  const at = (s, side) => {
    const i = Math.round(s * n), a = spine[Math.max(0, i - 1)], b = spine[Math.min(n, i + 1)], d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const hw = V.L * .062 * Math.pow(Math.sin(Math.PI * Math.pow(s, .5)), .7) + .8, nx = -(b[1] - a[1]) / d * V.dir, ny = (b[0] - a[0]) / d * V.dir;
    return [spine[i][0] + nx * hw * side, spine[i][1] + ny * hw * side, nx, ny, hw];
  };
  for (let i = 0; i <= n; i++) { up.push(at(i / n, 1)); dn.push(at(i / n, -1)); }
  // Clockwise on screen whichever way it swims, so the fins union with the body.
  const ring = up.concat(dn.slice().reverse());
  smoothPath(V.dir > 0 ? ring.reverse() : ring, true, p);
  // Long swept fins beat slowly: a broad pair below the chest, a smaller pair along the back.
  for (const [s, side, k] of [[.22, -1, .3], [.36, 1, .1]]) {
    const [bx, by] = at(s, side), len = V.L * k, flap = Math.sin(t * .6 - s * 4) * .25, back = -V.dir;
    taper(bx, by, bx + back * len * .6, by - side * len * (.05 + flap * .3), bx + back * len, by - side * len * (.45 + flap), V.L * .026, 0, p);
  }
  // A fluke at the tail.
  const [tx, ty] = spine[n];
  for (const k of [-1, 1]) taper(tx, ty, tx - V.dir * V.L * .04, ty + k * 6, tx - V.dir * V.L * .09, ty + k * V.L * .05 + Math.sin(t * .7) * 8, V.L * .018, 2, p);
  // By day the air is brighter than the sky gradient alone, so the creature needs more haze to sit behind it.
  const sky = skyAt(P, V.y), col = mixc(P.body, sky, P.night ? .6 : .86), top = V.y - V.L * .06, bot = V.y + V.L * .14, k = P.night ? 1 : .5;
  // The belly sinks into the haze, so the creature reads as far away rather than flat.
  const g = c.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, rgba(col, .95 * k));
  g.addColorStop(.45, rgba(col, .7 * k));
  g.addColorStop(1, rgba(col, .12 * k));
  c.save();
  // A clip costs by the area it covers, so the spires' cutout is first narrowed to the creature, fins and tendrils.
  c.beginPath();
  c.rect(Math.min(V.x, tx) - V.L * .15, V.y - V.L * .35, V.L * 1.3, V.L * .75);
  c.clip();
  c.clip(K.far.clip, 'evenodd');
  // Tendrils hang from the belly and trail behind.
  c.strokeStyle = g;
  c.lineWidth = 2.2;
  c.beginPath();
  for (let i = 4; i < n * .7; i += 3) {
    const [x, y] = at(i / n, -1), len = V.L * (.05 + .07 * Math.sin(i * 1.7) ** 2), sw = Math.sin(t * .8 - i * .3) * 14;
    c.moveTo(x, y);
    c.quadraticCurveTo(x - V.dir * len * .4 + sw * .3, y + len * .5, x - V.dir * len * .9 + sw, y + len);
  }
  c.stroke();
  c.fillStyle = g;
  c.fill(p);
  c.strokeStyle = rgba(mixc(P.rim, sky, .45), .22);
  c.lineWidth = 2;
  c.stroke(smoothPath(up, false));
  // A village rides on its back: a grassy mound, a tree, and a cottage with its window lit.
  const sc = V.L / 1150, i0 = Math.round(n * .27), i1 = Math.round(n * .5), fog = P.night ? .45 : .62, mound = new Path2D();
  const bump = i => Math.sin(Math.PI * clamp((i - i0) / (i1 - i0), 0, 1)) * 40 * sc;
  const onTop = (i, f) => { const [x, y, nx, ny] = at(i / n, 1); return [x + nx * bump(i) * f, y + ny * bump(i) * f]; };
  for (let i = i0; i <= i1; i++) mound.lineTo(...onTop(i, 1));
  for (let i = i1; i >= i0; i--) mound.lineTo(...onTop(i, -.2));
  mound.closePath();
  c.fillStyle = rgba(mixc(mixc(P.leafMid, P.body, .4), sky, fog), .95 * k);
  c.fill(mound);
  const [tx2, ty2] = onTop(Math.round(n * .33), .85), [hx, hy] = onTop(Math.round(n * .42), .9), hw2 = 16 * sc, hh = 19 * sc;
  c.fillStyle = rgba(mixc(P.leafDark, sky, fog), .95 * k);
  c.fillRect(tx2 - 2 * sc, ty2 - 20 * sc, 4 * sc, 22 * sc);
  c.beginPath();
  ell(c, tx2, ty2 - 30 * sc, 17 * sc, 14 * sc, 0);
  c.fill();
  c.fillStyle = rgba(farTint(P, PLASTER, V.y, fog), .95 * k);
  c.fillRect(hx - hw2, hy - hh, hw2 * 2, hh + 3 * sc);
  c.fillStyle = rgba(farTint(P, ROOFS[0], V.y, fog), .95 * k);
  c.beginPath();
  c.moveTo(hx - hw2 - 3 * sc, hy - hh + 1);
  c.lineTo(hx, hy - hh - 16 * sc);
  c.lineTo(hx + hw2 + 3 * sc, hy - hh + 1);
  c.fill();
  c.globalCompositeOperation = 'lighter';
  dab(c, sprite(FIRE), hx + 4 * sc, hy - hh * .5, 16 * sc, P.night ? .6 : .4);
  c.fillStyle = rgba(LAMP, P.night ? .9 : .7);
  c.fillRect(hx + 2 * sc, hy - hh * .5 - 4 * sc, 7 * sc, 8 * sc);
  c.globalCompositeOperation = 'source-over';
  if (P.night) {
    c.globalCompositeOperation = 'lighter';
    const bs = sprite(P.bio);
    for (let i = 6; i < n - 6; i += 3) {
      const [x, y, nx, ny, hw] = at(i / n, 1);
      dab(c, bs, x - nx * hw * .5, y - ny * hw * .5, 7, .3 * (.6 + .4 * Math.sin(t * 1.6 - i * .4)));
    }
    c.globalCompositeOperation = 'source-over';
  }
  // A pale eye, the one sharp detail on it.
  const [ex, ey, enx, eny, ehw] = at(.06, 1);
  dab(c, sprite(P.light), ex - enx * ehw * .5, ey - eny * ehw * .5, 5, P.night ? .7 : .5);
  c.restore();
  for (const s of [.12, .35, .6]) H.push(['leviathan', ...spine[Math.round(s * n)], V.L * .09, D_FAR]);
}

export function drawFar(c, Lf, K, P, t) {
  const F = Lf.depth, H = Lf.hits, { giant: G, beacons: B } = K.far;
  H.push(['giant', G.x, G.y, G.r * 1.2, 0]);
  const M = F.meteor;
  if (P.night && M.k >= 0) {
    const d = M.k * M.len, hx = M.x + M.dx * d, hy = M.y + M.dy * d, a = Math.sin(Math.PI * M.k);
    const g = c.createLinearGradient(hx - M.dx * 140, hy - M.dy * 140, hx, hy);
    g.addColorStop(0, 'rgba(220,236,255,0)');
    g.addColorStop(1, `rgba(236,246,255,${(.85 * a).toFixed(3)})`);
    c.strokeStyle = g;
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(hx - M.dx * 140, hy - M.dy * 140);
    c.lineTo(hx, hy);
    c.stroke();
  }
  if (F.lev.wait <= 0) drawLeviathan(c, F.lev, K, P, t, H);
  drawWhimsy(c, Lf, K, P, t);
  c.globalCompositeOperation = 'lighter';
  const fs = sprite(FIRE), cs = sprite(FIRE_CORE), R = Lf.depth.relay;
  for (const l of F.lanterns) {
    const a = clamp((720 - l.y) / 80, 0, 1) * clamp((l.y - 120) / 120, 0, 1) * (.8 + .2 * Math.sin(t * 3 + l.ph));
    dab(c, fs, l.x, l.y, 8, .32 * a);
    dab(c, cs, l.x, l.y, 2, .8 * a);
  }
  B.forEach((b, i) => {
    const k = t - R.t0 - Math.abs(i - R.o) * R.step, f = k > 0 ? Math.exp(-k * 2.2) * Math.min(1, k * 8) : 0;
    dab(c, fs, b.x, b.y, 18 + 30 * f, .6 + .4 * f);
    dab(c, cs, b.x, b.y, 3, .85 + .15 * f);
    if (f > .02) {
      c.globalAlpha = .3 * f;
      c.drawImage(beamSprite(), b.x - 1.5, b.y - 170, 3, 170);
      c.globalAlpha = 1;
    }
    H.push(['beacons', b.x, b.y, 24, D_FAR]);
  });
  c.globalCompositeOperation = 'source-over';
  if (Lf.lite) return;
  const ms = mistSprite(P);
  c.globalAlpha = P.night ? .4 : .5;
  for (const h of F.hazes) blit(c, ms, h.x - h.w / 2, h.y - h.w * .14, h.w, h.w * .28, h);
  c.globalAlpha = 1;
}

// A spore: a soft glow with a bright core baked in, so each one costs a single drawImage.
let sparkCv, sparkKey;
function sparkSprite(P) {
  const key = P.night ? 'n' : 'd';
  if (sparkKey !== key) {
    sparkKey = key;
    sparkCv ||= makeCanvas();
    sparkCv.width = sparkCv.height = 64;
    const c = sparkCv.getContext('2d');
    c.clearRect(0, 0, 64, 64);
    c.globalCompositeOperation = 'lighter';
    puff(c, 32, 32, 32, P.glow, .3);
    puff(c, 32, 32, 5.5, P.light, .85);
  }
  return sparkCv;
}

// The column of light a signal fire throws up when it flares.
let beamCv;
function beamSprite() {
  if (!beamCv) {
    beamCv = makeCanvas();
    beamCv.width = 4;
    beamCv.height = 128;
    const c = beamCv.getContext('2d'), g = c.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, rgba(FIRE, 0));
    g.addColorStop(1, rgba(FIRE, 1));
    c.fillStyle = g;
    c.fillRect(0, 0, 4, 128);
  }
  return beamCv;
}

// A soft disc with a slightly brighter rim, like an out-of-focus light. Drawn under 'lighter', so dab draws it from
// the same disc as a gradient on a unit circle (`glow`).
const bokehCache = new Map();
function bokehSprite(col) {
  const key = col.join();
  let s = bokehCache.get(key);
  if (!s) {
    s = makeCanvas();
    s.width = s.height = 96;
    const c = s.getContext('2d'), disc = g => {
      g.addColorStop(0, rgba(col, .35));
      g.addColorStop(.75, rgba(col, .45));
      g.addColorStop(.92, rgba(col, .8));
      g.addColorStop(1, rgba(col, 0));
      return g;
    };
    c.fillStyle = disc(c.createRadialGradient(48, 48, 0, 48, 48, 47));
    c.fillRect(0, 0, 96, 96);
    s.glow = disc(c.createRadialGradient(0, 0, 0, 0, 0, 47 / 48));
    bokehCache.set(key, s);
  }
  return s;
}

// Drawn on the front layer, after the wanderlights.
export function drawNearLife(c, Lf, K, P, t) {
  const F = Lf.depth, H = Lf.hits, EX = K.EX;
  c.lineCap = 'round';
  const leaf = new Path2D(), stem = rgba(mixc(P.fg, P.leafMid, .35));
  for (const v of F.vines) {
    const n = 12, seg = v.len / n, pts = [[v.x, -EX]];
    let x = v.x, y = -EX;
    for (let j = 1; j <= n; j++) {
      const s = j / n, a = v.a * Math.pow(s, 1.2) + Math.sin(t * 1.3 + s * 4 + v.ph) * .04 * s;
      x += Math.sin(a) * seg;
      y += Math.cos(a) * seg;
      pts.push([x, y]);
      if (j % 3 === 1) ell(leaf, x + (j % 2 ? 5 : -5), y, 7, 3, j % 2 ? .5 : -.5);
    }
    v.tip = pts[n];
    v.pts = pts;
    c.strokeStyle = stem;
    c.lineWidth = 2.4;
    c.stroke(smoothPath(pts, false));
  }
  c.fillStyle = stem;
  c.fill(leaf);
  c.globalCompositeOperation = 'lighter';
  const gs = sprite(P.glow), ls = sprite(P.light);
  for (const v of F.vines) {
    for (const [i, [s, r]] of [[.5, 5], [.72, 6], [.88, 7], [1, 9]].entries()) {
      const [x, y] = v.pts[Math.round(s * 12)], tw = .75 + .25 * Math.sin(t * 1.7 + v.ph + s * 5), a = (.3 + .6 * v.glow) * tw;
      dab(c, gs, x, y + 3, r * (2.6 + 1.6 * v.glow), a * .55, v.glows[i]);
      dab(c, ls, x, y + 3, r * .45, .7 + .3 * v.glow);
    }
    H.push(['vines', v.tip[0], v.tip[1], 28, D_FRONT]);
  }
  const ss = sparkSprite(P);
  for (let i = 0; i < F.spores.length; i += Lf.lite ? 2 : 1) {
    const p = F.spores[i];
    dab(c, ss, p.x, p.y, p.r * 6, .6 + .4 * Math.sin(t * 2.3 + p.ph));
  }
  const bs = bokehSprite(P.glow);
  for (const b of F.bokeh) dab(c, bs, b.x, b.y, b.R, (P.night ? .16 : .2) * (.7 + .3 * Math.sin(t * .5 + b.ph)), b);
  c.globalCompositeOperation = 'source-over';
}
