// The sky train: three little carriages on a ribbon of rail strung through the far islands, from the stackhouses out to
// the lighthouse, or on a phone to the little isle with one tree on it. It runs to a timetable kept by the real clock,
// so everyone looking at the world sees it at the same moment: it leaves the stackhouses on every even minute and comes
// back on every odd one, TRIP seconds each way, and waits at the end of the line for the rest of the minute. It lets
// off a puff of cloud as it pulls out, and a click on it rings its bell and lets off another. The rail is painted with
// the far spires, behind the nearer ones; the train is drawn on the back canvas in far units, cut out where those
// spires stand in front.

import { TAU, clamp, dab, lerp, mixc, rgba, skyAt, smoothPath, sprite } from "./core";
import { D_FAR } from "./layers";
import { FIRE } from "./depth";
import { LAMP, PLASTER, ROOFS, WOOD, farTint } from "./whimsy";

// Seconds from one end of the line to the other, of them getting up to speed and slowing down again, and of the
// timetable, which sends the train out and back once.
const TRIP = 36,
  RAMP = 5,
  ROUND = 120;
// Each carriage's length and height and the gap between them, in far units at full size.
const CAR = 17,
  TALL = 7,
  GAP = 2.5,
  CARS = 3;
const FOG = 0.24;

// The line, laid out once per screen: from the side of a stackhouse partway up, clear of the island and the washing
// line, to the foot of the lighthouse, in a gentle swoop up over the gap and a wave, level at either end for the
// platforms. On a phone the tree's crown fills the gap to the sky mill, so the line runs from the top of the stack over
// it to the little isle with the one tree on it, which the far painter puts at 0.62 across and 470 high. Kept as
// points, with how far along the rail each one is.
export function buildRail(K) {
  const W = K.wh,
    ws = W.ws,
    sy = K.phone ? 0 : 360,
    H0 = W.stack.houses.slice(2).reduce((a, b) => (Math.abs(b.y - sy) < Math.abs(a.y - sy) ? b : a)),
    end = K.phone ? [K.WU * 0.62 + 22, 471] : [W.lh.x - 12 * ws, W.lh.base],
    side = Math.sign(end[0] - H0.x),
    a = [H0.x + side * (H0.w / 2 + 4 * ws), H0.y - 1],
    rise = K.phone ? 10 : 26,
    wave = K.phone ? 0 : 12,
    n = 120,
    pts = [],
    at = [0];
  for (let i = 0; i <= n; i++) {
    const u = i / n,
      k = Math.sin(Math.PI * u) ** 2;
    pts.push([
      lerp(a[0], end[0], u),
      lerp(a[1], end[1], u * u * (3 - 2 * u)) - rise * k - wave * Math.sin(TAU * u) * k,
    ]);
    if (i) at.push(at[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  }
  const len = (CARS * CAR + (CARS - 1) * GAP) * ws;
  K.rail = { pts, at, L: at[n], len, ws };
}

// The point `d` along the rail.
function along(R, d) {
  d = clamp(d, 0, R.L);
  let i = 1;
  while (i < R.at.length - 1 && R.at[i] < d) i++;
  const u = (d - R.at[i - 1]) / (R.at[i] - R.at[i - 1] || 1),
    p = R.pts[i - 1],
    q = R.pts[i];
  return [lerp(p[0], q[0], u), lerp(p[1], q[1], u)];
}

// The rail: a thin deck with a brighter running edge, held up by stays that hang down into the haze, and at night a
// small lamp now and then along it.
export function paintRail(c, K, P) {
  const R = K.rail,
    ws = R.ws,
    path = smoothPath(R.pts, false),
    y = R.pts[0][1];
  c.save();
  c.lineCap = "round";
  c.lineWidth = 0.9 * ws;
  for (let d = 20 * ws; d < R.L - 20 * ws; d += 46 * ws) {
    const [x, py] = along(R, d),
      g = c.createLinearGradient(0, py, 0, py + 60 * ws);
    g.addColorStop(0, rgba(farTint(P, WOOD, py, FOG + 0.1), 0.7));
    g.addColorStop(1, rgba(farTint(P, WOOD, py, FOG + 0.1), 0));
    c.strokeStyle = g;
    c.beginPath();
    c.moveTo(x, py);
    c.lineTo(x, py + 60 * ws);
    c.stroke();
  }
  c.strokeStyle = rgba(farTint(P, WOOD, y, FOG));
  c.lineWidth = 2.4 * ws;
  c.stroke(path);
  c.strokeStyle = rgba(farTint(P, mixc(WOOD, PLASTER, 0.6), y, FOG));
  c.lineWidth = 0.8 * ws;
  c.translate(0, -1 * ws);
  c.stroke(path);
  c.restore();
  if (!P.night) return;
  c.globalCompositeOperation = "lighter";
  const fs = sprite(FIRE);
  for (let d = 40 * ws; d < R.L - 30 * ws; d += 92 * ws) {
    const [x, py] = along(R, d);
    dab(c, fs, x, py - 2 * ws, 7 * ws, 0.5);
  }
  c.globalCompositeOperation = "source-over";
}

export function makeTrain() {
  return { lo: 0, dir: 1, moving: false, puffs: [], bell: 0 };
}

// How far through a trip the train is, `s` seconds after it set off: speeding up, running, then slowing down.
function run(s) {
  const v = 1 / (TRIP - RAMP);
  if (s < RAMP) return (0.5 * v * s * s) / RAMP;
  if (s > TRIP - RAMP) return 1 - (0.5 * v * (TRIP - s) ** 2) / RAMP;
  return v * (s - RAMP / 2);
}

// A puff of cloud from the roof of the carriage at the front.
function puffOut(T, K) {
  const R = K.rail,
    [x, y] = along(R, T.dir > 0 ? T.lo + R.len - 4 * R.ws : T.lo + 4 * R.ws);
  for (let i = 0; i < 3; i++) T.puffs.push({ x: x - T.dir * i * 3 * R.ws, y: y - TALL * R.ws, age: -i * 0.25 });
}

// Where the timetable has the train by the real clock: `lo` is how far along the rail its stackhouse end is.
export function updateTrain(Lf, K, dt) {
  const T = Lf.train,
    R = K.rail,
    p = (((Date.now() / 1000) % ROUND) + ROUND) % ROUND,
    out = p < ROUND / 2,
    s = out ? p : p - ROUND / 2,
    f = s < TRIP ? run(s) : 1,
    span = R.L - R.len,
    moving = s < TRIP;
  T.lo = out ? span * f : span * (1 - f);
  T.dir = out ? 1 : -1;
  if (moving && !T.moving && s < 1) puffOut(T, K);
  T.moving = moving;
  T.bell = Math.max(0, T.bell - dt);
  for (const q of T.puffs) {
    q.age += dt;
    q.y -= 7 * R.ws * dt;
  }
  T.puffs = T.puffs.filter((q) => q.age < 3);
}

// A click on the train: its bell, and a puff of cloud.
export function ring(Lf, K) {
  const T = Lf.train;
  if (T.bell > 0) return;
  T.bell = 0.6;
  puffOut(T, K);
  Lf.sfx.push(["trainbell", along(K.rail, T.lo + K.rail.len / 2)[0]]);
}

// The carriages, each laid along the rail where its two ends are, cream above and painted below, with a darker roof
// and a row of lit windows. The front one carries a lamp, the back one a red light.
export function drawTrain(c, Lf, K, P) {
  const T = Lf.train,
    R = K.rail,
    ws = R.ws,
    H = Lf.hits,
    cars = [];
  for (let i = 0; i < CARS; i++) {
    const d = T.lo + (CAR / 2 + i * (CAR + GAP)) * ws,
      p = along(R, d - (CAR / 2) * ws),
      q = along(R, d + (CAR / 2) * ws);
    cars.push({ x: (p[0] + q[0]) / 2, y: (p[1] + q[1]) / 2, a: Math.atan2(q[1] - p[1], q[0] - p[0]) });
  }
  const x0 = Math.min(...cars.map((k) => k.x)) - 30 * ws,
    x1 = Math.max(...cars.map((k) => k.x)) + 30 * ws,
    y0 = Math.min(...cars.map((k) => k.y)) - 40 * ws,
    y1 = Math.max(...cars.map((k) => k.y)) + 10 * ws,
    y = cars[1].y,
    w = CAR * ws,
    h = TALL * ws;
  c.save();
  // A clip costs by the area it covers, so the spires' cutout is first narrowed to the train.
  c.beginPath();
  c.rect(x0, y0, x1 - x0, y1 - y0);
  c.clip();
  c.clip(K.far.clip, "evenodd");
  const body = farTint(P, ROOFS[1], y, FOG),
    top = farTint(P, PLASTER, y, FOG),
    roof = farTint(P, [40, 46, 52], y, FOG * 0.8),
    win = P.night ? LAMP : mixc(LAMP, skyAt(P, y), 0.3);
  for (const k of cars) {
    c.save();
    c.translate(k.x, k.y);
    c.rotate(k.a);
    c.fillStyle = rgba(top);
    c.beginPath();
    c.roundRect(-w / 2, -h - 1.4 * ws, w, h, 2 * ws);
    c.fill();
    c.fillStyle = rgba(body);
    c.fillRect(-w / 2, -h * 0.45 - 1.4 * ws, w, h * 0.45);
    c.fillStyle = rgba(roof);
    c.beginPath();
    c.roundRect(-w / 2 - 0.6 * ws, -h - 2.4 * ws, w + 1.2 * ws, 1.6 * ws, 0.8 * ws);
    c.fill();
    c.fillStyle = rgba(win);
    for (let j = 0; j < 3; j++) c.fillRect(-w / 2 + 2.5 * ws + j * 3.8 * ws, -h * 0.85 - 1.4 * ws, 2.4 * ws, 2 * ws);
    c.restore();
  }
  c.globalCompositeOperation = "lighter";
  const ls = sprite(LAMP);
  if (P.night) for (const k of cars) dab(c, ls, k.x, k.y - h * 0.6, 14 * ws, 0.35);
  const front = cars[T.dir > 0 ? CARS - 1 : 0],
    back = cars[T.dir > 0 ? 0 : CARS - 1],
    fx = front.x + (T.dir * w * Math.cos(front.a)) / 2,
    fy = front.y + (T.dir * w * Math.sin(front.a)) / 2 - h * 0.4;
  dab(c, sprite(FIRE), fx, fy, (P.night ? 12 : 7) * ws, P.night ? 0.8 : 0.5);
  dab(c, sprite([255, 90, 70]), back.x - (T.dir * w) / 2, back.y - h * 0.4, 4 * ws, P.night ? 0.7 : 0.4);
  c.globalCompositeOperation = "source-over";
  c.restore();
  const ps = sprite(mixc(P.cloudLit, skyAt(P, y), 0.35));
  for (const q of T.puffs)
    if (q.age > 0) dab(c, ps, q.x, q.y, (3 + q.age * 4) * ws, 0.5 * Math.min(1, q.age * 5) * (1 - q.age / 3));
  for (const k of cars) H.push(["train", k.x, k.y - h / 2, 11 * ws, D_FAR]);
}
