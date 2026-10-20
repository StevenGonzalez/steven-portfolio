// The fibbing reflection. The cloud sea holds a soft reflection of everything on the island, upside down and squashed
// flat under the horizon, behind the island, everything drawn on it and the near clouds. Now and then, while nobody
// is looking at it, the reflection shows something that isn't there above: a second moon behind the tree, the arch
// open onto the desk, or the lanterns burning blue. A click on it sends ripples through it, and while they run it
// quietly puts itself right. A phone shows none: the island fills the bottom of its screen, and the ferns the rest.

import { PAD, TAU, clamp, dab, makeCanvas, rgba, seeded, sprite } from "./core";
import { D_ISLE } from "./layers";
import { drawDesk } from "./desk";

const LIES = ["moon", "door", "blue"];
// Seconds until the first lie, and from one being put right to the next, and how long one lasts if nobody catches it.
const FIRST = [25, 45],
  NEXT = [70, 150],
  LAST = 150;
// How long after a click the reflection puts itself right, while the ripples are at their height, and how fast the
// ripples die away, both in seconds.
const FIX = 0.35,
  CALM = 1.1;
// How often the reflection is copied from the island again, in seconds, and at how many pixels a scene unit: few, so
// it comes out soft.
const EVERY = 0.5,
  Q = 0.5;
const COOL = [150, 196, 255],
  DAY_SKY = [112, 152, 186];

// The reflection takes in the island from the top of the crown or the arch, whichever is higher, down to just under
// the turf, and hangs it from the horizon, squashed to lie mostly above the near clouds and the page's fade below.
// A world held still for reduced motion shows a lie from the start, since none can come later.
export function makeMirror(K, reduce) {
  if (K.phone) return null;
  const { tree: T, arch: A, isle: I, s } = K,
    top = Math.min(...T.clusters.map(([, y, r]) => y - r), A.my - A.rr) - 8 * s,
    base = K.top + 6 * s,
    y = K.HZ + 4,
    k = clamp(95 / (base - top), 0.22, 0.3),
    cv = makeCanvas();
  cv.width = Math.round(I.w * Q);
  cv.height = Math.round((base - top) * k * Q);
  const rnd = seeded(Date.now()),
    wait = (/** @type {number[]} */ [lo, hi]) => lo + rnd() * (hi - lo);
  return {
    x0: I.x0,
    w: I.w,
    top,
    base,
    y,
    k,
    cv,
    P: null,
    at: -Infinity,
    lie: reduce ? LIES[Math.floor(rnd() * LIES.length)] : null,
    last: /** @type {string | null} */ (null),
    left: LAST,
    fix: 0,
    wave: 0,
    next: wait(FIRST),
    rnd,
    wait,
    reduce,
  };
}

// Starts a lie, any but the last one told, and the arch only while it is shut. It says whether it did.
export function fib(Lf) {
  const M = Lf.mirror;
  if (!M || M.lie) return false;
  const can = LIES.filter((l) => l !== M.last && (l !== "door" || (!Lf.desk.on && Lf.desk.o <= 0)));
  M.lie = M.last = can[Math.floor(M.rnd() * can.length)];
  M.left = LAST;
  M.at = -Infinity;
  return true;
}

function ownUp(M) {
  M.lie = null;
  M.fix = 0;
  M.at = -Infinity;
  M.next = M.wait(NEXT);
}

// A click on the reflection: ripples, and a lie put right while they run, or straight away in a world held still.
export function ripple(Lf, reduce) {
  const M = Lf.mirror;
  M.wave = 1;
  Lf.sfx.push(["ripple", M.x0 + M.w / 2]);
  if (!M.lie) return;
  if (reduce) ownUp(M);
  else M.fix = FIX;
}

// A lie starts only while the pointer is well away from the reflection, and one nobody caught goes the same way. The
// arch opening for real makes its lie the truth, so it stops being one.
export function updateMirror(Lf, dt, pointer) {
  const M = Lf.mirror;
  if (!M) return;
  M.wave *= Math.exp(-dt / CALM);
  const away =
    Lf.hover !== "mirror" &&
    (!pointer || pointer.y < M.y - 120 || pointer.x < M.x0 - 120 || pointer.x > M.x0 + M.w + 120);
  if (M.fix > 0 && (M.fix -= dt) <= 0) ownUp(M);
  else if (M.lie === "door" && Lf.desk.o > 0) ownUp(M);
  else if (M.lie && (M.left -= dt) <= 0 && away) ownUp(M);
  else if (!M.lie && (M.next -= dt) <= 0 && away) fib(Lf);
}

// The island, copied upside down and squashed, with whatever lie it is telling, and faded out away from the waterline.
// `src` is the island's layers, back to front. Where the island's rock hangs down in front of the reflection it is cut
// out; whatever is drawn on the island each frame covers it as it is drawn.
function copy(M, Lf, K, P, t, src) {
  const { cv, x0, w, top, base, k } = M,
    g = cv.getContext("2d"),
    T = K.tree;
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, cv.width, cv.height);
  g.setTransform(Q, 0, 0, -k * Q, -x0 * Q, base * k * Q);
  // A second moon, rising behind the island beside the trunk. It is squashed less than the rest, to stay round enough
  // to read as a moon, and by day it brings a patch of blue sky with it, or it would be lost on the pale clouds.
  if (M.lie === "moon") {
    const x = T.cx - T.r * 0.75,
      y = base - 120 * K.s,
      r = 26 * K.s;
    if (P.night) {
      g.globalCompositeOperation = "lighter";
      dab(g, sprite(P.light), x, y, r * 4, 0.35);
      g.globalCompositeOperation = "source-over";
    } else dab(g, sprite(DAY_SKY), x, y, r * 2.6, 0.55);
    g.fillStyle = rgba(P.night ? [226, 236, 232] : [250, 246, 236]);
    g.beginPath();
    g.ellipse(x, y, r, (r * 0.6) / k, 0, 0, TAU);
    g.fill();
  }
  for (const l of src)
    g.drawImage(
      l.cv,
      (x0 * K.U + PAD) * l.r,
      (top * K.U + PAD - l.top) * l.r,
      w * K.U * l.r,
      (base - top) * K.U * l.r,
      x0,
      top,
      w,
      base - top,
    );
  // The arch open onto the desk, lamp lit. Its labels go nowhere.
  if (M.lie === "door") drawDesk(g, { desk: { o: 1, view: Lf.desk.view }, hits: [] }, K, P, t);
  if (M.lie === "blue") {
    g.globalCompositeOperation = "lighter";
    for (const { x, y } of T.lanterns) {
      dab(g, sprite(COOL), x, y, 18 * K.s, 1);
      dab(g, sprite([230, 244, 255]), x, y, 6 * K.s, 1);
    }
    g.globalCompositeOperation = "source-over";
  }
  const h = cv.height / Q;
  g.setTransform(Q, 0, 0, Q, -x0 * Q, -M.y * Q);
  g.globalCompositeOperation = "destination-out";
  for (const l of src)
    if (!l.draw)
      g.drawImage(
        l.cv,
        (x0 * K.U + PAD) * l.r,
        (M.y * K.U + PAD - l.top) * l.r,
        w * K.U * l.r,
        h * K.U * l.r,
        x0,
        M.y,
        w,
        h,
      );
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = "destination-in";
  const fade = g.createLinearGradient(0, 0, 0, cv.height);
  fade.addColorStop(0, "rgba(0,0,0,0)");
  fade.addColorStop(0.06, "rgba(0,0,0,1)");
  fade.addColorStop(0.7, "rgba(0,0,0,1)");
  fade.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = fade;
  g.fillRect(0, 0, cv.width, cv.height);
  g.globalCompositeOperation = "source-over";
}

// Drawn in rows, each shifted a little from side to side by ripples running down it, a gentle shimmer when calm, and
// behind everything already drawn on the island this frame. The copy is redone every so often, so the reflection keeps
// up with the island, and at once for a new theme or a lie. A world held still copies it whenever it is drawn, which
// is only when something changed.
export function drawMirror(c, Lf, K, P, t, src) {
  const M = Lf.mirror;
  if (!M) return;
  if (M.reduce || M.P !== P || !(t - M.at < EVERY)) {
    copy(M, Lf, K, P, t, src);
    M.P = P;
    M.at = t;
  }
  const { cv, x0, w, y } = M,
    amp = 0.8 + 8 * M.wave;
  c.globalAlpha = P.night ? 0.6 : 0.5;
  c.globalCompositeOperation = "destination-over";
  for (let r = 0; r < cv.height; r += 2) {
    const h = Math.min(2, cv.height - r),
      dx = Math.sin(r * 0.9 - t * 4.2) * amp * (0.4 + r / cv.height);
    c.drawImage(cv, 0, r, cv.width, h, x0 + dx, y + r / Q, w, h / Q);
  }
  c.globalAlpha = 1;
  c.globalCompositeOperation = "source-over";
  // Named along the strip of it above the near clouds.
  const T = K.tree;
  for (const u of [-0.6, -0.3, 0, 0.3, 0.6]) Lf.hits.push(["mirror", T.cx + u * T.r, y + 24 * K.s, 26 * K.s, D_ISLE]);
}
