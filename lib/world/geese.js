// Geese. In the weeks real geese migrate, a skein of them crosses the high sky now and then in a V: south in autumn,
// from mid-September to the end of November, off to the right and a little smaller as they go; and north again in
// March and April, in from the right and nearer. Far off as they are, they honk now and then, and a click on them has
// them honk back.

import { seeded } from "./core";
import { migrationOf } from "./calendar";

// How long a skein takes to cross, in seconds, and how long the sky stays empty between one and the next.
const CROSS = 48;
const GAP = [150, 270];

/** `asked` is "south" or "north" to have geese flying that way whatever the date, and the first skein soon. */
export function makeGeese(K, asked = null) {
  const dir = asked ? (asked === "north" ? -1 : 1) : migrationOf(new Date(K.sky.t));
  // A seeded generator of their own, so the rest of the world plays out just as it would without them.
  const rnd = seeded(K.sky.t % 1e9);
  return { dir, rnd, wait: asked ? 3 : 45 + rnd() * 55, skein: null, honk: 0 };
}

// A skein of 9 to 15 geese behind a leader, the two arms of the V seldom as long as each other.
function skein(G, K) {
  const rnd = G.rnd,
    n = 9 + Math.floor(rnd() * 7),
    lean = 0.3 + rnd() * 0.4,
    ss = Math.max(K.s, 0.7),
    birds = [{ dx: 0, dy: 0, ph: rnd() * 6 }],
    rank = [0, 0];
  for (let i = 1; i < n; i++) {
    const side = rnd() < lean ? 0 : 1,
      r = ++rank[side];
    birds.push({ dx: -r * 22 * ss, dy: (side ? 1 : -1) * r * 13 * ss, ph: rnd() * 6 });
  }
  return { birds, k: 0, y: 110 + rnd() * 110, sway: rnd() * 6 };
}

export function updateGeese(Lf, K, dt) {
  const G = Lf.geese;
  if (!G.dir) return;
  if (G.skein) {
    const S = G.skein;
    S.k += dt / CROSS;
    if ((G.honk -= dt) < 0) {
      G.honk = 3 + G.rnd() * 6;
      Lf.sfx.push(["honk", geeseAt(K, G)[0], 2 + Math.floor(G.rnd() * 2)]);
    }
    if (S.k >= 1) {
      G.skein = null;
      G.wait = GAP[0] + G.rnd() * (GAP[1] - GAP[0]);
    }
  } else if (!Lf.doze && (G.wait -= dt) < 0) {
    G.skein = skein(G, K);
    G.honk = 2 + G.rnd() * 3;
  }
}

/** Where the skein's leader is, in the high sky's units, and how near: `[x, y, scale]`. */
export function geeseAt(K, G) {
  const S = G.skein,
    span = K.WU + K.EX * 2 + 500,
    u = G.dir > 0 ? S.k : 1 - S.k;
  return [-K.EX - 250 + span * u, S.y + 40 * u, 1.1 - 0.3 * u];
}

// The skein, in the high sky's units, on the back layer: each goose a little bowed stroke for its wings, beating, and
// its neck stretched out ahead, all in one stroke. The leader carries the hit target for the whole skein.
export function drawGeese(c, Lf, K, P, t) {
  const G = Lf.geese;
  if (!G.skein) return;
  const [lx, ly, sc] = geeseAt(K, G),
    d = G.dir,
    ss = Math.max(K.s, 0.7) * sc,
    w = 7 * ss,
    sway = Math.sin(t * 0.4 + G.skein.sway) * 6;
  c.beginPath();
  for (const b of G.skein.birds) {
    const x = lx + b.dx * d * sc,
      y = ly + b.dy * sc + sway * Math.sin(b.ph),
      tip = Math.sin(t * 19 + b.ph) * 4 * ss;
    c.moveTo(x - w, y + tip);
    c.quadraticCurveTo(x - w * 0.4, y - 2 * ss, x, y);
    c.quadraticCurveTo(x + w * 0.4, y - 2 * ss, x + w, y + tip);
    c.moveTo(x, y);
    c.lineTo(x + d * 6 * ss, y + 0.6 * ss);
  }
  c.strokeStyle = P.night ? "rgba(150,165,200,0.55)" : "rgba(40,44,60,0.6)";
  c.lineWidth = 1.5 * ss;
  c.lineCap = "round";
  c.stroke();
  Lf.hits.push(["geese", lx - d * 60 * ss, ly, 90 * ss, 0]);
}
