// The visitor's own constellation. After dark a handful of brighter stars hang in the open sky, and a press on one and
// a drag from star to star joins them up with a line of light. From the keyboard, a press on a star, the arrow keys
// and a second press do the same. Let go with at least two lines drawn and the shape
// glows, the page gives it a name and keeps it, and it is back in the sky on every later night. Drawing another one
// replaces it. The stars live in the high sky, which hardly moves with the pointer.

import { clamp, dab, rgba, seeded, sprite } from "./core";
import { drawStar } from "./whimsy";

const BLUE = [170, 210, 255],
  WHITE = [236, 244, 255];

// The stars to join up: scattered through the open sky, clear of the giant, the door, the barbell, the moon, the
// sheep's cloud and the crown, of the bar along the top of the page, of the name and the links on a wide screen, and
// of the buttons on a phone. `saved` is the visitor's constellation, as points with x a share of the world's width,
// and pairs of points joined up.
export function makeStars(K, saved) {
  const rnd = seeded(61),
    { WU, phone, s } = K,
    ss = Math.max(s, 0.7),
    T = K.tree,
    g = K.far.giant,
    W = K.wh;
  const keep = [
    [g.x, g.y, g.r * 2.6],
    [WU * (phone ? 0.84 : 0.87), phone ? 110 : 140, 80],
    [K.flock.x, K.flock.y, 90 * ss],
    ...T.clusters.map(([x, y, r]) => [x, y, r + 26 * s]),
  ];
  if (W.door) keep.push([W.door.x, W.door.y - W.door.h / 2, 70 * ss]);
  if (W.lifter) keep.push([W.lifter.x, W.lifter.y, W.lifter.r + 30]);
  const [x0, x1, y0, y1, n, gap] = phone
    ? [0.08, 0.92, 140, 350, 10, 50]
    : [0.3, 0.78, 45, 290, 14, clamp(WU * 0.042, 48, 68)];
  const pts = [];
  for (let i = 0; i < 400 && pts.length < n; i++) {
    const x = WU * (x0 + rnd() * (x1 - x0)),
      y = y0 + rnd() * (y1 - y0);
    if (y * K.U < 76 || (!phone && ((y > 200 && x < WU * 0.38) || (y < 80 && x > WU * 0.55)))) continue;
    if (
      keep.some(([kx, ky, r]) => Math.hypot(x - kx, y - ky) < r) ||
      pts.some((p) => Math.hypot(x - p[0], y - p[1]) < gap)
    )
      continue;
    pts.push([x, y, rnd() * 6]);
  }
  return {
    pts,
    y0,
    y1,
    R: 24 * ss,
    mine: saved && { pts: saved.pts.map(([u, y]) => [u * WU, y]), links: saved.links },
    link: null,
    near: -1,
    flash: 0,
  };
}

// The star under a point in the high sky, if any.
export function starAt(Lf, x, y) {
  const S = Lf.stars;
  let best = -1,
    bd = S.R;
  S.pts.forEach(([sx, sy], i) => {
    const d = Math.hypot(sx - x, sy - y);
    if (d < bd) [best, bd] = [i, d];
  });
  return best;
}

// Each star rings a note by how high it hangs.
function ring(Lf, i) {
  const S = Lf.stars,
    [x, y] = S.pts[i];
  Lf.sfx.push(["star", x, Math.round(clamp((S.y1 - y) / (S.y1 - S.y0), 0, 1) * 9)]);
}

// A press on a star starts joining up from it. `key` is whether the keyboard is doing it.
export function linkFrom(Lf, i) {
  Lf.stars.link = { at: i, links: [], x: Lf.stars.pts[i][0], y: Lf.stars.pts[i][1], key: false };
  ring(Lf, i);
}

// Dragged to (x, y): reaching another star draws a line to it, unless that line is drawn already.
export function linkTo(Lf, x, y) {
  const S = Lf.stars,
    L = S.link;
  if (!L) return;
  L.x = x;
  L.y = y;
  const j = starAt(Lf, x, y);
  if (j < 0 || j === L.at) return;
  if (!L.links.some(([a, b]) => (a === L.at && b === j) || (a === j && b === L.at))) {
    L.links.push([L.at, j]);
    ring(Lf, j);
  }
  L.at = j;
}

// Let go. Two lines or more make a constellation, which glows and replaces the last one; it comes back as the points
// it joins, with x as a share of the world's width, for the page to keep. Anything less fades away.
export function linkDone(Lf, K) {
  const S = Lf.stars,
    L = S.link;
  S.link = null;
  if (!L || L.links.length < 2) return null;
  const used = [...new Set(L.links.flat())],
    pts = used.map((i) => S.pts[i].slice(0, 2));
  const links = L.links.map(([a, b]) => [used.indexOf(a), used.indexOf(b)]);
  S.mine = { pts, links };
  S.flash = 1;
  Lf.sfx.push(["named", pts.reduce((a, p) => a + p[0], 0) / pts.length]);
  return { pts: pts.map(([x, y]) => [+(x / K.WU).toFixed(4), Math.round(y)]), links };
}

export function updateStars(Lf, K, dt, ptr) {
  const S = Lf.stars,
    q = ptr(0);
  S.flash = Math.max(0, S.flash - dt / 2.4);
  // A star brightens a little when the pointer comes near it.
  S.near = q ? starAt(Lf, q.x, q.y) : -1;
}

// After dark only: the stars to join, the visitor's constellation, and any lines being drawn now, with the last one
// following the pointer.
export function drawStars(c, Lf, K, P, t) {
  const S = Lf.stars;
  if (!P.night || !S) return;
  const ss = Math.max(K.s, 0.7),
    glow = sprite(BLUE),
    M = S.mine,
    L = S.link,
    f = S.flash;
  const line = (pts, links, a, w) => {
    c.strokeStyle = rgba(WHITE, a);
    c.lineWidth = w;
    c.beginPath();
    for (const [i, j] of links) {
      c.moveTo(pts[i][0], pts[i][1]);
      c.lineTo(pts[j][0], pts[j][1]);
    }
    c.stroke();
  };
  c.lineCap = "round";
  if (M) {
    line(M.pts, M.links, 0.34 + 0.5 * f, (1.2 + 1.6 * f) * ss);
    c.globalCompositeOperation = "lighter";
    for (const [x, y] of M.pts) dab(c, glow, x, y, (14 + 26 * f) * ss, 0.22 + 0.4 * f);
    c.globalCompositeOperation = "source-over";
    for (const [x, y] of M.pts) drawStar(c, x, y, (5 + 3 * f) * ss, WHITE, 0.95);
    for (const [x, y] of M.pts) Lf.hits.push(["mine", x, y, 16 * ss, 0]);
    for (const [i, j] of M.links)
      Lf.hits.push(["mine", (M.pts[i][0] + M.pts[j][0]) / 2, (M.pts[i][1] + M.pts[j][1]) / 2, 14 * ss, 0]);
  }
  if (L) {
    line(S.pts, L.links, 0.55, 1.5 * ss);
    const [ax, ay] = S.pts[L.at];
    c.strokeStyle = rgba(WHITE, 0.3);
    c.beginPath();
    c.moveTo(ax, ay);
    c.lineTo(L.x, L.y);
    c.stroke();
  }
  c.globalCompositeOperation = "lighter";
  S.pts.forEach(([x, y, ph], i) => {
    const on = i === S.near || L?.at === i || L?.links.some((l) => l.includes(i));
    dab(c, glow, x, y, (on ? 16 : 10) * ss, (on ? 0.4 : 0.2) * (0.8 + 0.2 * Math.sin(t * 1.3 + ph)));
  });
  c.globalCompositeOperation = "source-over";
  S.pts.forEach(([x, y, ph], i) => {
    const on = i === S.near || L?.at === i;
    drawStar(c, x, y, (on ? 5.5 : 3.6 + 0.5 * Math.sin(t * 2.1 + ph)) * ss, WHITE, on ? 1 : 0.8);
  });
}
