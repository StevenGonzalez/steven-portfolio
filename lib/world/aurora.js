// The northern lights, on nights they are really out where the visitor is. The page asks the site for the planetary
// K index, the measure of how stormy the Earth's magnetic field is right now (app/api/aurora, from NOAA), and works out
// from its own rough place whether the lights would reach it: the stormier, the further from the magnetic pole they
// come. When they would, the night sky here has them too, as curtains that fold, ripple and brighten along their
// length, green at the foot and red or violet above, and redder the nearer the visitor is to the edge of where they
// reach. The faint aurora painted into every night sky (scene.js) stays underneath.

import { blit, clamp, makeCanvas } from "./core";

/** How the lights look where the visitor is: the K index, how strongly they reach, from 0 to 1, and whether they are
 *  the southern lights.
 *  @typedef {{kp: number, level: number, south: boolean}} Aurora */

const RAD = Math.PI / 180;
// The north geomagnetic pole, in degrees north and east, as it stands in the mid-2020s.
const POLE = [80.8, -72.7];

/** Whether the lights reach a place, at degrees north and east, with the K index at `kp`. The edge of where they can
 *  be seen low on the horizon runs at about 58 - 2 Kp degrees of magnetic latitude, and ten degrees further toward the
 *  pole they are overhead and bright. Null where they do not reach.
 *  @returns {Aurora | null} */
export function auroraAt(kp, lat, lon) {
  const [pl, pn] = POLE,
    m = Math.asin(
      Math.sin(lat * RAD) * Math.sin(pl * RAD) + Math.cos(lat * RAD) * Math.cos(pl * RAD) * Math.cos((lon - pn) * RAD),
    );
  const level = clamp((Math.abs(m / RAD) - (58 - 2 * kp)) / 10, 0, 1);
  return level > 0.05 ? { kp, level, south: m < 0 } : null;
}

// The curtains are worked out a few times a second as pixels on a small canvas, a quarter of a unit to the pixel, and
// stretched over the sky. They are soft enough that nothing is lost, and the sky is too big to draw them at full size
// every frame on a CPU-drawn canvas. TOP and FOOT bound the stretch of sky they can reach, which is all their layer
// covers.
const PX = 0.25,
  TOP = -80,
  FOOT = 520,
  EVERY = 1 / 12;
export const AURORA_BAND = [TOP, FOOT];

/** @param {Aurora} a @param {number} on how far up the lights are to start with, from 0 to 1 */
export function makeAurora(K, a, on) {
  const level = clamp(a.level, 0, 1),
    x0 = -K.EX,
    w = Math.ceil((K.WU + K.EX * 2) * PX),
    h = Math.ceil((FOOT - TOP) * PX);
  const cv = makeCanvas();
  cv.width = w;
  cv.height = h;
  const c = cv.getContext("2d"),
    img = c.createImageData(w, h);
  // Light by height up a curtain, from its foot (0) to its top (1): a bright green foot, fading up through violet,
  // or a deep red at the edge of where the lights reach.
  const shade = new Float32Array(64 * 4),
    top = [255 - 105 * level, 70 + 40 * level, 120 + 120 * level];
  for (let i = 0; i < 64; i++) {
    const u = i / 63,
      g = clamp(1 - u * 1.6, 0, 1) ** 1.5 * (0.35 + 0.65 * level),
      v = Math.sin(Math.PI * clamp(u * 1.1, 0, 1)) * (0.5 - 0.25 * level);
    shade.set([110 * g + top[0] * v, 255 * g + top[1] * v, 180 * g + top[2] * v, Math.max(g, v)], i * 4);
  }
  // Each column of the curtain a ray of its own, flickering at its own pace.
  const rays = Float32Array.from({ length: w }, () => Math.random());
  return { ...a, level, cv, c, img, shade, rays, x0, w, h, on, wait: 0, ver: 0 };
}

// Where a curtain's foot hangs along the sky, and how tall it is, at x and time t: two slow waves folding it.
function fold(x, t, i) {
  const y = 300 - i * 110 + 60 * Math.sin(x * 0.0021 + t * 0.05 + i * 2) + 22 * Math.sin(x * 0.0063 - t * 0.12 + i),
    tall = (190 - i * 40) * (0.8 + 0.25 * Math.sin(x * 0.009 + t * 0.2 + i * 4));
  return [y, tall];
}

function paint(A, K, t) {
  const { img, shade, rays, w, h, x0 } = A,
    d = img.data,
    near = K.phone ? 0.75 : 1;
  d.fill(0);
  for (let i = 0; i < 2; i++) {
    const far = i ? 0.45 : 1;
    let [py] = fold(x0, t, i);
    for (let cx = 0; cx < w; cx++) {
      const x = x0 + cx / PX,
        [y, tall] = fold(x, t, i),
        // A curtain seen edge-on, where it folds, looks brighter: there is more of it along the line of sight.
        edge = 1 + 3 * Math.min(1, Math.abs(y - py) * PX),
        // Brighter stretches drift along it, and surges run along it faster now and then.
        drift = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(x * 0.0031 - t * 0.04 + i * 3)),
        surge = Math.max(0, Math.sin(x * 0.011 - t * 0.6 + i)) ** 4,
        r = rays[cx],
        ray = 0.7 + 0.3 * Math.sin(r * 40 + t * (0.6 + r)),
        // Kept faint behind the words on the left of a wide screen.
        side = K.phone ? 1 : clamp((x - K.WU * 0.28) / 500, 0.25, 1),
        b = A.on * far * near * side * drift * ray * (0.75 + 0.6 * surge) * Math.min(edge, 2.2);
      py = y;
      if (b < 0.01) continue;
      const foot = Math.min(h - 1, Math.round((y - TOP) * PX)),
        rows = Math.max(1, tall * PX);
      for (let row = Math.max(0, Math.floor(foot - rows)); row <= foot; row++) {
        const u = (foot - row) / rows,
          s = Math.min(63, Math.round(u * 63)) * 4,
          k = (row * w + cx) * 4,
          a = Math.min(0.95, shade[s + 3] * b * 1.3);
        if (a <= 0) continue;
        // The colour of the light at full strength, and how strong it is as alpha, so over the dark sky it
        // lightens it much as light adds. Where the two curtains overlap, the brighter wins.
        if (a > d[k + 3] / 255) {
          const n = 1 / Math.max(shade[s + 3], 0.001);
          d[k] = Math.min(255, shade[s] * n);
          d[k + 1] = Math.min(255, shade[s + 1] * n);
          d[k + 2] = Math.min(255, shade[s + 2] * n);
          d[k + 3] = a * 255;
        }
      }
    }
  }
  A.c.putImageData(img, 0, 0);
  A.cv.ver = ++A.ver;
}

export function updateAurora(Lf, dt) {
  const A = Lf.aurora;
  if (!A) return;
  // The lights come up slowly, over a few seconds.
  A.on = Math.min(1, A.on + dt / 6);
  A.wait -= dt;
}

// The curtains, on their own layer, after dark only, and named anywhere along them.
export function drawAurora(c, Lf, K, P, t) {
  const A = Lf.aurora;
  if (!A || !P.night) return;
  if (A.wait <= 0) {
    A.wait = EVERY;
    paint(A, K, t);
  }
  blit(c, A.cv, A.x0, TOP, A.w / PX, A.h / PX, A);
  for (let x = K.phone ? 60 : K.WU * 0.35; x <= K.WU; x += 240) {
    const [y, tall] = fold(x, t, 0);
    Lf.hits.push(["aurora", x, y - tall * 0.4, 110, 0]);
  }
}

/** What the field guide says about them. */
export function auroraWords(A, asked) {
  const where = asked
    ? "This is what a storm night looks like here. On a real one, they come out on their own if they reach where you are."
    : `They’re out over where you are right now${A.kp >= 5 ? ", in a geomagnetic storm" : ""} (Kp ${Math.round(A.kp)}), so they’re out here too.`;
  return [
    A.south ? "Aurora australis" : "Aurora borealis",
    A.south ? "The southern lights" : "The northern lights",
    where,
  ];
}
