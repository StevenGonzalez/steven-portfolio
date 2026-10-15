// Small painted scenes for the case studies, in the same style and palettes as the world. Each one is a floating island
// over a cloud sea with something on it that stands for the project. Scene units: 1000 tall and K.WU wide, so one scene
// fits any aspect ratio, composed around the middle. paint() draws everything that holds still, once per theme; draw()
// adds what moves, every frame, over a copy of that.

import { PAL, TAU, awayFrom, clamp, dab, ell, grain, lerp, makeCanvas, mixc, puff, rgba, rimLight, seeded, skyAt, sprite, taper } from './core';
import { cloud, farIsle, grow, islandShape, paintRock, seaRow } from './scene';
import { LAMP, PLASTER, ROOFS, WOOD, farTint } from './whimsy';
import { ease } from './story';

const HZ = 830, STEEL = [176, 184, 188], STONE = [168, 156, 136], NEW_STONE = [232, 220, 194];
const BALLOONS = [[214, 96, 78], [236, 196, 112], [96, 160, 170], [176, 120, 168], [240, 226, 200], [120, 170, 110]];

function sky(c, K, P, rnd) {
  const { WU, L } = K, g = c.createLinearGradient(0, 0, 0, 1000);
  for (const [o, col] of P.sky) g.addColorStop(o, rgba(col));
  c.fillStyle = g;
  c.fillRect(0, 0, WU, 1000);
  c.globalCompositeOperation = 'lighter';
  if (P.night) {
    for (let i = 0; i < WU * .14; i++) {
      const x = rnd() * WU, y = Math.pow(rnd(), 1.5) * 700, r = 1 + rnd() * rnd() * 2.5;
      c.fillStyle = rgba([222, 236, 255], clamp(1 - y / 760, 0, 1) * (.3 + rnd() * .7));
      c.fillRect(x, y, r, r);
    }
    puff(c, L.x, L.y, 380, P.bloom, .22);
    puff(c, L.x, L.y, 90, P.light, .3);
    c.globalCompositeOperation = 'source-over';
    c.beginPath();
    c.arc(L.x, L.y, 22, 0, TAU);
    c.fillStyle = rgba([226, 236, 232]);
    c.fill();
  } else {
    puff(c, L.x, L.y, 760, P.bloom, .32);
    puff(c, L.x, L.y, 280, P.light, .45);
    puff(c, L.x, L.y, 70, [255, 250, 236], .9);
  }
  c.globalCompositeOperation = 'source-over';
  for (let i = 0; i < 6; i++) {
    const y = 120 + rnd() * 360, col = mixc(P.cloudLit, skyAt(P, y), .45);
    c.save();
    c.translate(rnd() * WU, y);
    c.scale(4 + rnd() * 5, .25);
    puff(c, 0, 0, 40, col, .12 + rnd() * .1);
    c.restore();
  }
  for (let i = 0; i < 6; i++) cloud(c, rnd, K, P, rnd() * WU, 600 + rnd() * 110, 280 + rnd() * 360, 60 + rnd() * 40, 14, .58);
  farIsle(c, rnd, K, P, WU * (.12 + rnd() * .1), 420 + rnd() * 80, 70, .7);
  farIsle(c, rnd, K, P, WU * (.8 + rnd() * .1), 380 + rnd() * 80, 56, .75);
}

// The cloud sea along the bottom, painted last so whatever reaches down sinks into it.
function sea(c, K, P, rnd) {
  const floor = mixc(P.cloudDark, skyAt(P, HZ), .3), g = c.createLinearGradient(0, HZ - 30, 0, HZ + 40);
  g.addColorStop(0, rgba(floor, 0));
  g.addColorStop(1, rgba(floor, 1));
  c.fillStyle = g;
  c.fillRect(0, HZ - 30, K.WU, 1000 - HZ + 30);
  for (let row = 0; row < 3; row++) seaRow(c, rnd, K, P, HZ + row * 62, 52 + row * 28, .28 - row * .1);
  c.globalCompositeOperation = 'lighter';
  c.save();
  c.translate(K.L.x, HZ);
  c.scale(4, .4);
  puff(c, 0, 0, 220, P.haze, P.night ? .1 : .22);
  c.restore();
  c.globalCompositeOperation = 'source-over';
}

// A floating island with turf along its lip and moss over the edges.
function isle(c, rnd, K, P, cx, top, w, depth, fog = 0) {
  const sh = islandShape(rnd, cx, top, w, depth, .44 + rnd() * .12), tint = skyAt(P, top), [ax, ay] = awayFrom(K, cx, top, 4);
  // Roots hang from the rock and end in small lights.
  const roots = new Path2D(), bulbs = [];
  for (let i = 0; i < w / 70; i++) {
    const x = sh.x0 + (.15 + rnd() * .7) * w, y = sh.underAt(x) - 10, len = (20 + rnd() * 70) * w / 500, sway = (rnd() - .5) * 30;
    taper(x, y, x + sway, y + len * .6, x + sway * .4, y + len, 5, .8, roots);
    bulbs.push([x + sway * .4, y + len]);
  }
  c.fillStyle = rgba(mixc(mixc(P.rock, P.leafDark, .5), tint, fog));
  c.fill(roots);
  paintRock(c, rnd, K, P, sh, fog);
  c.globalCompositeOperation = 'lighter';
  for (const [x, y] of bulbs) {
    puff(c, x, y, 16, P.glow, .4 * (1 - fog));
    puff(c, x, y, 4, P.light, .9 * (1 - fog));
  }
  c.globalCompositeOperation = 'source-over';
  const turf = new Path2D();
  for (let i = 0; i < w * .45; i++) {
    const x = sh.x0 + rnd() * w;
    ell(turf, x, sh.topAt(x) + rnd() * 7, 5 + rnd() * 7, 3 + rnd() * 3, rnd() * TAU);
  }
  for (let i = 0; i < w / 40; i++) {
    const u = rnd() < .5 ? rnd() * .14 : 1 - rnd() * .14, x = sh.x0 + u * w, y = sh.topAt(x);
    taper(x, y, x + (rnd() - .5) * 6, y + 16, x + (rnd() - .5) * 8, y + 14 + rnd() * 34, 5, .6, turf);
  }
  c.fillStyle = rgba(mixc(P.leafDark, tint, fog));
  c.fill(turf);
  rimLight(c, r => r.fill(turf), ax * .6, ay * .6 + 2, mixc(P.leafLit, tint, fog * .5), .5);
  return sh;
}

// A small tree: branching limbs with a crown of leaf dabs, lit on the side that faces the sun or moon.
function tree(c, rnd, K, P, x, y, h, fog = 0) {
  const T = { limbs: new Path2D(), tips: [], arms: [] }, tint = skyAt(P, y - h), [lx, ly] = awayFrom(K, x, y - h, -1);
  grow(rnd, T, x, y + 4, -Math.PI / 2 + (rnd() - .5) * .16, h * .3, h * .09, 4);
  c.fillStyle = rgba(mixc(mixc(P.leafDark, P.rock, .45), tint, fog));
  c.fill(T.limbs);
  for (const [tx, ty] of T.tips) {
    const R = h * (.11 + rnd() * .05);
    for (let i = 0; i < 16; i++) {
      const a = rnd() * TAU, rr = Math.sqrt(rnd()), nx = Math.cos(a) * rr, ny = Math.sin(a) * rr, lit = clamp(.35 + .55 * (nx * lx + ny * ly) - .2 * ny, 0, 1);
      const col = lit < .5 ? mixc(P.leafDark, P.leafMid, lit * 2) : mixc(P.leafMid, P.leafLit, (lit - .5) * (P.night ? 1 : 1.6));
      c.fillStyle = rgba(mixc(col, tint, fog));
      c.beginPath();
      c.ellipse(tx + nx * R, ty - R * .4 + ny * R * .8, R * .42, R * .3, rnd() * 3, 0, TAU);
      c.fill();
    }
  }
}

// Fill a shape and catch the light along its edges.
function solid(c, K, P, path, col, x, y, rim = .7) {
  const [ax, ay] = awayFrom(K, x, y, 3);
  c.fillStyle = rgba(col);
  c.fill(path);
  rimLight(c, r => r.fill(path), ax, ay, P.rim, rim);
}

// A little house with a pitched roof and lit windows. Returns where the windows and the ridge are.
function house(c, K, P, x, y, w, roof, fog) {
  const h = w * .56, rh = w * .42, wall = new Path2D(), top = new Path2D();
  wall.rect(x - w / 2, y - h, w, h);
  top.moveTo(x - w / 2 - w * .08, y - h + 1);
  top.lineTo(x, y - h - rh);
  top.lineTo(x + w / 2 + w * .08, y - h + 1);
  top.closePath();
  solid(c, K, P, wall, farTint(P, PLASTER, y, fog), x, y - h / 2, .5);
  solid(c, K, P, top, farTint(P, roof, y, fog), x, y - h, .6);
  const wins = [[x - w * .22, y - h * .55], [x + w * .22, y - h * .55]], ws = w * .13;
  c.fillStyle = rgba(mixc(LAMP, skyAt(P, y), fog * .6), P.night ? 1 : .85);
  for (const [wx, wy] of wins) c.fillRect(wx - ws / 2, wy - ws / 2, ws, ws * 1.2);
  return { wins, ridge: [x, y - h - rh], fog };
}

// Light dabs travelling a quadratic curve, like messages along a line.
function motes(c, P, [x0, y0, cx, cy, x1, y1], t, speed, n, r) {
  const ls = sprite(LAMP), cs = sprite(P.light);
  for (let k = 0; k < n; k++) {
    const u = (t * speed + k / n) % 1, m = 1 - u, fade = Math.sin(Math.PI * u);
    const x = m * m * x0 + 2 * m * u * cx + u * u * x1, y = m * m * y0 + 2 * m * u * cy + u * u * y1;
    dab(c, ls, x, y, r * 3, .5 * fade);
    dab(c, cs, x, y, r, .9 * fade);
  }
}

// Falling water from y0 to y1: a soft sheet with streaks running down it.
function fall(c, P, x, y0, y1, w, t, seed) {
  const g = c.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, rgba(P.water, .7));
  g.addColorStop(1, rgba(P.water, .1));
  c.fillStyle = g;
  c.fillRect(x - w / 2, y0, w, y1 - y0);
  c.fillStyle = rgba(P.light, .6);
  const len = y1 - y0;
  for (let k = 0; k < 7; k++) {
    const y = y0 + ((t * 240 + k * len / 7 + seed * 37) % len), dx = ((k * 7 + seed) % 5 - 2) * w * .16;
    c.fillRect(x + dx - 1.5, y, 3, 26 * (1 - (y - y0) / len * .6));
  }
}

// Mist drifting slowly across the cloud sea, over everything else.
function mist(c, K, P, t) {
  const s = sprite(mixc(P.cloudLit, skyAt(P, HZ), .4)), span = K.WU + 600;
  for (let k = 0; k < 5; k++) {
    const x = ((t * (10 + k * 3) + k * span / 5) % span) - 300, y = HZ - 30 + (k % 3) * 50;
    c.save();
    c.translate(x, y);
    c.scale(3, 1);
    dab(c, s, 0, 0, 90, P.night ? .14 : .2);
    c.restore();
  }
}

const SCENES = {
  // Virtual Trainer: a barbell on a squat rack, lifted by bunches of balloons that do the reps for it.
  'virtual-trainer': {
    light: (K, P) => (P.night ? { x: K.WU * .8, y: 170 } : { x: K.WU / 2 - 330, y: 500 }),
    paint(c, K, P, rnd) {
      const cx = K.WU / 2, sh = isle(c, rnd, K, P, cx, 690, 860, 300), y0 = sh.topAt(cx);
      tree(c, rnd, K, P, cx - 330, sh.topAt(cx - 330), 230);
      const steel = farTint(P, [64, 72, 78], y0, 0), frame = new Path2D(), bench = new Path2D(), pad = new Path2D();
      for (const d of [-1, 1]) {
        const x = cx + d * 190;
        frame.rect(x - 7, y0 - 210, 14, 212);
        frame.rect(x - 44, y0 - 8, 88, 10);
        frame.rect(d < 0 ? x + 7 : x - 25, y0 - 146, 18, 8);
        frame.rect(d < 0 ? x + 20 : x - 25, y0 - 162, 5, 16);
      }
      bench.rect(cx - 86, y0 - 46, 10, 46);
      bench.rect(cx + 76, y0 - 46, 10, 46);
      pad.rect(cx - 112, y0 - 64, 224, 20);
      solid(c, K, P, frame, steel, cx, y0 - 120);
      solid(c, K, P, bench, steel, cx, y0 - 30);
      solid(c, K, P, pad, farTint(P, ROOFS[1], y0, 0), cx, y0 - 54);
      // A spare plate leaning on the rack, and a pair of dumbbells in the grass.
      const plate = new Path2D(), bells = new Path2D();
      plate.ellipse(cx + 240, y0 - 40, 12, 42, -.25, 0, TAU);
      for (const x of [cx + 320, cx + 368]) {
        bells.rect(x - 16, y0 - 12, 32, 5);
        bells.rect(x - 22, y0 - 20, 9, 20);
        bells.rect(x + 13, y0 - 20, 9, 20);
      }
      solid(c, K, P, plate, farTint(P, ROOFS[0], y0, 0), cx + 240, y0 - 40);
      solid(c, K, P, bells, steel, cx + 344, y0 - 10);
      K.rest = y0 - 152;
    },
    draw(c, K, P, t) {
      const cx = K.WU / 2, f = t % 6.5, lift = f < 1.8 ? ease(f / 1.8) : f < 2.8 ? 1 : f < 4.6 ? 1 - ease((f - 2.8) / 1.8) : 0;
      const y = K.rest - 130 * lift + Math.sin(t * 2.1) * 3 * lift, tilt = Math.sin(t * 1.3) * .03 * lift;
      const steel = farTint(P, [64, 72, 78], y, 0), shine = farTint(P, STEEL, y, 0);
      const at = d => [cx + d * 248, y + Math.sin(tilt) * d * 248];
      // Strings, then the bar, then the balloons over the top.
      c.strokeStyle = rgba(P.light, .55);
      c.lineWidth = 1.5;
      const bunch = d => {
        const [x, by] = at(d);
        return [x + d * 26 + Math.sin(t * .9 + d) * 8, by - 180 + Math.sin(t * 1.4 + d) * 6];
      };
      for (const d of [-1, 1]) {
        const [x, by] = at(d), [bx, bb] = bunch(d);
        c.beginPath();
        for (const ox of [-22, 0, 22]) {
          c.moveTo(x, by);
          c.quadraticCurveTo(x + d * 10, by - 90, bx + ox, bb + 32);
        }
        c.stroke();
      }
      c.save();
      c.translate(cx, y);
      c.rotate(tilt);
      c.fillStyle = rgba(shine);
      c.fillRect(-286, -4, 572, 8);
      for (const d of [-1, 1]) {
        c.fillStyle = rgba(steel);
        c.fillRect(d * 206 - 4, -10, 8, 20);
        c.fillStyle = rgba(farTint(P, ROOFS[0], y, 0));
        c.fillRect(d * 222 - 12, -76, 24, 152);
        c.fillStyle = rgba(farTint(P, ROOFS[1], y, 0));
        c.fillRect(d * 248 - 8, -56, 16, 112);
        c.fillStyle = rgba(P.rim, .5);
        c.fillRect(d * 222 - 12, -76, 24, 4);
        c.fillRect(d * 248 - 8, -56, 16, 4);
      }
      c.restore();
      for (const d of [-1, 1]) {
        const [bx, bb] = bunch(d);
        [[-24, 6], [24, 0], [0, -40]].forEach(([ox, oy], i) => {
          const x = bx + ox, by = bb + oy, col = farTint(P, BALLOONS[(i + (d > 0 ? 3 : 0)) % BALLOONS.length], by, 0);
          c.fillStyle = rgba(col);
          c.beginPath();
          c.ellipse(x, by, 28, 34, ox * .006, 0, TAU);
          c.fill();
          c.fillStyle = rgba(P.light, P.night ? .25 : .45);
          c.beginPath();
          c.ellipse(x - 9, by - 13, 7, 10, -.5, 0, TAU);
          c.fill();
        });
      }
      // A puff of chalk as the bar settles back on the hooks.
      if (f > 4.6 && f < 5.8) {
        const k = (f - 4.6) / 1.2, s = sprite(P.haze);
        for (const d of [-1, 1]) dab(c, s, cx + d * 190, K.rest - k * 20, 30 + k * 40, .35 * (1 - k));
      }
    },
  },

  // The fitness platform: studios on islands of their own, with lights running the lines between them.
  'fitness-platform': {
    light: (K, P) => (P.night ? { x: K.WU * .2, y: 160 } : { x: K.WU / 2 + 120, y: 470 }),
    paint(c, K, P, rnd) {
      const cx = K.WU / 2, homes = [];
      const spots = [[-620, 520, 230, .4], [380, 500, 260, .32], [690, 600, 220, .26], [-320, 610, 300, .18], [40, 660, 450, 0]];
      spots.forEach(([dx, top, w, fog], i) => {
        const sh = isle(c, rnd, K, P, cx + dx, top, w, w * .6, fog), x = cx + dx + (rnd() - .5) * w * .2, side = i % 2 ? -1 : 1;
        tree(c, rnd, K, P, x + side * w * .3, sh.topAt(x + side * w * .3), w * .45, fog);
        homes.push({ ...house(c, K, P, x, sh.topAt(x) + 2, w * .34, ROOFS[i], fog), x });
      });
      homes.sort((a, b) => a.x - b.x);
      K.lines = [];
      for (let i = 1; i < homes.length; i++) {
        const [x0, y0] = homes[i - 1].ridge, [x1, y1] = homes[i].ridge;
        K.lines.push([x0, y0, (x0 + x1) / 2, Math.max(y0, y1) + 70, x1, y1]);
      }
      c.strokeStyle = rgba(farTint(P, WOOD, 500, .2), .8);
      c.lineWidth = 2;
      for (const [x0, y0, mx, my, x1, y1] of K.lines) {
        c.beginPath();
        c.moveTo(x0, y0);
        c.quadraticCurveTo(mx, my, x1, y1);
        c.stroke();
      }
      K.homes = homes;
    },
    draw(c, K, P, t) {
      c.globalCompositeOperation = 'lighter';
      const ls = sprite(LAMP);
      K.homes.forEach((h, i) => {
        for (const [x, y] of h.wins) dab(c, ls, x, y, 22, (P.night ? .5 : .22) * (1 - h.fog * .6) * (.85 + .15 * Math.sin(t * 2.3 + i * 1.7)));
      });
      K.lines.forEach((l, i) => motes(c, P, i % 2 ? [l[4], l[5], l[2], l[3], l[0], l[1]] : l, t + i * .37, .09, 2, 5));
      c.globalCompositeOperation = 'source-over';
    },
  },

  // The saw platform: a mill whose wheel is a saw blade, turned by water that pours from the rock above.
  'industrial-saw-control-platform': {
    light: (K, P) => (P.night ? { x: K.WU * .22, y: 150 } : { x: K.WU / 2 - 380, y: 520 }),
    paint(c, K, P, rnd) {
      const cx = K.WU / 2 - 90, sh = isle(c, rnd, K, P, cx, 630, 720, 300), right = sh.x0 + sh.w;
      const bx = right + 10, by = sh.topAt(right - 40) + 6, R = 128;
      // The spring above, and its water channel down to the wheel.
      const spring = isle(c, rnd, K, P, bx + 170, 330, 200, 120, .12);
      tree(c, rnd, K, P, cx + 90, sh.topAt(cx + 90), 200);
      const hx = cx - 110, hy = sh.topAt(hx), wood = farTint(P, WOOD, hy, 0), mill = new Path2D(), roof = new Path2D();
      mill.rect(hx - 120, hy - 140, 240, 142);
      roof.moveTo(hx - 140, hy - 138);
      roof.lineTo(hx, hy - 230);
      roof.lineTo(hx + 140, hy - 138);
      roof.closePath();
      solid(c, K, P, mill, wood, hx, hy - 70, .5);
      c.strokeStyle = rgba(mixc(wood, [0, 0, 0], .3), .6);
      c.lineWidth = 2;
      for (let x = hx - 100; x < hx + 120; x += 20) {
        c.beginPath();
        c.moveTo(x, hy - 140);
        c.lineTo(x, hy);
        c.stroke();
      }
      solid(c, K, P, roof, farTint(P, ROOFS[0], hy, 0), hx, hy - 180);
      c.fillStyle = rgba(mixc(wood, [0, 0, 0], .55));
      c.fillRect(hx - 24, hy - 76, 48, 76);
      c.fillStyle = rgba(LAMP, P.night ? 1 : .85);
      c.fillRect(hx + 56, hy - 108, 30, 34);
      // Logs waiting their turn, ends out.
      const logs = new Path2D(), rings = new Path2D();
      for (const [ox, oy] of [[0, 0], [36, 0], [72, 0], [18, -32], [54, -32], [36, -64]]) {
        const x = cx - 340 + ox, y = sh.topAt(cx - 300) - 18 + oy;
        logs.moveTo(x + 18, y);
        logs.arc(x, y, 18, 0, TAU);
        rings.moveTo(x + 9, y);
        rings.arc(x, y, 9, 0, TAU);
      }
      solid(c, K, P, logs, farTint(P, [196, 150, 104], hy, 0), cx - 300, hy - 30, .5);
      c.strokeStyle = rgba(wood, .7);
      c.lineWidth = 2;
      c.stroke(rings);
      // The beams that hold the axle out past the lip, behind the blade.
      const arm = new Path2D();
      taper(right - 150, sh.topAt(right - 150), right - 70, by - 16, bx, by, 18, 12, arm);
      taper(right - 60, sh.topAt(right - 60) + 40, right - 20, by + 24, bx, by, 16, 10, arm);
      solid(c, K, P, arm, wood, bx - 40, by, .5);
      K.saw = { bx, by, R, fx: bx + 74, fy: spring.topAt(bx + 74) - 2, wood };
      // The blade: a steel disc with hooked teeth, cut-out slots and a hub, drawn about its own centre.
      const blade = new Path2D(), n = 36;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU, b = ((i + .62) / n) * TAU, e = ((i + 1) / n) * TAU;
        blade.lineTo(Math.cos(a) * R * .9, Math.sin(a) * R * .9);
        blade.lineTo(Math.cos(b) * R, Math.sin(b) * R);
        blade.quadraticCurveTo(Math.cos(e) * R * .99, Math.sin(e) * R * .99, Math.cos(e) * R * .9, Math.sin(e) * R * .9);
      }
      blade.closePath();
      K.blade = blade;
    },
    draw(c, K, P, t) {
      const { bx, by, R, fx, fy } = K.saw, hit = by - Math.sqrt(R * R - (fx - bx) ** 2);
      fall(c, P, fx, fy, hit, 18, t, 1);
      fall(c, P, fx + 6, by + 30, HZ + 30, 22, t, 4);
      c.save();
      c.translate(bx, by);
      c.rotate(t * .7);
      const steel = farTint(P, STEEL, by, 0), g = c.createLinearGradient(-R, -R, R, R);
      g.addColorStop(0, rgba(mixc(steel, P.light, .35)));
      g.addColorStop(.5, rgba(steel));
      g.addColorStop(1, rgba(mixc(steel, [0, 0, 0], .35)));
      c.fillStyle = g;
      c.fill(K.blade);
      c.strokeStyle = rgba(mixc(steel, [0, 0, 0], .3), .5);
      c.lineWidth = 2;
      c.beginPath();
      c.arc(0, 0, R * .4, 0, TAU);
      c.stroke();
      c.strokeStyle = rgba(P.rim, .35);
      c.lineWidth = 2;
      c.beginPath();
      c.arc(0, 0, R * .62, -2.4 - t * .7, -.9 - t * .7);
      c.stroke();
      c.restore();
      c.fillStyle = rgba(K.saw.wood);
      c.beginPath();
      c.arc(bx, by, 22, 0, TAU);
      c.fill();
      c.fillStyle = rgba(P.rim, .6);
      c.beginPath();
      c.arc(bx - 4, by - 4, 6, 0, TAU);
      c.fill();
      // Spray where the water meets the blade, and sawdust drifting off it.
      c.globalCompositeOperation = 'lighter';
      const ws = sprite(P.water), ls = sprite(P.glow);
      dab(c, ws, fx, hit, 30 + Math.sin(t * 7) * 4, .45);
      for (let k = 0; k < 6; k++) {
        const u = ((t * .35 + k / 6) % 1), x = bx - R * .7 - u * 60 + Math.sin(t + k) * 10, y = by + R * .5 + u * 180;
        dab(c, ls, x, y, 6, .6 * (1 - u));
      }
      c.globalCompositeOperation = 'source-over';
    },
  },

  // The .NET upgrade: an old stone tower getting new floors, block by block, with the old ones left standing.
  'dotnet-framework-to-dotnet-8-upgrade': {
    light: (K, P) => (P.night ? { x: K.WU * .78, y: 150 } : { x: K.WU / 2 + 330, y: 500 }),
    paint(c, K, P, rnd) {
      const cx = K.WU / 2 + 60, sh = isle(c, rnd, K, P, cx, 680, 640, 280), tx = cx + 10, ty = sh.topAt(tx);
      tree(c, rnd, K, P, cx + 220, sh.topAt(cx + 220), 170);
      tree(c, rnd, K, P, cx - 250, sh.topAt(cx - 250), 120);
      const old = new Path2D(), fresh = new Path2D(), oldTop = ty - 300, newTop = oldTop - 84;
      old.moveTo(tx - 88, ty + 4);
      old.lineTo(tx - 76, oldTop);
      old.lineTo(tx + 76, oldTop);
      old.lineTo(tx + 88, ty + 4);
      old.closePath();
      solid(c, K, P, old, farTint(P, STONE, ty - 150, 0));
      c.save();
      c.clip(old);
      c.strokeStyle = 'rgba(0,0,0,.22)';
      c.lineWidth = 2;
      for (let y = ty, row = 0; y > oldTop; y -= 26, row++) {
        c.beginPath();
        c.moveTo(tx - 100, y);
        c.lineTo(tx + 100, y);
        for (let x = tx - 100 + (row % 2) * 22; x < tx + 100; x += 44) {
          c.moveTo(x, y);
          c.lineTo(x, y - 26);
        }
        c.stroke();
      }
      for (let i = 0; i < 40; i++) puff(c, tx + (rnd() - .5) * 180, ty - rnd() * rnd() * 200, 10 + rnd() * 12, P.leafDark, .35);
      c.restore();
      // Two rows of new stone, the top one still being laid.
      for (let row = 0; row < 3; row++) {
        const y = oldTop - row * 28, n = row === 2 ? 3 : 4;
        for (let k = 0; k < n; k++) fresh.rect(tx - 76 + k * 38 + (row % 2) * 19 - (row % 2 ? 19 : 0), y - 27, 37, 27);
      }
      solid(c, K, P, fresh, farTint(P, NEW_STONE, newTop, 0), tx, newTop);
      K.wins = [[tx - 30, ty - 210], [tx + 30, ty - 120]];
      c.fillStyle = rgba(LAMP, P.night ? 1 : .8);
      for (const [x, y] of K.wins) {
        c.beginPath();
        c.moveTo(x - 10, y + 16);
        c.lineTo(x - 10, y - 6);
        c.arc(x, y - 6, 10, Math.PI, 0);
        c.lineTo(x + 10, y + 16);
        c.fill();
      }
      // Scaffolding up the sides, and a timber crane on top.
      const wood = farTint(P, WOOD, newTop, 0), poles = new Path2D(), mast = tx + 40, jy = newTop - 150, tip = tx - 230;
      for (const x of [tx - 104, tx + 104]) poles.rect(x - 4, newTop - 30, 8, ty - newTop - 120);
      for (let y = newTop - 10; y < ty - 150; y += 52) poles.rect(tx - 112, y, 224, 6);
      poles.rect(mast - 7, jy, 14, newTop - jy);
      poles.rect(tip, jy - 4, mast - tip + 90, 12);
      poles.rect(mast + 60, jy + 8, 36, 30);
      solid(c, K, P, poles, wood, tx, newTop - 60, .5);
      c.strokeStyle = rgba(wood);
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(tip, jy);
      c.lineTo(mast, jy - 60);
      c.lineTo(mast + 90, jy);
      c.stroke();
      // New blocks stacked where the crane picks them up.
      const stack = new Path2D(), sx = tip + 30, sy = sh.topAt(sx);
      for (const [ox, oy] of [[-40, 0], [0, 0], [-20, -26]]) stack.rect(sx + ox - 18, sy + oy - 26, 37, 27);
      solid(c, K, P, stack, farTint(P, NEW_STONE, sy, 0), sx, sy - 20);
      K.crane = { x: tip + 12, jy, y0: sy - 70, y1: newTop - 70 };
    },
    draw(c, K, P, t) {
      const { x, jy, y0, y1 } = K.crane, f = t % 10, up = ease(f / 6.5), gone = f < 7 ? 1 : 1 - ease((f - 7) / 1), back = f < 9 ? 1 : 0;
      const by = lerp(y0, y1, up), bx = x + Math.sin(t * 1.1) * 5 * up, a = Math.min(gone, back) || ease((f - 9) / 1);
      c.strokeStyle = rgba(P.fg, .7);
      c.lineWidth = 1.6;
      c.beginPath();
      c.moveTo(x, jy + 6);
      c.lineTo(bx, by - 26);
      c.moveTo(bx, by - 26);
      c.lineTo(bx - 16, by - 2);
      c.moveTo(bx, by - 26);
      c.lineTo(bx + 16, by - 2);
      c.stroke();
      c.globalAlpha = a;
      c.fillStyle = rgba(farTint(P, NEW_STONE, by, 0));
      c.fillRect(bx - 18, by - 2, 37, 27);
      c.fillStyle = rgba(P.rim, .6);
      c.fillRect(bx - 18, by - 2, 37, 3);
      c.globalAlpha = 1;
      c.globalCompositeOperation = 'lighter';
      for (const [wx, wy] of K.wins) dab(c, sprite(LAMP), wx, wy, 26, (P.night ? .45 : .2) * (.9 + .1 * Math.sin(t * 2 + wx)));
      c.globalCompositeOperation = 'source-over';
    },
  },

  // The pipeline templates: one aqueduct of identical arches, carrying water from a spring out to the islands that
  // drink from it.
  'azure-devops-pipeline-templates': {
    light: (K, P) => (P.night ? { x: K.WU * .5, y: 140 } : { x: K.WU / 2 - 120, y: 520 }),
    paint(c, K, P, rnd) {
      const cx = K.WU / 2, spring = isle(c, rnd, K, P, cx - 640, 440, 360, 240), y = 470, x0 = cx - 520, x1 = cx + 150;
      tree(c, rnd, K, P, cx - 730, spring.topAt(cx - 730), 190);
      const stone = farTint(P, STONE, 600, .08), span = (x1 - x0) / 6, body = new Path2D();
      body.rect(x0, y, x1 - x0 + 40, 1000 - y);
      for (let i = 0; i < 6; i++) {
        const r = span / 2 - 14, ax = x0 + span * i + span / 2, ay = y + 60 + r;
        body.moveTo(ax - r, 1000);
        body.lineTo(ax - r, ay);
        body.arc(ax, ay, r, Math.PI, 0);
        body.lineTo(ax + r, 1000);
        body.closePath();
      }
      // The distribution tower at the end, where the water splits three ways.
      body.rect(x1, y - 50, 70, 1000 - y + 50);
      const [ax, ay] = awayFrom(K, cx, y, 3);
      c.fillStyle = rgba(stone);
      c.fill(body, 'evenodd');
      c.save();
      c.clip(body, 'evenodd');
      c.strokeStyle = 'rgba(0,0,0,.16)';
      c.lineWidth = 2;
      for (let yy = y + 30, row = 0; yy < 1000; yy += 30, row++) {
        c.beginPath();
        c.moveTo(x0, yy);
        c.lineTo(x1 + 70, yy);
        c.stroke();
      }
      const fade = c.createLinearGradient(0, y, 0, HZ);
      fade.addColorStop(0, rgba(P.haze, 0));
      fade.addColorStop(1, rgba(P.haze, P.night ? .3 : .45));
      c.fillStyle = fade;
      c.fillRect(x0, y, x1 - x0 + 80, 1000 - y);
      c.restore();
      rimLight(c, r => r.fill(body, 'evenodd'), ax, ay, P.rim, .7);
      // The pool the spring rises in.
      c.globalCompositeOperation = 'lighter';
      puff(c, cx - 620, spring.topAt(cx - 620) - 6, 60, P.water, .4);
      c.globalCompositeOperation = 'source-over';
      // Three islands downstream, each with a home of its own.
      const sp = [[cx + 380, 600, 220, 0], [cx + 600, 690, 200, .08], [cx + 790, 590, 170, .16]];
      K.spouts = sp.map(([ix, top, w, fog], i) => {
        const sh = isle(c, rnd, K, P, ix, top, w, w * .6, fog), hx = ix + w * .16;
        tree(c, rnd, K, P, ix + w * .38, sh.topAt(ix + w * .38), w * .5, fog);
        house(c, K, P, hx, sh.topAt(hx) + 2, w * .3, ROOFS[i + 2], fog);
        const sx = x1 + 70, sy = y - 30 + i * 30, ex = ix - w * .2, ey = sh.topAt(ex) - 4, k = (ey - sy) / (ex - sx) ** 2;
        return { sx, sy, ex, ey, k };
      });
      K.duct = { x0: cx - 470, x1, y };
    },
    draw(c, K, P, t) {
      const { x0, x1, y } = K.duct;
      c.lineCap = 'round';
      c.strokeStyle = rgba(P.water, .8);
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(x0, y - 2);
      c.lineTo(x1 + 30, y - 2);
      c.stroke();
      c.setLineDash([16, 30]);
      c.lineDashOffset = -t * 90;
      c.strokeStyle = rgba(P.light, .8);
      c.lineWidth = 3;
      c.stroke();
      for (const { sx, sy, ex, k } of K.spouts) {
        c.beginPath();
        c.moveTo(sx, sy);
        for (let x = sx; x <= ex; x += 8) c.lineTo(x, sy + k * (x - sx) ** 2);
        c.setLineDash([]);
        c.strokeStyle = rgba(P.water, .55);
        c.lineWidth = 5;
        c.stroke();
        c.setLineDash([12, 22]);
        c.strokeStyle = rgba(P.light, .7);
        c.lineWidth = 2.5;
        c.stroke();
      }
      c.setLineDash([]);
      c.globalCompositeOperation = 'lighter';
      const ws = sprite(P.water);
      for (const { ex, ey } of K.spouts) dab(c, ws, ex, ey, 22 + Math.sin(t * 6 + ex) * 3, .5);
      c.globalCompositeOperation = 'source-over';
    },
  },

  // The sky islands themselves: an easel on an island, with a brush finishing a painting of an island with a lantern
  // tree, and the painting's lights getting loose and drifting off into the real sky.
  'sky-islands': {
    light: (K, P) => (P.night ? { x: K.WU * .78, y: 160 } : { x: K.WU / 2 - 300, y: 470 }),
    paint(c, K, P, rnd) {
      const cx = K.WU / 2 + 60, sh = isle(c, rnd, K, P, cx, 650, 780, 300);
      tree(c, rnd, K, P, cx - 330, sh.topAt(cx - 330), 250);
      const ex = cx + 110, ey = sh.topAt(ex), wood = farTint(P, WOOD, ey - 200, 0);
      // Three legs, one behind and two in front, and the ledge the painting stands on.
      solid(c, K, P, taper(ex + 30, ey - 380, ex + 50, ey - 190, ex + 70, ey + 4, 9, 11), mixc(wood, [0, 0, 0], .3), ex, ey - 200, .4);
      const legs = taper(ex - 50, ey - 390, ex - 80, ey - 190, ex - 110, ey + 4, 11, 13);
      taper(ex + 50, ey - 390, ex + 80, ey - 190, ex + 110, ey + 4, 11, 13, legs);
      legs.rect(ex - 150, ey - 168, 300, 12);
      solid(c, K, P, legs, wood, ex, ey - 200, .5);
      // The painting: a frame, then a small sky island inside it, unfinished along the right where the bare canvas
      // still shows.
      const w = 270, h = 200, bx = ex - w / 2, by = ey - 166 - h, frame = new Path2D();
      frame.rect(bx - 10, by - 10, w + 20, h + 20);
      solid(c, K, P, frame, mixc(wood, [0, 0, 0], .15), ex, by + h / 2, .6);
      c.save();
      c.beginPath();
      c.rect(bx, by, w, h);
      c.clip();
      c.fillStyle = rgba(P.night ? [196, 186, 166] : [238, 228, 206]);
      c.fillRect(bx, by, w, h);
      const edge = [];
      for (let y = by - 10; y <= by + h + 10; y += 12) edge.push([bx + w * .7 + Math.sin(y * .09) * 10 + (rnd() - .5) * 16, y]);
      c.beginPath();
      c.moveTo(bx, by - 10);
      for (const [x, y] of edge) c.lineTo(x, y);
      c.lineTo(bx, by + h + 10);
      c.clip();
      const g = c.createLinearGradient(0, by, 0, by + h);
      for (const [o, col] of P.sky) g.addColorStop(o, rgba(col));
      c.fillStyle = g;
      c.fillRect(bx, by, w, h);
      c.globalCompositeOperation = 'lighter';
      puff(c, bx + w * .3, by + h * .4, 60, P.light, .45);
      c.globalCompositeOperation = 'source-over';
      const mx = bx + w * .38, mini = isle(c, rnd, K, P, mx, by + h * .6, 130, 64);
      tree(c, rnd, K, P, mx + 6, mini.topAt(mx + 6), 64);
      const cl = c.createLinearGradient(0, by + h * .78, 0, by + h);
      cl.addColorStop(0, rgba(P.cloudLit, 0));
      cl.addColorStop(1, rgba(P.cloudLit, .8));
      c.fillStyle = cl;
      c.fillRect(bx, by + h * .7, w, h * .3);
      c.restore();
      // A palette on the ledge, and a pot of brushes in the grass.
      for (const [k, col] of [[0, ROOFS[0]], [1, ROOFS[2]], [2, ROOFS[1]], [3, PLASTER]]) {
        c.fillStyle = rgba(farTint(P, col, ey, 0));
        c.beginPath();
        c.ellipse(ex - 120 + k * 16, ey - 172, 7, 4, 0, 0, TAU);
        c.fill();
      }
      const px = ex + 190, py = sh.topAt(px), pot = new Path2D();
      pot.moveTo(px - 22, py - 46);
      pot.lineTo(px + 22, py - 46);
      pot.lineTo(px + 17, py + 2);
      pot.lineTo(px - 17, py + 2);
      pot.closePath();
      c.strokeStyle = rgba(wood);
      c.lineWidth = 4;
      c.beginPath();
      for (const [dx, tip] of [[-8, -100], [6, -88], [12, -112]]) {
        c.moveTo(px + dx * .4, py - 30);
        c.lineTo(px + dx, py + tip);
      }
      c.stroke();
      solid(c, K, P, pot, farTint(P, ROOFS[1], py, 0), px, py - 22, .6);
      // The painted lights start inside the picture.
      K.easel = { bx, by, w, h, edge: bx + w * .7, lights: [[.22, .3], [.5, .22], [.32, .55], [.6, .46], [.14, .62], [.45, .7]] };
    },
    draw(c, K, P, t) {
      const { bx, by, w, h, edge, lights } = K.easel;
      c.globalCompositeOperation = 'lighter';
      const ls = sprite(LAMP), cs = sprite(P.light);
      // Each light sits in the painting, glows, then lifts off and wanders up into the sky, getting bigger as it goes.
      lights.forEach(([u, v], i) => {
        const f = (t * .09 + i / lights.length) % 1, rise = ease(clamp((f - .3) / .7, 0, 1));
        const x = bx + w * u + Math.sin(t * .7 + i * 2) * 40 * rise + (i % 2 ? 1 : -1) * 120 * rise;
        const y = by + h * v - rise * (380 + i * 30), a = Math.min(1, f / .1) * (1 - Math.max(0, (f - .85) / .15));
        dab(c, ls, x, y, 10 + rise * 18, (.35 + .25 * Math.sin(t * 3 + i)) * a);
        dab(c, cs, x, y, 3 + rise * 4, .9 * a);
      });
      c.globalCompositeOperation = 'source-over';
      // The brush, on its own, laying short strokes down the unfinished edge.
      const s = t % 1.6, stroke = Math.min(1, s / 1.1), row = Math.floor(t / 1.6) % 5;
      const tx = edge + 6 + stroke * 22 + Math.sin(row * 2.3) * 6, ty = by + 30 + row * 34 + Math.sin(stroke * Math.PI) * 6 - (s > 1.1 ? (s - 1.1) * 30 : 0);
      const ang = -.9 + Math.sin(t * 1.7) * .08, len = 150, hx = tx + Math.cos(ang) * len, hy = ty + Math.sin(ang) * len;
      c.lineCap = 'round';
      c.strokeStyle = rgba(farTint(P, WOOD, ty, 0));
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(tx + Math.cos(ang) * 26, ty + Math.sin(ang) * 26);
      c.lineTo(hx, hy);
      c.stroke();
      c.strokeStyle = rgba(farTint(P, STEEL, ty, 0));
      c.lineWidth = 8;
      c.beginPath();
      c.moveTo(tx + Math.cos(ang) * 16, ty + Math.sin(ang) * 16);
      c.lineTo(tx + Math.cos(ang) * 30, ty + Math.sin(ang) * 30);
      c.stroke();
      c.strokeStyle = rgba(skyAt(P, (ty - by) * 5));
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(tx, ty);
      c.lineTo(tx + Math.cos(ang) * 16, ty + Math.sin(ang) * 16);
      c.stroke();
      c.lineCap = 'butt';
    },
  },

  // The missing page: a mooring post with a snapped rope, and the little island it held drifting off in the distance.
  lost: {
    light: (K, P) => (P.night ? { x: K.WU * .74, y: 150 } : { x: K.WU / 2 + 240, y: 500 }),
    paint(c, K, P, rnd) {
      const cx = K.WU / 2 - 230, sh = isle(c, rnd, K, P, cx, 640, 620, 280), right = sh.x0 + sh.w;
      tree(c, rnd, K, P, cx - 160, sh.topAt(cx - 160), 230);
      // The drifting island is painted once on a canvas of its own, so it can bob without repainting.
      const ix = K.WU / 2 + 330, top = 440, w = 190, bx = ix - w / 2 - 30, by = top - 140, bw = w + 60, bh = w * .6 + 230;
      const s = c.getTransform().a, far = makeCanvas(), f = far.getContext('2d');
      far.width = Math.ceil(bw * s);
      far.height = Math.ceil(bh * s);
      f.setTransform(s, 0, 0, s, -bx * s, -by * s);
      const fr = seeded(404), fsh = isle(f, fr, K, P, ix, top, w, w * .6, .3), hx = ix - w * .12;
      tree(f, fr, K, P, ix + w * .28, fsh.topAt(ix + w * .28), w * .55, .3);
      const home = house(f, K, P, hx, fsh.topAt(hx) + 2, w * .36, ROOFS[2], .3);
      K.far = { cv: far, bx, by, bw, bh, wins: home.wins };
      // The post at the island's lip, with its lantern.
      const px = right - 90, py = sh.topAt(px), wood = farTint(P, WOOD, py, 0), post = new Path2D();
      post.rect(px - 9, py - 124, 18, 128);
      post.rect(px - 14, py - 132, 28, 10);
      post.rect(px + 9, py - 112, 30, 5);
      solid(c, K, P, post, wood, px, py - 60, .5);
      c.fillStyle = rgba(mixc(wood, [0, 0, 0], .4));
      c.fillRect(px - 10, py - 70, 20, 16);
      K.post = { x: px, y: py - 62, lamp: [px + 34, py - 92] };
    },
    draw(c, K, P, t) {
      const F = K.far, bob = Math.sin(t * .5) * 8, sway = Math.sin(t * .4) * .02;
      c.save();
      c.translate(F.bx + F.bw / 2, F.by + bob);
      c.rotate(sway);
      c.drawImage(F.cv, -F.bw / 2, 0, F.bw, F.bh);
      c.restore();
      // The rope: tied round the post, then sagging out over the edge to a frayed end.
      const { x, y, lamp } = K.post, ex = x + 210 + Math.sin(t * .6) * 10, ey = y + 150 + Math.sin(t * .8) * 6, rope = rgba(farTint(P, [150, 116, 78], y, 0));
      c.strokeStyle = rope;
      c.lineCap = 'round';
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(x + 8, y);
      c.quadraticCurveTo(x + 120, y + 30 + Math.sin(t * .6) * 6, ex, ey);
      c.stroke();
      c.lineWidth = 2;
      c.beginPath();
      for (const d of [-1, 0, 1]) {
        c.moveTo(ex, ey);
        c.lineTo(ex + 10 + d * 3, ey + 14 + d * 6 + Math.sin(t * 2 + d) * 2);
      }
      c.stroke();
      // The lantern on the post, swinging a little, and the far island's windows.
      const lx = lamp[0] + Math.sin(t * 1.2) * 3, ly = lamp[1] + 14;
      c.strokeStyle = rgba(P.fg, .6);
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(lamp[0], lamp[1]);
      c.lineTo(lx, ly);
      c.stroke();
      c.fillStyle = rgba(LAMP, P.night ? 1 : .9);
      c.fillRect(lx - 6, ly, 12, 16);
      c.globalCompositeOperation = 'lighter';
      const ls = sprite(LAMP);
      dab(c, ls, lx, ly + 8, 46, P.night ? .55 : .3);
      for (const [wx, wy] of F.wins) dab(c, ls, wx, wy + bob, 18, (P.night ? .45 : .2) * (.85 + .15 * Math.sin(t * 2.3 + wx)));
      c.globalCompositeOperation = 'source-over';
    },
  },
};

export const hasScene = slug => slug in SCENES;

/** A scene for one project, for a canvas of the given aspect ratio (width over height). */
export function makeScene(slug, aspect) {
  const S = SCENES[slug], K = { WU: 1000 * aspect, EX: 0, s: 1 };
  return {
    paint(c, P) {
      K.L = S.light(K, P);
      const rnd = seeded(slug.length * 131 + 7);
      sky(c, K, P, rnd);
      S.paint(c, K, P, rnd);
      sea(c, K, P, rnd);
      grain(c, P.night ? .05 : .04, 'overlay');
    },
    draw(c, P, t) {
      S.draw(c, K, P, t);
      mist(c, K, P, t);
    },
  };
}

/** Plays a project's scene in a canvas: paints the still parts once per size and theme, then draws the moving parts
 *  over them while it is on screen. Runs in a worker on a canvas handed over by the page, or on the page itself. Takes
 *  messages: size {w, h, night}, theme {night}, on {on}. */
export function playScene(cv, slug, reduce) {
  const ctx = cv.getContext('2d'), base = makeCanvas();
  // Workers have no requestAnimationFrame in some browsers; a timer at the same rate stands in.
  const next = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : fn => setTimeout(() => fn(performance.now()), 32);
  let scene = null, P = null, aspect = 1, on = false, ticking = false, last = 0;
  const scale = () => cv.height / 1000;

  function render(now) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(base, 0, 0);
    ctx.setTransform(scale(), 0, 0, scale(), 0, 0);
    scene.draw(ctx, P, reduce ? 2 : now / 1000);
  }
  function frame(now) {
    ticking = false;
    if (!on) return;
    // Thirty frames a second is plenty for things this slow.
    if (now - last >= 32) {
      last = now;
      render(now);
    }
    kick();
  }
  function kick() {
    if (ticking || !on || reduce || !scene) return;
    ticking = true;
    next(frame);
  }
  function paint() {
    scene = makeScene(slug, aspect);
    const b = base.getContext('2d');
    b.setTransform(scale(), 0, 0, scale(), 0, 0);
    scene.paint(b, P);
    render(performance.now());
    kick();
  }
  return m => {
    if (m.type === 'size') {
      cv.width = base.width = m.w;
      cv.height = base.height = m.h;
      aspect = m.w / m.h;
      P = m.night ? PAL.night : PAL.dusk;
      paint();
    } else if (m.type === 'theme') {
      P = m.night ? PAL.night : PAL.dusk;
      if (scene) paint();
    } else if (m.type === 'on') {
      on = m.on;
      kick();
    }
  };
}
