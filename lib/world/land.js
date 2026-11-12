// The land under the sky: a country drowned in a sea of cloud, with only its heights showing. Back to front: two
// snow-capped ranges on the horizon, a forested ridge, wooded hills, and near slopes at the edges of the frame, each
// on its own plane and each with cloud pooled in the valley in front of it, so the islands float over a real country
// instead of empty air and the cloud sea is the valley fog between its ridges.

import { TAU, awayFrom, clamp, ell, lerp, mixc, puff, rgba, rimLight, seeded, skyAt, smoothPath, taper } from "./core";
import { cloud } from "./scene";
import { ease } from "./story";

// Smooth value noise over [x0, x1]: random knots eased together.
function octave(rnd, x0, x1, step) {
  const knots = Array.from({ length: Math.ceil((x1 - x0) / step) + 2 }, () => rnd() - 0.5);
  return (x) => {
    const f = (x - x0) / step,
      i = clamp(Math.floor(f), 0, knots.length - 2),
      t = f - i;
    return lerp(knots[i], knots[i + 1], t * t * (3 - 2 * t));
  };
}

// A wooded crest from x0 to x1 around the height at(x), roughened by noise of the given amplitude.
function woodLine(rnd, x0, x1, at, amp, base) {
  const o1 = octave(rnd, x0 - 20, x1 + 20, 70),
    o2 = octave(rnd, x0 - 20, x1 + 20, 19),
    pts = [];
  for (let x = x0; x < x1 + 6; x += 6) pts.push([x, at(x) + (o1(x) + o2(x) * 0.3) * amp]);
  return { pts, base };
}

export function buildLand(K) {
  const rnd = seeded(41),
    { WU, EX, phone } = K;
  const range = (n, lo, hi, calm, base, w0, w1, snow) => {
    // Each gets its spine below, once the ridge is laid out.
    const peaks = /** @type {{ x: number, y: number, w: number, spine: [number, number][] }[]} */ (
      Array.from({ length: n }, (_, i) => {
        const x = -EX + ((i + 0.2 + rnd() * 0.6) / n) * (WU + EX * 2);
        // Low behind the headline so the copy stays calm.
        const y = !phone && x < WU * 0.42 ? lerp(calm, calm + 50, rnd()) : lerp(lo, hi, rnd());
        return { x, y, w: lerp(w0, w1, rnd()) };
      })
    );
    // Smooth value noise breaks up the shoulders; a little jitter roughens the crest.
    const o1 = octave(rnd, -EX - 20, WU + EX + 20, 46),
      o2 = octave(rnd, -EX - 20, WU + EX + 20, 13),
      noise = (x) => o1(x) + o2(x) * 0.45;
    const ridge = [];
    for (let x = -EX - 12; x <= WU + EX + 12; x += 4) {
      let y = base;
      for (const p of peaks) y = Math.min(y, p.y + (base - p.y) * Math.pow(Math.min(1, Math.abs(x - p.x) / p.w), 0.9));
      const h = base - y;
      ridge.push([x, Math.min(base, y + noise(x) * h * 0.24 + (rnd() - 0.5) * h * 0.03)]);
    }
    // Each peak's spine: the line down its face where the lit side turns to shadow, wandering like a real ridge.
    for (const p of peaks) {
      p.spine = [];
      for (let k = 0, x = p.x; k <= 8; k++) {
        p.spine.push([x, lerp(p.y, base, k / 8)]);
        x += (rnd() - 0.35) * p.w * 0.09;
      }
    }
    return { peaks, ridge, base, snow, top: Math.min(...ridge.map((p) => p[1])) };
  };
  K.land = phone
    ? { far: range(4, 470, 560, 0, 740, 130, 200, 540), near: range(3, 540, 610, 0, 790, 150, 220, 590) }
    : { far: range(9, 330, 450, 560, 760, 220, 380, 490), near: range(6, 430, 540, 620, 810, 240, 400, 545) };
  // Wooded hills whose crowns break through the cloud sea; only low ones on the headline's side.
  const hill = (u, rise, w) => ({ x: WU * u, top: K.HZ - rise, hw: w / 2 });
  K.land.hills = phone
    ? [hill(0.12, 110, 240), hill(0.9, 140, 280)]
    : [hill(0.1, 100, 460), hill(0.5, 170, 400), hill(0.84, 230, 480), hill(1.04, 190, 380)];
  // The forested ridge behind the hills, lower on the headline's side, and the near slopes that frame the edges.
  const w = seeded(59),
    rise = (x, a, b) => ease((x - a) / (b - a)),
    base = K.HZ + 30;
  K.land.ridge = phone
    ? woodLine(w, -EX - 10, WU + EX + 10, () => 800, 40, base)
    : woodLine(w, -EX - 10, WU + EX + 10, (x) => lerp(735, 650, rise(x, WU * 0.3, WU * 0.55)), 60, base);
  K.land.flanks = phone
    ? [
        woodLine(w, -EX - 10, WU * 0.3, (x) => lerp(790, base + 70, rise(x, -EX, WU * 0.3)), 20, base),
        woodLine(w, WU * 0.7, WU + EX + 10, (x) => lerp(base + 70, 770, rise(x, WU * 0.7, WU + EX)), 20, base),
      ]
    : [
        woodLine(w, -EX - 10, WU * 0.26, (x) => lerp(725, base + 70, rise(x, -EX, WU * 0.26)), 25, base),
        woodLine(w, WU * 0.78, WU + EX + 10, (x) => lerp(base + 70, 590, rise(x, WU * 0.78, WU + EX)), 25, base),
      ];
}

export function paintRange(c, K, P, R, fog, forest, seed) {
  const rnd = seeded(seed),
    { ridge, base, peaks, snow, top } = R,
    sky = (y) => skyAt(P, y);
  const body = new Path2D();
  body.moveTo(ridge[0][0], base + 40);
  for (const [x, y] of ridge) body.lineTo(x, y);
  body.lineTo(ridge[ridge.length - 1][0], base + 40);
  body.closePath();
  const g = c.createLinearGradient(0, top, 0, base);
  // Cool and dark against the sky: at dusk the sun is behind them, so they stand as silhouettes with lit crests.
  g.addColorStop(0, rgba(mixc(mixc(P.rock, P.cloudDark, 0.6), sky(top), fog)));
  g.addColorStop(0.7, rgba(mixc(P.rock, sky(base - 60), Math.min(1, fog + 0.1))));
  g.addColorStop(1, rgba(mixc(P.haze, sky(base), 0.5)));
  c.fillStyle = g;
  c.fill(body);
  c.save();
  c.clip(body);

  // Snow above the snowline, deeper on the high peaks, ending in ragged fingers down the gullies.
  const caps = new Path2D(),
    lit = P.night ? [206, 226, 240] : [255, 238, 222];
  caps.moveTo(ridge[0][0], ridge[0][1]);
  for (const [x, y] of ridge) caps.lineTo(x, y);
  for (let i = ridge.length - 1; i >= 0; i--) {
    const [x, y] = ridge[i],
      d = Math.max(0, snow - y);
    caps.lineTo(x, y + d * (0.35 + 0.4 * Math.abs(Math.sin(x * 0.07) * Math.sin(x * 0.023 + 1.3))));
  }
  caps.closePath();
  c.fillStyle = rgba(mixc(lit, sky(top), Math.min(1, fog * 0.9 + 0.1)), P.night ? 0.8 : 0.4);
  c.fill(caps);

  // Each peak is carved into planes. The face toward the light glows warm from the crest down, the face away falls into
  // a crisp shadow, snow included, and buttresses running down off the spine break each face into a few stepped tones.
  // The planes draw from a sequence of their own, so the gullies and trees keep their places.
  const shade = mixc(mixc(P.cloudDark, [0, 0, 0], 0.35), sky(top), fog * 0.6),
    glow = mixc(P.rim, sky(top), fog * 0.45),
    fr = seeded(seed + 900);
  const face = (p, d, pts, col, a0, a1) => {
    const fg = c.createLinearGradient(0, p.y, 0, base);
    fg.addColorStop(0, rgba(col, a0));
    fg.addColorStop(1, rgba(col, a1));
    c.fillStyle = fg;
    c.beginPath();
    c.moveTo(p.x, p.y - 30);
    for (const [x, y] of pts) c.lineTo(x, y);
    c.lineTo(p.x + d * p.w, base);
    c.lineTo(p.x + d * p.w, p.y - 30);
    c.closePath();
    c.fill();
  };
  for (const p of peaks) {
    const d = p.x < K.L.x ? -1 : 1;
    face(p, -d, p.spine, glow, P.night ? 0.22 : 0.32, 0);
    face(p, d, p.spine, shade, 0.78, 0.4);
    // Buttresses: each leaves the spine partway down and runs out to the foot; past it the face steps a tone.
    for (const sd of [-d, d])
      for (let k = 0, n = 1 + Math.floor(fr() * 2); k < n; k++) {
        const j = 2 + Math.floor(fr() * 4),
          [sx, sy] = p.spine[j],
          out = sx + sd * p.w * (0.3 + fr() * 0.4),
          pts = [
            ...p.spine.slice(0, j + 1),
            [lerp(sx, out, 0.5) + (fr() - 0.5) * p.w * 0.08, lerp(sy, base, 0.45)],
            [out, base],
          ];
        if (sd === d) face(p, sd, pts, [0, 0, 0], 0.2, 0.08);
        else face(p, sd, pts, glow, P.night ? 0.1 : 0.14, 0);
      }
    // Gullies: faint streaks running down from the crest.
    c.lineWidth = 1.2;
    for (let k = 0; k < 7; k++) {
      const x = p.x + (rnd() - 0.5) * p.w * 0.9,
        y = p.y + Math.abs(x - p.x) * 0.7;
      c.strokeStyle = rgba(mixc(k % 2 ? lit : [0, 0, 0], sky(y), fog * 0.7), 0.18);
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + (x - p.x) * 0.15, y + 40, x + (x - p.x) * 0.3, y + 70 + rnd() * 90);
      c.stroke();
    }
  }

  if (forest) {
    // Conifers from the treeline down, each a narrow triangle, darker than the rock so the slopes read as wooded.
    const trees = new Path2D(),
      line = base - (K.phone ? 120 : 175);
    for (const [x, y] of ridge) {
      const lo = Math.max(y + 6, line, snow + 30);
      for (let k = 0; k < 3; k++) {
        const tx = x + (rnd() - 0.5) * 4,
          ty = lerp(lo, base + 10, Math.sqrt(rnd())),
          h = 9 + rnd() * 9;
        if (ty > base + 10) continue;
        trees.moveTo(tx, ty - h);
        trees.lineTo(tx + h * 0.28, ty);
        trees.lineTo(tx - h * 0.28, ty);
        trees.closePath();
      }
    }
    c.fillStyle = rgba(mixc(P.leafDark, sky(base - 80), fog * 0.85));
    c.fill(trees);
  }

  // The lower slopes sink into haze.
  const hz = c.createLinearGradient(0, base - 150, 0, base);
  hz.addColorStop(0, rgba(mixc(P.haze, sky(base), 0.5), 0));
  hz.addColorStop(1, rgba(mixc(P.haze, sky(base), 0.5), 0.85));
  c.fillStyle = hz;
  c.fillRect(-K.EX, base - 150, K.WU + K.EX * 2, 200);
  c.restore();

  // The crests catch the light.
  rimLight(c, (r) => r.fill(body), 0, 1.5, mixc(P.rim, sky(top), fog * 0.5), (P.night ? 0.6 : 0.7) * (1.3 - fog));
}

// The meadow's tufts of long grass, each a list of blades [x, y, height, lean], taken from the meadow's own sequence.
// Every other tuft is painted with the island, and the rest are drawn live, so the wind can bend them.
export function meadowTufts(K, rnd) {
  const { s, isle, iw } = K,
    tufts = [];
  for (let i = 0; i < 110; i++) {
    const x = isle.x0 + iw * (0.04 + rnd() * 0.92),
      y = isle.topAt(x) + 3 * s,
      blades = [];
    for (let k = 0, n = 3 + Math.floor(rnd() * 4); k < n; k++) {
      const h = (7 + rnd() * 13) * s,
        lean = (rnd() - 0.5) * h * 0.9,
        bx = x + (rnd() - 0.5) * 5 * s;
      blades.push([bx, y, h, lean]);
    }
    tufts.push(blades);
  }
  return tufts;
}

// A meadow on the island's lip: tufts of long grass and scattered wildflowers, which glow faintly at night.
export function paintMeadow(c, K, P, ax, ay) {
  const rnd = seeded(47),
    { s, isle, iw } = K,
    grass = new Path2D(),
    stems = new Path2D(),
    heads = [];
  meadowTufts(K, rnd).forEach((blades, i) => {
    if (i % 2) return;
    for (const [bx, y, h, lean] of blades)
      taper(bx, y, bx + lean * 0.3, y - h * 0.6, bx + lean, y - h, 1.3 * s, 0.2 * s, grass);
  });
  const cols = P.night
    ? [
        [120, 240, 218],
        [176, 150, 255],
        [255, 150, 206],
        [210, 236, 240],
      ]
    : [
        [255, 214, 140],
        [244, 160, 168],
        [252, 248, 236],
        [196, 176, 255],
      ];
  for (let i = 0; i < 80; i++) {
    const x = isle.x0 + iw * (0.05 + rnd() * 0.9),
      y = isle.topAt(x) + 3 * s,
      h = (8 + rnd() * 14) * s,
      lean = (rnd() - 0.5) * 6 * s;
    stems.moveTo(x, y);
    stems.quadraticCurveTo(x + lean * 0.2, y - h * 0.5, x + lean, y - h);
    heads.push([x + lean, y - h, (1.6 + rnd() * 1.6) * s, cols[Math.floor(rnd() * cols.length)]]);
  }
  c.fillStyle = rgba(mixc(P.leafDark, P.leafMid, 0.45));
  c.fill(grass);
  rimLight(c, (r) => r.fill(grass), ax * 0.4, ay * 0.4 + 1.5 * s, P.leafLit, 0.55);
  c.strokeStyle = rgba(mixc(P.leafDark, P.leafMid, 0.6));
  c.lineWidth = 0.8 * s;
  c.stroke(stems);
  for (const [x, y, r, col] of heads) {
    if (P.night) {
      c.globalCompositeOperation = "lighter";
      puff(c, x, y, r * 5, col, 0.35);
      c.globalCompositeOperation = "source-over";
    }
    c.fillStyle = rgba(P.night ? mixc(col, [255, 255, 255], 0.4) : col);
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.fill();
  }
}

// Foliage over a wooded body, from x0 to x1 below the crest at(x) down to the foot at base. Crowns pack the slope, the
// topmost added to `body` to make its outline, and each laid in as a painter would: its body in shadow, then a few
// clumps of leaves, each with a cap lit from the sun's side and, nearer, a touch of highlight on the brightest. Crowns deeper in
// the wood are darker, and haze over as they sink toward the cloud at the foot; the lowest quarter is left to the
// cloud. Smaller, farther crowns get fewer clumps, as distance loses detail. The strokes are sorted into a few dozen
// tones, each filled at once, darkest first, so the lit leaves land on top. `cr` is the crowns' size, `fog` how far off
// the wood is. Returns what paints the leaves, for after the body is filled.
function foliage(body, K, P, seed, at, x0, x1, base, cr, fog) {
  const rnd = seeded(seed),
    shadow = mixc(P.leafDark, P.night ? [4, 8, 26] : [34, 30, 64], 0.3),
    tones = new Map(),
    clumps = Math.round(clamp((cr - 7) / 2, 1, 4)),
    tone = (v, t, cool) => {
      const id = (Math.round(clamp(v, 0, 1) * 8) * 3 + Math.round(t * 2)) * 2 + cool;
      let p = tones.get(id);
      if (!p) tones.set(id, (p = new Path2D()));
      return p;
    };
  for (let x = x0; x < x1; x += cr * 0.85)
    for (let y0 = at(x), y = y0 - cr * 0.5; y < base - (base - y0) * 0.25; y += cr * 0.75) {
      const cx = x + (rnd() - 0.5) * cr * 0.6,
        cy = y + (rnd() - 0.5) * cr * 0.4,
        r = cr * (0.5 + Math.pow(rnd(), 2) * 0.9),
        t = clamp((cy - y0) / Math.max(base - y0, 1), 0, 1),
        cool = rnd() < 0.4 ? 1 : 0,
        lx = K.L.x - cx,
        ly = K.L.y - cy,
        ll = Math.hypot(lx, ly) || 1,
        L = [(lx / ll) * 0.7, (ly / ll) * 0.7, 0.71],
        ux = lx / ll,
        uy = ly / ll;
      if (cy - r < y0 + cr * 0.5) ell(body, cx, cy, r * 1.05, r * 0.92, 0);
      for (let k = 0; k < clumps; k++) {
        const a = rnd() * TAU,
          q = Math.sqrt(rnd()) * 0.6,
          nx = Math.cos(a) * q,
          ny = Math.sin(a) * q * 0.85,
          nz = Math.sqrt(Math.max(0, 1 - nx * nx - ny * ny)),
          lit = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2] - 0.25) / 0.75,
          v = (1 - 0.75 * t) * Math.pow(lit, 1.4),
          rc = r * (0.32 + rnd() * 0.12),
          px = cx + nx * r * 0.9,
          py = cy + ny * r * 0.8,
          rot = (rnd() - 0.5) * 0.8;
        ell(tone(v * 0.45, t, cool), px, py, rc, rc * 0.85, rot);
        ell(tone(v, t, cool), px + ux * rc * 0.3, py + uy * rc * 0.3, rc * 0.68, rc * 0.52, rot);
        if (clumps > 1 && v > 0.45)
          for (let j = 0; j < 3; j++)
            ell(
              tone(v * 1.15, t, cool),
              px + ux * rc * 0.55 + (rnd() - 0.5) * rc * 0.7,
              py + uy * rc * 0.55 + (rnd() - 0.5) * rc * 0.5,
              rc * 0.22,
              rc * 0.15,
              rnd() * TAU,
            );
      }
    }
  return (c) => {
    for (const id of [...tones.keys()].sort((a, b) => a - b)) {
      const v = Math.floor(id / 6) / 8,
        t = (Math.floor(id / 2) % 3) / 2;
      let col =
        v < 0.75
          ? mixc(shadow, P.leafMid, v / 0.75)
          : mixc(P.leafMid, P.leafLit, ((v - 0.75) / 0.25) * (P.night ? 0.2 : 0.3));
      if (id % 2) col = mixc(col, shadow, 0.35);
      c.fillStyle = rgba(mixc(col, skyAt(P, base - (1 - t) * 120), Math.min(1, fog * (0.7 + t * 0.5))));
      c.fill(tones.get(id));
    }
  };
}

// The wooded hills: a rounded body crowded with crowns and the odd fir along the top, lit along the treetops.
export function paintHills(c, K, P) {
  const rnd = seeded(53),
    fog = P.night ? 0.3 : 0.36,
    sky = skyAt(P, K.HZ - 100),
    wood = new Path2D(),
    base = K.HZ + 40;
  for (const h of K.land.hills) {
    const at = (x) => h.top + (base - h.top) * Math.pow(Math.min(1, Math.abs(x - h.x) / h.hw), 1.6);
    const body = [];
    for (let x = h.x - h.hw; x <= h.x + h.hw; x += 6) body.push([x, at(x) + 6]);
    body.push([h.x + h.hw, base], [h.x - h.hw, base]);
    smoothPath(body, true, wood);
    for (let x = h.x - h.hw * 0.92; x < h.x + h.hw * 0.92; x += 5 + rnd() * 5) {
      const y = at(x) + rnd() * 10,
        r = 7 + rnd() * 9;
      if (rnd() < 0.18) {
        const ht = r * 3.2;
        wood.moveTo(x, y - ht);
        wood.lineTo(x + r * 0.7, y + r * 0.4);
        wood.lineTo(x - r * 0.7, y + r * 0.4);
        wood.closePath();
      }
    }
  }
  const leaves = K.land.hills.map((h, i) =>
    foliage(
      wood,
      K,
      P,
      71 + i,
      (x) => h.top + (base - h.top) * Math.pow(Math.min(1, Math.abs(x - h.x) / h.hw), 1.6),
      h.x - h.hw,
      h.x + h.hw,
      base,
      12,
      fog,
    ),
  );
  c.fillStyle = rgba(mixc(P.leafDark, sky, fog));
  c.fill(wood);
  for (const paint of leaves) paint(c);
  rimLight(c, (r) => r.fill(wood), 0, 2.5, mixc(P.leafLit, sky, fog * 0.5), P.night ? 0.45 : 0.6);
}

// A wooded plane: a crest of tree crowns with the odd fir, canopy texture lit from the sun's side, the crowns catching
// the light, then cloud settling into its dips and a bank of it hiding its foot.
function paintWoods(c, K, P, R, fog, cr, seed) {
  const rnd = seeded(seed),
    { pts, base } = R,
    x0 = pts[0][0],
    x1 = pts[pts.length - 1][0];
  const top = Math.min(...pts.map((p) => p[1])),
    sky = skyAt(P, top),
    body = new Path2D();
  const crest = (x) => pts[clamp(Math.round((x - x0) / 6), 0, pts.length - 1)][1];
  body.moveTo(x0, base + 60);
  // Slopes that run down to the foot close onto it, rather than ending in a cliff.
  for (const [x, y] of pts) body.lineTo(x, Math.min(y + cr * 0.4, base + 60));
  body.lineTo(x1, base + 60);
  body.closePath();
  for (let x = x0; x < x1; x += cr * (0.6 + rnd() * 0.5)) {
    const y = crest(x) + rnd() * cr * 0.5,
      r = cr * (0.65 + rnd() * 0.6);
    if (rnd() < 0.16) {
      body.moveTo(x, y - r * 2.8);
      body.lineTo(x + r * 0.7, y + r * 0.5);
      body.lineTo(x - r * 0.7, y + r * 0.5);
      body.closePath();
    }
  }
  const leaves = foliage(body, K, P, seed + 300, crest, x0, x1, base + 30, cr, fog);
  const g = c.createLinearGradient(0, top, 0, base);
  g.addColorStop(0, rgba(mixc(P.leafDark, sky, fog)));
  g.addColorStop(0.6, rgba(mixc(P.leafDark, skyAt(P, base - 60), Math.min(1, fog + 0.15))));
  g.addColorStop(1, rgba(mixc(P.haze, skyAt(P, base), 0.5)));
  c.fillStyle = g;
  c.fill(body);

  // Canopy: crowns down the slope, painted leaf by leaf. The draws the old canopy took are still taken, so the cloud
  // below keeps its place.
  for (let i = 0, n = Math.round(((x1 - x0) / cr) * 1.4) * 3; i < n; i++) rnd();
  leaves(c);
  const [ax, ay] = awayFrom(K, (x0 + x1) / 2, top, 2.5);
  rimLight(c, (r) => r.fill(body), ax, ay, mixc(P.leafLit, sky, fog * 0.5), P.night ? 0.45 : 0.6);

  // Cloud pooled in the dips, then a bank along the foot.
  for (let i = 0, n = Math.max(2, Math.round((x1 - x0) / 260)); i < n; i++) {
    const x = lerp(x0, x1, (i + 0.2 + rnd() * 0.6) / n);
    cloud(c, rnd, K, P, x, crest(x) + 60 + rnd() * 50, 160 + rnd() * 220, 40 + rnd() * 30, 12, fog * 0.8, 0.55);
  }
  for (let x = x0, n = Math.ceil((x1 - x0) / 300); n > 0; n--, x += (x1 - x0) / Math.ceil((x1 - x0) / 300)) {
    cloud(c, rnd, K, P, x + (x1 - x0) / Math.ceil((x1 - x0) / 300) / 2, base - 25, 420, 80 + rnd() * 30, 18, fog * 0.8);
  }
}

// The band of the scene wooded planes paint into: crowns and firs above the crest, the cloud at the foot below the base.
export function woodBand(...planes) {
  return [
    Math.min(...planes.flatMap((R) => R.pts.map((p) => p[1]))) - 60,
    Math.max(...planes.map((R) => R.base)) + 160,
  ];
}

// The forested ridge, on its own plane between the far range and the hills.
export function paintRidge(c, K, P) {
  paintWoods(c, K, P, K.land.ridge, P.night ? 0.42 : 0.5, 9, 61);
}

// The near slopes framing the edges of the scene, in front of the hills and behind the island.
export function paintFlanks(c, K, P) {
  K.land.flanks.forEach((R, i) => paintWoods(c, K, P, R, P.night ? 0.18 : 0.24, 15, 67 + i));
}
