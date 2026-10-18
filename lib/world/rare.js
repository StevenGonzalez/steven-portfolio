// Rare sightings. Every few minutes something rare drifts across the world, one at a time: a sky whale with her calf,
// a small island with a village of its own, or a ship made of lanterns. It is never the same one twice in a row, and
// the ones this visitor has not seen yet come first. Each has a field-guide entry of its own, off the list. A world
// held still for reduced motion never shows them, since they only pass by.

import { awayFrom, clamp, dab, ell, makeCanvas, mixc, rgba, rimLight, seeded, skyAt, sprite, taper } from "./core";
import { RARE } from "./guide";
import { D_BACK } from "./layers";
import { drawWhale, pulseAt } from "./life";
import { islandShape, paintRock } from "./scene";
import { LAMP, PLASTER, ROOFS, WOOD, farTint } from "./whimsy";

// When the first one comes, in seconds after the world starts, and the wait after each one has gone.
const FIRST = [100, 200],
  GAP = [300, 480];
// How long a whale's spout lasts, as in life.js, and how long after its mother's the calf copies it.
const SPOUT = 2.8,
  COPY = 0.7;

// `seen` is the sightings this visitor already has in their guide. `ask` names one to bring by about eight seconds in,
// for ?rare=calf and the like.
export function makeRare(seen, ask) {
  const want = RARE.includes(ask) ? ask : null;
  return {
    seen: new Set(seen),
    ask: want,
    next: want ? 8 : FIRST[0] + Math.random() * (FIRST[1] - FIRST[0]),
    cur: null,
    last: null,
  };
}

const START = {
  // The mother swims right to left, high enough to cross the moon, with her calf tucked in under her flipper.
  calf: (K) => {
    const L = K.phone ? 130 : 210;
    return {
      key: "calf",
      x: K.WU + K.EX + L * 0.3,
      y: K.phone ? 380 : 160,
      sp: K.phone ? 12 : 17,
      L,
      e: { hit: 0 },
      copy: -1,
      mom: { dir: -1, L, ph: 0, fog: 0.3, spout: -1 },
      kid: { dir: -1, L: L * 0.4, ph: 1.3, fog: 0.3, spout: -1 },
      heard: false,
    };
  },
  // The village drifts the other way, slower, above the heading; on a phone, with its roofs just under the buttons.
  hamlet: (K) => {
    const w = K.phone ? 96 : 150;
    return {
      key: "hamlet",
      x: -K.EX - w,
      y: K.phone ? 510 : 170,
      sp: K.phone ? 9 : 13,
      w,
      e: { hit: 0 },
      lit: 0,
      wave: -1,
      heard: false,
    };
  },
  // The lantern ship sails high, left to right, across the top of the sky.
  lanternship: (K) => {
    const L = K.phone ? 80 : 140;
    return {
      key: "lanternship",
      x: -K.EX - L,
      y: K.phone ? 300 : 200,
      sp: K.phone ? 14 : 20,
      L,
      e: { hit: 0 },
      lit: 0,
      ring: -1,
      heard: false,
    };
  },
};

function pick(R) {
  const pool = RARE.filter((k) => k !== R.last),
    fresh = pool.filter((k) => !R.seen.has(k)),
    from = fresh.length ? fresh : pool;
  return from[Math.floor(Math.random() * from.length)];
}

export function updateRare(Lf, K, dt, pulses) {
  const R = Lf.rare;
  if (!R.cur) {
    // None starts while the world dozes.
    if ((R.next -= dt) > 0 || Lf.doze > 0.5) return;
    R.cur = START[R.ask || pick(R)](K);
    R.ask = null;
  }
  const S = R.cur,
    t = Lf.t,
    looked = Lf.hover === S.key;
  if (looked) R.seen.add(S.key);
  let gone;
  if (S.key === "calf") {
    S.x -= S.sp * dt;
    const { mom, kid, L } = S;
    mom.ph += dt * 1.1;
    kid.ph += dt * 1.7;
    [mom.x, mom.y] = [S.x, S.y];
    // The calf keeps just under and behind her flipper, drifting a little ahead and back.
    [kid.x, kid.y] = [S.x + L * (0.32 + 0.05 * Math.sin(t * 0.4)), S.y + L * (0.2 + 0.02 * Math.sin(t * 0.7))];
    // A click on her makes her spout, and the calf copies her a moment later, with a much smaller one.
    if ((pulseAt(pulses, D_BACK, S.x + L * 0.4, S.y, S.e)?.[2] ?? Infinity) < L * 0.6 && mom.spout < 0) {
      mom.spout = 0;
      S.copy = COPY;
      Lf.sfx.push(["spout", S.x]);
    }
    if (S.copy > 0 && (S.copy -= dt) <= 0) {
      kid.spout = 0;
      Lf.sfx.push(["pfft", kid.x]);
    }
    for (const w of [mom, kid]) if (w.spout >= 0 && (w.spout += dt) > SPOUT) w.spout = -1;
    gone = S.x < -K.EX - L * 1.4;
  } else if (S.key === "hamlet") {
    S.x += S.sp * dt;
    // Looked at, its windows light up one by one to see who it is. A click makes them all wink, one after another.
    S.lit = clamp(S.lit + (looked ? dt / 1.5 : -dt / 4), 0, 1);
    if ((pulseAt(pulses, D_BACK, S.x, S.y, S.e)?.[2] ?? Infinity) < S.w * 0.6) {
      S.wave = 0;
      Lf.sfx.push(["hamlet", S.x]);
    }
    if (S.wave >= 0 && (S.wave += dt) > 2.2) S.wave = -1;
    gone = S.x > K.WU + K.EX + S.w;
  } else {
    S.x += S.sp * dt;
    // Looked at, the lanterns brighten. A click rings them all, bow to stern.
    S.lit = clamp(S.lit + (looked ? dt / 0.8 : -dt / 3), 0, 1);
    if ((pulseAt(pulses, 0, S.x, S.y - S.L * 0.35, S.e)?.[2] ?? Infinity) < S.L * 0.7) {
      S.ring = 0;
      Lf.sfx.push(["lanternship", S.x]);
    }
    if (S.ring >= 0 && (S.ring += dt) > 2.4) S.ring = -1;
    gone = S.x > K.WU + K.EX + S.L;
  }
  // A quiet shimmer as it first comes into sight.
  if (!S.heard && S.x > 0 && S.x < K.WU) {
    S.heard = true;
    Lf.sfx.push(["rare", S.x]);
  }
  if (gone) {
    R.last = S.key;
    R.cur = null;
    R.next = GAP[0] + Math.random() * (GAP[1] - GAP[0]);
  }
}

// The whale and calf, and the village, on the back layer.
export function drawRareBack(c, Lf, K, P, t) {
  const S = Lf.rare.cur;
  if (!S) return;
  if (S.key === "calf") {
    drawWhale(c, S.mom, P, t);
    drawWhale(c, S.kid, P, t);
    Lf.hits.push(
      ["calf", S.x + S.L * 0.45, S.y, S.L * 0.42, D_BACK],
      ["calf", S.kid.x + S.kid.L * 0.4, S.kid.y, S.kid.L * 0.6, D_BACK],
    );
  } else if (S.key === "hamlet") drawHamlet(c, S, K, P, t, Lf.hits);
}

// The lantern ship, in the high sky.
export function drawRareHigh(c, Lf, K, P, t) {
  const S = Lf.rare.cur;
  if (S?.key === "lanternship") drawShip(c, S, P, t, Lf.hits);
}

// ---------- The drifting village ----------

// The village's island, houses and tree, painted once for the theme at the most the layer is ever drawn at, 1.25
// pixels to the unit, as if it stood in the middle of the sky at its height. Its windows, chimney smoke and lantern
// are drawn live on top. Everything is kept relative to the middle of the island's top.
function hamletSprite(S, K, P) {
  if (S.img?.P === P) return S.img;
  const { w, y } = S,
    cx = K.WU / 2,
    fog = 0.36,
    q = 1.25 * K.U,
    rnd = seeded(31),
    above = w * 0.5,
    below = w * 0.62,
    side = w * 0.12;
  const cv = makeCanvas(),
    c = cv.getContext("2d");
  cv.width = Math.ceil((w + side * 2) * q);
  cv.height = Math.ceil((above + below) * q);
  c.setTransform(q, 0, 0, q, (w / 2 + side - cx) * q, (above - y) * q);
  const sh = islandShape(rnd, cx, y, w, w * 0.5, 0.45);
  paintRock(c, rnd, K, P, sh, fog);
  const tint = (col) => rgba(farTint(P, col, y, fog)),
    [ax, ay] = awayFrom(K, cx, y, 1.6),
    sky = skyAt(P, y);
  // A little tree at the right-hand end, with a lantern hanging from it.
  const tx = cx + w * 0.38,
    ty = sh.topAt(tx),
    crown = new Path2D(),
    wood = new Path2D();
  taper(tx, ty + 1, tx + 1, ty - w * 0.08, tx - 1, ty - w * 0.15, w * 0.02, w * 0.01, wood);
  for (let i = 0; i < 9; i++)
    ell(crown, tx + (rnd() - 0.5) * w * 0.1, ty - w * 0.17 + (rnd() - 0.5) * w * 0.06, w * 0.04, w * 0.03, rnd() * 3);
  c.fillStyle = tint(WOOD);
  c.fill(wood);
  c.fillStyle = rgba(mixc(P.leafDark, sky, fog));
  c.fill(crown);
  // Five houses crowded together, the middle ones taller, each with dark windows that light up live.
  const walls = new Path2D(),
    roofs = [],
    wins = [],
    chimneys = [];
  [
    [-0.33, 0.09, 0.1],
    [-0.19, 0.1, 0.14],
    [-0.05, 0.11, 0.17],
    [0.1, 0.1, 0.12],
    [0.23, 0.08, 0.09],
  ].forEach(([u, hw, hh], i) => {
    const x = cx + u * w,
      base = sh.topAt(x) + 1,
      W = hw * w,
      Ht = hh * w,
      top = base - Ht;
    walls.rect(x - W / 2, top, W, Ht + 1);
    const roof = new Path2D();
    roof.moveTo(x - W * 0.62, top + 1);
    roof.lineTo(x, top - W * 0.5);
    roof.lineTo(x + W * 0.62, top + 1);
    roof.closePath();
    roofs.push([roof, ROOFS[(i * 2) % ROOFS.length]]);
    for (const dx of hw >= 0.1 ? [-0.22, 0.22] : [0]) wins.push([x + dx * W, top + Ht * 0.38, W * 0.18, W * 0.22]);
    if (hh >= 0.14) wins.push([x, top + Ht * 0.74, W * 0.18, W * 0.22]);
    if (i % 2 === 0) chimneys.push([x + W * 0.25, top - W * 0.3]);
  });
  c.fillStyle = tint(PLASTER);
  c.fill(walls);
  for (const [x, cy] of chimneys) {
    c.fillStyle = tint(WOOD);
    c.fillRect(x - w * 0.008, cy - w * 0.015, w * 0.016, w * 0.04);
  }
  for (const [roof, col] of roofs) {
    c.fillStyle = tint(col);
    c.fill(roof);
  }
  c.fillStyle = tint([34, 28, 30]);
  for (const [x, wy, ww, wh] of wins) c.fillRect(x - ww / 2, wy - wh / 2, ww, wh);
  rimLight(
    c,
    (r) => {
      r.fill(walls);
      for (const [roof] of roofs) r.fill(roof);
      r.fill(crown);
    },
    ax,
    ay,
    mixc(P.rim, sky, fog * 0.5),
    0.5,
  );
  const rel = ([x, yy, ...more]) => [x - cx, yy - y, ...more];
  S.img = {
    P,
    cv,
    ox: w / 2 + side,
    oy: above,
    w: w + side * 2,
    h: above + below,
    wins: wins.map(rel),
    chimneys: chimneys.map(rel),
    lamp: rel([tx + w * 0.045, ty - w * 0.12]),
  };
  // The chimney smoke, a little of the sky behind it mixed in. Taken where the hamlet rests rather than where it has
  // bobbed to, so it is one colour, and one sprite, for the whole crossing.
  S.img.smoke = sprite(mixc(P.cloudLit, sky, 0.3));
  return S.img;
}

function drawHamlet(c, S, K, P, t, H) {
  const img = hamletSprite(S, K, P),
    x = S.x,
    y = S.y + Math.sin(t * 0.3) * 4,
    w = S.w,
    night = P.night;
  c.drawImage(img.cv, x - img.ox, y - img.oy, img.w, img.h);
  // Chimney smoke curling up and away.
  const { smoke } = img;
  for (const [cx, cy] of img.chimneys) {
    for (let j = 0; j < 4; j++) {
      const u = (t * 0.22 + j / 4 + cx * 0.01) % 1;
      dab(
        c,
        smoke,
        x + cx + u * w * 0.06 + Math.sin(t + j) * w * 0.01,
        y + cy - u * w * 0.16,
        w * (0.012 + u * 0.03),
        0.35 * Math.sin(Math.PI * u),
      );
    }
  }
  // Windows: lit after dark, lit one by one while looked at, and winking in a wave after a click.
  c.globalCompositeOperation = "lighter";
  const glow = sprite(LAMP),
    n = img.wins.length;
  img.wins.forEach(([wx, wy, ww, wh], i) => {
    const one = clamp(S.lit * (n + 2) - i, 0, 1),
      wink = S.wave >= 0 && Math.abs(S.wave * 6 - i) < 1 ? 0 : 1;
    const on = Math.max(night ? 0.75 + 0.15 * Math.sin(t * 1.3 + i * 2) : 0.1, one) * wink;
    if (on < 0.05) return;
    c.fillStyle = rgba(LAMP, on * 0.9);
    c.fillRect(x + wx - ww / 2, y + wy - wh / 2, ww, wh);
    dab(c, glow, x + wx, y + wy, w * 0.05, on * (night ? 0.35 : 0.2));
  });
  // The lantern in its tree.
  const [lx, ly] = img.lamp;
  dab(c, glow, x + lx, y + ly + Math.sin(t * 1.4) * w * 0.003, w * 0.07, night ? 0.55 : 0.3);
  dab(c, sprite([255, 244, 220]), x + lx, y + ly, w * 0.012, 0.9);
  c.globalCompositeOperation = "source-over";
  H.push(["hamlet", x, y, w * 0.5, D_BACK]);
}

// ---------- The lantern ship ----------

// Where its lanterns hang, in units of its length from the middle of the keel, in strings that hold hands: the hull's
// keel and rail, the mast, the two sails and the bowsprit, with a pennant at the top.
const SHIP = (() => {
  const runs = [],
    line = (pts, n) => {
      const run = [];
      for (let i = 0; i < pts.length - 1; i++) {
        for (let k = 0; k < n; k++) {
          const u = k / n,
            [x0, y0] = pts[i],
            [x1, y1] = pts[i + 1];
          run.push([x0 + (x1 - x0) * u, y0 + (y1 - y0) * u]);
        }
      }
      run.push(pts[pts.length - 1]);
      runs.push(run);
    };
  line(
    [
      [-0.5, -0.1],
      [-0.42, 0.06],
      [-0.2, 0.13],
      [0.12, 0.12],
      [0.36, 0.05],
      [0.55, -0.08],
    ],
    2,
  );
  line(
    [
      [-0.52, -0.13],
      [0, -0.1],
      [0.56, -0.11],
    ],
    4,
  );
  line(
    [
      [0, -0.1],
      [0, -0.82],
    ],
    6,
  );
  line(
    [
      [0.02, -0.78],
      [0.38, -0.22],
      [0.04, -0.2],
    ],
    4,
  );
  line(
    [
      [-0.03, -0.68],
      [-0.34, -0.2],
      [-0.04, -0.2],
    ],
    3,
  );
  line(
    [
      [0.56, -0.11],
      [0.78, -0.2],
    ],
    2,
  );
  line(
    [
      [0, -0.82],
      [0.14, -0.86],
      [0.02, -0.9],
    ],
    1,
  );
  return runs;
})();

function drawShip(c, S, P, t, H) {
  const { L, x } = S,
    y = S.y + Math.sin(t * 0.35) * 5,
    rock = Math.sin(t * 0.5) * 0.04,
    night = P.night,
    cr = Math.cos(rock),
    sr = Math.sin(rock);
  // Each lantern bobs a little on its own. A ring runs along them from the bow back to the stern: `S.ring` is the
  // seconds since it set off, and `pos` the share of the way it has come.
  let i = 0;
  const pos = S.ring >= 0 ? S.ring / 1.4 : -9,
    pts = SHIP.map((run) =>
      run.map(([u, v]) => {
        const b = v + Math.sin(t * 1.3 + i++ * 0.9) * 0.008;
        return [
          x + (u * cr - b * sr) * L,
          y + (u * sr + b * cr) * L,
          Math.max(0, 1 - Math.abs((0.8 - u) / 1.35 - pos) * 6),
        ];
      }),
    );
  // The strings between them first, faint.
  c.strokeStyle = rgba(night ? [255, 214, 160] : [255, 236, 210], night ? 0.22 : 0.35);
  c.lineWidth = L * 0.004;
  c.beginPath();
  for (const run of pts) run.forEach(([px, py], k) => (k ? c.lineTo(px, py) : c.moveTo(px, py)));
  c.stroke();
  // Then the lanterns: a warm paper body in its glow, with a bright heart.
  const glow = sprite(LAMP),
    core = sprite([255, 244, 220]),
    all = pts.flat();
  c.globalCompositeOperation = "lighter";
  for (const [px, py, ring] of all)
    dab(c, glow, px, py, L * (0.05 + 0.03 * ring), (night ? 0.4 : 0.28) * (1 + S.lit * 0.5 + ring));
  c.globalCompositeOperation = "source-over";
  c.fillStyle = rgba(night ? [255, 196, 120] : [236, 128, 82]);
  c.beginPath();
  for (const [px, py] of all) ell(c, px, py, L * 0.011, L * 0.014, 0);
  c.fill();
  c.globalCompositeOperation = "lighter";
  for (const [px, py, ring] of all) dab(c, core, px, py, L * 0.012, 0.5 + S.lit * 0.4 + ring * 0.5);
  c.globalCompositeOperation = "source-over";
  H.push(["lanternship", x, y - L * 0.35, L * 0.6, 0]);
}
