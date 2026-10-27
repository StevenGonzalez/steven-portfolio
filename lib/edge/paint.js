// The edge of the world, painted: everything in it that holds still. The scene is 1000 units tall and K.WU units wide,
// as the home page's world is. The viewer stands on a rock out past the edge, looking back at it: the world above, its
// cloud sea pouring over the edge in falls all along it, and far below, where there is no ground, a galaxy turning.

import {
  PAL,
  TAU,
  dab,
  grain,
  lerp,
  mixc,
  puff,
  rgba,
  rimLight,
  seeded,
  smoothPath,
  sprite,
  taper,
} from "../world/core";
import { LEAVES, seasonOf, turnOf } from "../world/calendar";
import { broadLeaf } from "../world/depth";
import { CRUST, LIP, SEA, fallsAt, lipAt } from "./layout";

// The edge's own colours in each theme, laid over the island's (PAL), so what the two share, like a whale's colours or a
// jelly's, matches. Night is the dark theme, teal and moonlit as the island's night is. Dusk is the light theme: the sun
// going down behind the horizon, gold over the cloud sea, while under the world, where no sun reaches, it is night
// still. `below` is the void under the world, top to bottom, and `glow` the light along the horizon.
const OWN = {
  night: {
    sky: [
      [0, [4, 8, 20]],
      [0.12, [8, 20, 40]],
      [0.22, [16, 46, 68]],
      [0.28, [36, 92, 100]],
      [0.3, [96, 160, 160]],
    ],
    below: [
      [0.42, [8, 16, 30]],
      [0.6, [3, 6, 14]],
      [1, [8, 12, 30]],
    ],
    glow: [120, 200, 190],
    starsAbove: 1,
    haze: [52, 104, 118],
    cloud: [56, 100, 118],
    cloudDark: [16, 32, 48],
    cloudLit: [170, 222, 226],
    crust: [6, 12, 18],
    fall: [130, 186, 200],
    fallLit: [150, 180, 250],
    rock: [5, 10, 15],
    rockLit: [40, 74, 88],
    rim: [164, 228, 238],
    lamp: [255, 206, 140],
    leaf: [30, 52, 50],
  },
  dusk: {
    sky: [
      [0, [18, 44, 58]],
      [0.1, [40, 88, 100]],
      [0.19, [112, 146, 134]],
      [0.26, [222, 184, 128]],
      [0.3, [255, 222, 166]],
    ],
    below: [
      [0.42, [22, 30, 52]],
      [0.6, [10, 12, 30]],
      [1, [18, 14, 40]],
    ],
    glow: [255, 196, 120],
    starsAbove: 0.12,
    haze: [214, 182, 150],
    cloud: [196, 168, 150],
    cloudDark: [84, 96, 118],
    cloudLit: [255, 238, 206],
    crust: [20, 24, 34],
    fall: [232, 214, 196],
    fallLit: [190, 170, 240],
    rock: [8, 17, 20],
    rockLit: [120, 96, 80],
    rim: [255, 216, 150],
    lamp: [255, 214, 150],
    leaf: [62, 96, 60],
  },
};
export const edgePalette = (night) => ({ ...PAL[night ? "night" : "dusk"], ...OWN[night ? "night" : "dusk"] });

// The galaxy's colours, the same in both themes: it is lit by itself.
const STARLIGHT = {
  core: [255, 236, 200],
  arm: [150, 190, 255],
  rose: [255, 120, 170],
  lamp: [255, 214, 150],
};

function gradient(c, x0, y0, x1, y1, stops) {
  const g = c.createLinearGradient(x0, y0, x1, y1);
  for (const [at, col, a = 1] of stops) g.addColorStop(at, rgba(col, a));
  return g;
}

// Where the sun goes down at dusk, behind the horizon.
export const sunAt = (K) => [K.WU * 0.64, SEA - 4];

// The sky down to the horizon, and the void under the world, with stars in both, and at dusk the sun setting.
export function paintSpace(c, K, P) {
  const rnd = seeded(11);
  c.fillStyle = gradient(c, 0, 0, 0, 1000, P.sky.concat(P.below));
  c.fillRect(-K.PAD, -K.PAD, K.WU + K.PAD * 2, 1000 + K.PAD * 2);
  // The glow along the horizon.
  c.save();
  c.scale(1, 0.18);
  puff(c, K.WU * 0.5, SEA / 0.18, K.WU * 0.6, P.glow, P.night ? 0.3 : 0.5);
  c.restore();
  if (!P.night) {
    const [sx, sy] = sunAt(K);
    puff(c, sx, sy, 520, P.glow, 0.45);
    puff(c, sx, sy, 160, [255, 230, 180], 0.6);
    c.fillStyle = rgba([255, 244, 214]);
    c.beginPath();
    c.arc(sx, sy, 34, 0, TAU);
    c.fill();
  }
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * K.WU,
      y = rnd() ** 1.3 * 1000;
    if (y > SEA - 30 && y < 560) continue;
    const big = rnd() < 0.03,
      r = big ? 1.6 + rnd() * 1.2 : rnd() ** 3 * 1.4 + 0.5,
      a = (0.25 + rnd() * 0.75) * (y < SEA ? (1 - (y / SEA) ** 3 * 0.7) * P.starsAbove : 1),
      col = mixc([255, 255, 255], rnd() < 0.5 ? [170, 196, 255] : [255, 206, 176], rnd() * 0.8);
    if (big) puff(c, x, y, r * 6, col, a * 0.25);
    c.fillStyle = rgba(col, a);
    c.fillRect(x - r / 2, y - r / 2, r, r);
  }
  grain(c, P.night ? 0.05 : 0.04, "overlay");
}

// The galaxy, face on, on a square canvas `S` units across. The page lays it down at a slant and turns it.
export function paintGalaxy(c, S) {
  const rnd = seeded(23),
    R = S / 2,
    // Colours from the warm core out to the blue rim, in a few steps so the glow sprites are shared.
    tint = (r) => mixc(STARLIGHT.core, STARLIGHT.arm, Math.round(Math.min(1, r / (R * 0.55)) * 8) / 8),
    gauss = () => rnd() + rnd() + rnd() - 1.5,
    // The arms crowd together near the core, so their stars there are fainter, or they would burn into a white ring.
    inner = (r) => 0.25 + 0.75 * Math.min(1, r / (R * 0.35)) ** 1.5;
  c.save();
  c.translate(R, R);
  puff(c, 0, 0, R, [50, 50, 120], 0.4);
  puff(c, 0, 0, R * 0.55, [200, 140, 170], 0.3);
  // Two arms winding out from the core, as logarithmic spirals, with as many stars to a length of arm all the way out.
  const at = (r, k, lag = 0) => {
    const a = Math.log(r / (R * 0.05)) * 2.7 + k * Math.PI - lag;
    return [Math.cos(a) * r, Math.sin(a) * r];
  };
  c.globalCompositeOperation = "lighter";
  for (let k = 0; k < 2; k++) {
    for (let i = 0; i < 8000; i++) {
      const r = R * (0.05 + 0.85 * rnd() ** 0.85),
        [x, y] = at(r, k),
        w = r * 0.2 + R * 0.015;
      dab(
        c,
        sprite(tint(r)),
        x + gauss() * w,
        y + gauss() * w,
        R * (0.004 + rnd() * 0.006),
        0.4 * (1 - r / R) * inner(r),
      );
    }
    // Star-forming knots along the arms, some pink.
    for (let i = 0; i < 500; i++) {
      const r = R * (0.12 + 0.8 * rnd()),
        [x, y] = at(r, k),
        w = r * 0.1;
      const col = rnd() < 0.3 ? STARLIGHT.rose : rnd() < 0.5 ? [200, 220, 255] : tint(r);
      dab(c, sprite(col), x + gauss() * w, y + gauss() * w, R * (0.012 + rnd() * 0.03), 0.1);
    }
  }
  // Fainter stars all through the disc, between the arms too.
  for (let i = 0; i < 5000; i++) {
    const r = R * 0.9 * rnd() ** 0.7,
      a = rnd() * TAU;
    dab(c, sprite(tint(r)), Math.cos(a) * r, Math.sin(a) * r, R * (0.003 + rnd() * 0.004), 0.25 * (1 - r / R));
  }
  // Dust lanes along the inside edge of each arm.
  c.globalCompositeOperation = "source-over";
  for (let k = 0; k < 2; k++)
    for (let i = 0; i < 900; i++) {
      const r = R * (0.1 + 0.75 * rnd()),
        [x, y] = at(r, k, 0.35),
        w = r * 0.06;
      dab(c, sprite([8, 5, 18]), x + gauss() * w, y + gauss() * w, R * (0.01 + rnd() * 0.02), 0.22);
    }
  c.globalCompositeOperation = "lighter";
  // A haze of old stars round the core, thinning outward.
  for (let i = 0; i < 14000; i++) {
    const r = R * rnd() ** 2.2,
      a = rnd() * TAU;
    c.fillStyle = rgba(tint(r), 0.3 * (1 - r / R) ** 2);
    c.fillRect(Math.cos(a) * r, Math.sin(a) * r, 2.5, 2.5);
  }
  puff(c, 0, 0, R * 0.3, STARLIGHT.core, 0.25);
  puff(c, 0, 0, R * 0.06, [255, 248, 230], 0.6);
  c.restore();
}

// The world, from the horizon down to the bottom of its crust, with the falls pouring over the lip into mist.
export function paintWorld(c, K, P) {
  const rnd = seeded(37),
    W = K.WU,
    L = -K.PAD,
    R = W + K.PAD;
  // Far islands on the horizon, faint with distance, a few trees on each, leaving a gap where the sun sets.
  const [sun] = sunAt(K);
  for (let i = 0; i < 18; i++) {
    const x = rnd() * W,
      w = 50 + rnd() * 140,
      h = 14 + rnd() * 50,
      col = mixc(P.haze, P.cloudDark, 0.2 + rnd() * 0.5);
    if (Math.abs(x - sun) < w / 2 + 70) continue;
    const pts = [
      [x - w * 0.5, SEA + 6],
      [x - w * 0.32, SEA - h * 0.6],
      [x - w * 0.08, SEA - h],
      [x + w * 0.22, SEA - h * 0.8],
      [x + w * 0.5, SEA + 6],
    ];
    c.fillStyle = rgba(col);
    c.fill(smoothPath(pts));
    // Small trees along the ridge, sitting on its curve: the curves smoothPath draws over the top, sampled.
    const ridge = [];
    for (let i = 1; i < 4; i++)
      for (let q = 0; q <= 1; q += 0.1) {
        const [a, b, d] = [pts[i - 1], pts[i], pts[i + 1]],
          s0 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2],
          s1 = [(b[0] + d[0]) / 2, (b[1] + d[1]) / 2],
          m = 1 - q;
        ridge.push([
          m * m * s0[0] + 2 * m * q * b[0] + q * q * s1[0],
          m * m * s0[1] + 2 * m * q * b[1] + q * q * s1[1],
        ]);
      }
    for (let j = Math.floor(w / 22); j > 0; j--) {
      const r = 1.6 + rnd() * 2.2,
        [tx, ty] = ridge[Math.floor(ridge.length * (0.2 + rnd() * 0.6))];
      c.beginPath();
      c.arc(tx, ty - r * 0.3, r, 0, TAU);
      c.fill();
    }
  }
  // The crust behind the falls, seen where they part: dark rock hanging in spurs, roots trailing from it.
  const crust = new Path2D();
  crust.moveTo(L, lipAt(K, L) - 10);
  for (let x = L; x <= R; x += 10) crust.lineTo(x, lipAt(K, x) - 10);
  for (let x = R; x > L;) {
    const w = 18 + rnd() * 60,
      deep = CRUST - 30 + rnd() * 50 + (rnd() < 0.2 ? 40 + rnd() * 110 : 0);
    crust.lineTo(x - w * 0.25, deep - 26);
    crust.lineTo(x - w * 0.5, deep);
    crust.lineTo(x - w * 0.75, deep - 30);
    x -= w;
  }
  crust.lineTo(L, CRUST);
  crust.closePath();
  c.fillStyle = gradient(c, 0, LIP, 0, CRUST + 120, [
    [0, mixc(P.crust, P.cloudDark, 0.4)],
    [0.45, P.crust],
    [1, mixc(P.crust, P.rim, 0.25)],
  ]);
  c.fill(crust);
  c.save();
  c.clip(crust);
  for (let i = 0; i < 50; i++) {
    const y = LIP + rnd() * (CRUST - LIP + 120);
    c.fillStyle = rgba(rnd() < 0.5 ? [44, 34, 66] : [4, 3, 10], 0.08 + rnd() * 0.12);
    c.fillRect(L, y, R - L, 1 + rnd() * 3);
  }
  c.restore();
  c.strokeStyle = rgba(P.crust);
  c.lineCap = "round";
  for (let i = 0; i < 90; i++) {
    const x = rnd() * W,
      y = CRUST - 30 + rnd() * 30,
      len = 20 + rnd() * 90;
    c.lineWidth = 0.8 + rnd() * 1.6;
    c.beginPath();
    c.moveTo(x, y);
    c.quadraticCurveTo(x + (rnd() - 0.5) * 20, y + len * 0.6, x + (rnd() - 0.5) * 16, y + len);
    c.stroke();
  }

  // The cloud sea, seen low across: small far billows at the horizon, growing toward the lip.
  c.fillStyle = gradient(c, 0, SEA - 6, 0, LIP + 20, [
    [0, P.cloudLit, 0.9],
    [0.3, mixc(P.cloud, P.cloudLit, 0.4)],
    [1, P.cloud],
  ]);
  c.beginPath();
  c.moveTo(L, SEA);
  for (let x = L; x <= R; x += 20) c.lineTo(x, SEA - 3 - 3 * Math.sin(x * 0.05) * Math.sin(x * 0.013));
  for (let x = R; x >= L; x -= 10) c.lineTo(x, lipAt(K, x));
  c.closePath();
  c.fill();
  // Billows, row by row from the horizon forward, each lit on top by the glow on the horizon and dark underneath.
  const billow = (x, y, rx, ry, top, under) => {
    c.fillStyle = gradient(c, 0, y - ry, 0, y + ry, [
      [0, top],
      [0.55, mixc(top, under, 0.6)],
      [1, under],
    ]);
    c.beginPath();
    c.ellipse(x, y, rx, ry, 0, 0, TAU);
    c.fill();
  };
  // They gather in heaps of a few, and the heaps swell and sink along the sea in slow waves, so it rolls rather than
  // lying in even rows.
  const swell = (x, r) => 0.7 + 0.3 * Math.sin(x * 0.0041 + r * 0.7) + 0.15 * Math.sin(x * 0.011 - r * 1.3),
    rows = 18;
  for (let r = 0; r < rows; r++) {
    const t = r / (rows - 1),
      rad = lerp(3, 26, t ** 1.2);
    for (let x = L + rnd() * rad; x < R + rad; x += rad * (1.6 + rnd() * 1.6)) {
      const y = lerp(SEA + 1, lipAt(K, x) - 18, t ** 1.4),
        sw = swell(x, r),
        // Lit on top, and underneath no darker than the sea around it, so a billow melts into the ones behind.
        top = mixc(P.cloudLit, P.cloud, t * 0.25 + (1 - sw) * 0.3 + rnd() * 0.1),
        under = mixc(mixc(P.cloud, P.cloudLit, 0.6 * (1 - t)), P.cloudDark, 0.1 + (1 - sw) * 0.25);
      for (let n = 1 + Math.floor(rnd() * 3); n >= 0; n--) {
        const k = rad * sw * (0.5 + rnd() * 0.7);
        billow(x + (rnd() - 0.5) * rad * 1.6, y - rnd() * rad * sw * 0.5, k * (1.5 + rnd() * 0.8), k * 0.7, top, under);
      }
    }
  }

  // Distance: the far rows fade into the glow on the horizon.
  c.fillStyle = gradient(c, 0, SEA, 0, SEA + 50, [
    [0, mixc(P.cloudLit, P.haze, 0.3), 0.75],
    [1, P.cloudLit, 0],
  ]);
  c.fillRect(L, SEA - 6, R - L, 56);

  // The falls: a sheet pouring over the lip all along it, parting here and there, streaked as it goes down, thinning
  // into mist the galaxy lights from below.
  for (let x = L; x < R; x += 2.5) {
    const f = fallsAt(x);
    if (f < 0.02) continue;
    const top = lipAt(K, x) - 6,
      len = (170 + 300 * f) * (0.85 + rnd() * 0.3),
      s = 0.5 + rnd() * 0.5;
    c.fillStyle = gradient(c, 0, top, 0, top + len, [
      [0, P.cloudLit, 0.95 * f],
      [0.12, P.fall, 0.85 * f * s],
      [0.5, mixc(P.fall, P.fallLit, 0.5), 0.5 * f * s],
      [1, P.fallLit, 0],
    ]);
    c.fillRect(x, top, 2.8, len);
  }
  // Mist rising off where the falls come apart.
  for (let x = L; x < R; x += 7) {
    const f = fallsAt(x);
    if (f < 0.15) continue;
    for (let j = 0; j < 2; j++) {
      const d = rnd(),
        y = lipAt(K, x) + 150 + 300 * f * (0.4 + d * 0.7);
      puff(c, x + (rnd() - 0.5) * 30, y, 24 + rnd() * 50 * f, mixc(P.fall, P.fallLit, d), 0.1 * f);
    }
  }
  // The lip itself, the cloud sea rolling over: a row of big billows along the edge, paling into the falls under them.
  for (let x = L; x < R + 30; x += 14 + rnd() * 14) {
    const rad = 14 + rnd() * 12;
    billow(x, lipAt(K, x) - 10, rad * 1.5, rad * 0.7, P.cloudLit, mixc(P.fall, P.cloudDark, 0.3 * (1 - fallsAt(x))));
  }
  grain(c, 0.035);
}

// The rock the viewer stands on, bottom left, floating on its own, with a striped lighthouse like the island's, a
// cottage, a young maple with a lantern or two in it, and a pier running out over the void with lights strung along
// it. Drawn at full size, anchored at the bottom left corner, and scaled there by `place.s`. The galaxy lights it from
// below and in front, along its edges.
export function paintRock(c, K, place, P) {
  const rnd = seeded(53),
    L = -K.PAD / place.s - 40,
    dark = (col, k = 1) => mixc(col, P.rock, (P.night ? 0.62 : 0.3) * k);
  c.save();
  c.translate(0, 1000);
  c.scale(place.s, place.s);
  c.translate(0, -1000);
  const rock = smoothPath([
    [L, 700],
    [40, 676],
    [170, 668],
    [300, 676],
    [420, 690],
    [452, 712],
    [430, 760],
    [370, 830],
    [300, 900],
    [230, 1000],
    [160, 1080],
    [L, 1080],
  ]);
  const draw = (r) => r.fill(rock);
  // Dark through, catching a little of the sky along the top, and banded where it was laid down.
  c.fillStyle = gradient(c, 0, 664, 0, 1000, [
    [0, mixc(P.rock, P.rockLit, 0.5)],
    [0.12, mixc(P.rock, P.rockLit, 0.15)],
    [1, P.rock],
  ]);
  draw(c);
  c.save();
  c.clip(rock);
  for (let i = 0; i < 14; i++) {
    const y = 700 + rnd() * 300;
    c.strokeStyle = rgba(rnd() < 0.5 ? P.rockLit : [0, 0, 0], 0.04 + rnd() * 0.05);
    c.lineWidth = 2 + rnd() * 6;
    c.beginPath();
    c.moveTo(L, y);
    c.bezierCurveTo(100, y - 10 + rnd() * 20, 300, y - 10 + rnd() * 20, 520, y + 30);
    c.stroke();
  }
  c.restore();
  rimLight(c, draw, -3, -5, P.rim, 0.55, 2);
  // Roots hanging from its underside.
  c.fillStyle = rgba(P.rock);
  for (let i = 0; i < 14; i++) {
    const t = rnd(),
      x = lerp(440, 220, t),
      y = lerp(730, 980, t),
      len = 30 + rnd() * 70;
    c.fill(taper(x - 6, y - 6, x + 8, y + len * 0.5, x + (rnd() - 0.3) * 20, y + len, 4, 0.6));
  }
  // Grass along the top.
  const ground = (x) => 672 + 8 * Math.abs((x - 170) / 280) ** 2 + (x > 400 ? (x - 400) * 0.5 : 0);
  c.lineWidth = 1.4;
  for (let x = L; x < 448; x += 3 + rnd() * 4) {
    const y = ground(x),
      h = 4 + rnd() * 10;
    c.strokeStyle = rgba(mixc(P.rock, P.leaf, 0.3 + rnd() * 0.4));
    c.beginPath();
    c.moveTo(x, y + 2);
    c.quadraticCurveTo(x + 1, y - h * 0.6, x + (rnd() - 0.3) * 6, y - h);
    c.stroke();
  }

  // The lighthouse: a tapering tower in red and white bands, shaded round, its lamp room and a cap.
  const bx = 160,
    top = 486,
    by = 672,
    tower = new Path2D();
  tower.moveTo(bx - 24, by);
  tower.lineTo(bx - 15, top + 30);
  tower.lineTo(bx + 15, top + 30);
  tower.lineTo(bx + 24, by);
  tower.closePath();
  const white = dark([228, 222, 206]),
    red = dark([176, 62, 50]);
  c.save();
  c.clip(tower);
  c.fillStyle = rgba(white);
  c.fillRect(bx - 30, top, 60, by - top);
  c.fillStyle = rgba(red);
  for (const y of [top + 30, top + 84, top + 138]) c.fillRect(bx - 30, y, 60, 27);
  c.fillStyle = gradient(c, bx - 24, 0, bx + 24, 0, [
    [0, P.rock, 0.75],
    [0.55, P.rock, 0.15],
    [1, P.rock, 0.45],
  ]);
  c.fillRect(bx - 30, top, 60, by - top);
  c.restore();
  c.fillStyle = rgba(dark([40, 40, 46], 1.2));
  c.fillRect(bx - 22, top + 24, 44, 6);
  c.fillRect(bx - 12, top, 3, 24);
  c.fillRect(bx + 9, top, 3, 24);
  c.fillStyle = rgba(red);
  c.beginPath();
  c.moveTo(bx - 20, top);
  c.quadraticCurveTo(bx, top - 26, bx + 20, top);
  c.closePath();
  c.fill();
  c.fillStyle = rgba(P.lamp, 0.95);
  c.fillRect(bx - 9, top + 2, 18, 22);
  for (const wy of [top + 98, top + 150]) c.fillRect(bx - 3, wy, 6, 9);

  // The cottage beside it, its window lit, smoke from its chimney drawn as it goes.
  c.fillStyle = rgba(dark([150, 126, 104]));
  c.fillRect(250, 640, 60, 36);
  c.fillStyle = rgba(dark([92, 54, 44], 1.2));
  c.beginPath();
  c.moveTo(242, 642);
  c.lineTo(280, 614);
  c.lineTo(318, 642);
  c.closePath();
  c.fill();
  c.fillRect(296, 616, 7, 18);
  c.fillStyle = rgba(dark([70, 50, 40], 1.3));
  c.fillRect(284, 656, 12, 20);
  c.fillStyle = rgba(P.lamp, 0.9);
  c.fillRect(262, 652, 10, 10);

  // A young maple behind the cottage, grown from a seed of the island's, turning with the season.
  const season = seasonOf(new Date()),
    turn = season === "autumn" ? turnOf(new Date()) : 0,
    mx = 352,
    my = ground(352);
  c.fillStyle = rgba(dark([70, 52, 40], 1.2));
  c.fill(taper(mx, my, mx - 4, my - 30, mx + 2, my - 66, 6, 2.5));
  c.fill(taper(mx - 1, my - 40, mx - 14, my - 56, mx - 24, my - 70, 3, 1));
  c.fill(taper(mx + 1, my - 48, mx + 14, my - 60, mx + 22, my - 76, 3, 1));
  const lanterns = [];
  if (season !== "winter")
    for (let i = 0; i < 70; i++) {
      const a = rnd() * TAU,
        r = 30 * Math.sqrt(rnd()),
        x = mx + Math.cos(a) * r * 1.2,
        y = my - 76 + Math.sin(a) * r * 0.75,
        green = mixc(P.leaf, [120, 150, 70], rnd() * 0.5),
        col = dark(mixc(green, LEAVES[i % LEAVES.length], turn * (0.7 + rnd() * 0.3)), 0.8);
      c.fillStyle = rgba(mixc(col, P.rim, y < my - 86 ? 0.15 : 0));
      c.beginPath();
      c.arc(x, y, 3 + rnd() * 4, 0, TAU);
      c.fill();
    }
  lanterns.push([mx - 18, my - 58], [mx + 20, my - 64]);
  c.strokeStyle = rgba(P.rock);
  c.lineWidth = 0.6;
  for (const [x, y] of lanterns) {
    c.beginPath();
    c.moveTo(x, y - 8);
    c.lineTo(x, y);
    c.stroke();
    c.fillStyle = rgba(P.lamp);
    c.fillRect(x - 2, y, 4, 5);
  }

  // The pier, out over nothing on stilts that hang free, a rope along it hung with lights, and a lamp at the end.
  const px = 400,
    py = 690,
    pend = 680;
  c.fillStyle = rgba(dark([110, 84, 64]));
  c.fillRect(px, py, pend - px, 7);
  c.fillStyle = rgba(P.rock);
  c.fillRect(px, py + 5, pend - px, 2);
  for (let x = px + 40; x <= pend; x += 70) {
    c.fillRect(x - 2, py, 4, 46);
    c.fillRect(x - 2, py - 18, 3, 18);
  }
  c.fillRect(pend - 3, py - 44, 3, 44);
  c.fillStyle = rgba(P.lamp);
  c.fillRect(pend - 5, py - 54, 7, 9);
  c.strokeStyle = rgba(P.rock);
  c.lineWidth = 1;
  const bulbs = [[pend - 1.5, py - 50, 2]];
  c.beginPath();
  for (let x = px + 40; x + 70 <= pend; x += 70) {
    c.moveTo(x, py - 16);
    c.quadraticCurveTo(x + 35, py - 8, x + 70, py - 16);
    for (const q of [0.25, 0.5, 0.75]) bulbs.push([x + 70 * q, py - 16 + 8 * 2 * q * (1 - q), 1]);
  }
  c.stroke();

  // Everything lit glows: the lamp room, windows, the maple's lanterns and the pier's lights.
  c.globalCompositeOperation = "lighter";
  const glow = sprite(P.lamp),
    a = P.night ? 1 : 0.6;
  dab(c, glow, bx, top + 13, 46, 0.5 * a);
  for (const wy of [top + 98, top + 150]) dab(c, glow, bx, wy + 4, 12, 0.4 * a);
  dab(c, glow, 267, 657, 26, 0.55 * a);
  for (const [x, y] of lanterns) dab(c, glow, x, y + 2, 16, 0.6 * a);
  for (const [x, y, big] of bulbs) {
    dab(c, glow, x, y, big ? 26 : 8, (big ? 0.6 : 0.45) * a);
    c.fillStyle = rgba([255, 244, 220], a);
    c.fillRect(x - 0.8, y - 0.8, 1.6, 1.6);
  }
  c.restore();
  grain(c, 0.04);
}

// Out of focus right in front of the viewer, as on the island: broad leaves up from the bottom right corner, and a
// bough hanging in across the top right, dark against the sky and lit along their edges.
export function paintFront(c, K, P) {
  const rnd = seeded(61),
    W = K.WU,
    E = K.PAD,
    f = Math.min(1.2, Math.max(0.55, W / 1700)),
    p = new Path2D();
  for (let i = 0; i < 5; i++)
    broadLeaf(
      p,
      W + E * 0.3 - rnd() * 90 * f,
      1000 + E,
      -Math.PI * (0.6 + i * 0.05 + rnd() * 0.03),
      (260 + rnd() * 150) * f,
      (56 + rnd() * 36) * f,
    );
  // A bough comes in from the right and dips, with leaves hanging off it all along, as one does over the island.
  const x0 = W + E,
    y0 = 40 * f,
    cx = W - 220 * f,
    cy = 170 * f,
    x1 = W - 470 * f,
    y1 = 120 * f;
  taper(x0, y0, cx, cy, x1, y1, 30 * f, 6 * f, p);
  for (let i = 0; i < 18; i++) {
    const t = 0.05 + i * 0.052,
      m = 1 - t;
    broadLeaf(
      p,
      m * m * x0 + 2 * m * t * cx + t * t * x1,
      m * m * y0 + 2 * m * t * cy + t * t * y1,
      Math.PI * (0.5 + (rnd() - 0.5) * 0.9),
      (70 + rnd() * 70) * f,
      (28 + rnd() * 16) * f,
    );
  }
  const sc = c.getTransform().a;
  c.filter = `blur(${(7 * f * sc).toFixed(1)}px)`;
  c.fillStyle = rgba(P.fg);
  c.fill(p);
  c.filter = "none";
  rimLight(c, (r) => r.fill(p), -4 * f, -6 * f, P.rim, P.night ? 0.1 : 0.24, 2);
}
