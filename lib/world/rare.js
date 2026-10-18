// Rare sightings. Every few minutes something rare drifts across the world, one at a time: a sky whale with her calf,
// a small island with a village of its own, or a ship made of lanterns. It is never the same one twice in a row, and
// the ones this visitor has not seen yet come first. Each has a field-guide entry of its own, off the list. A world
// held still for reduced motion never shows them, since they only pass by.

import { awayFrom, clamp, dab, ell, makeCanvas, mixc, rgba, rimLight, seeded, skyAt, sprite, taper } from './core';
import { D_BACK, RARE, drawWhale, pulseAt } from './life';
import { islandShape, paintRock } from './scene';
import { LAMP, PLASTER, ROOFS, WOOD, farTint } from './whimsy';

// When the first one comes, in seconds after the world starts, and the wait after each one has gone.
const FIRST = [100, 200], GAP = [300, 480];
// How long a whale's spout lasts, as in life.js, and how long after its mother's the calf copies it.
const SPOUT = 2.8, COPY = .7;

// `seen` is the sightings this visitor already has in their guide. `ask` names one to bring by about eight seconds in,
// for ?rare=calf and the like.
export function makeRare(seen, ask) {
  const want = RARE.includes(ask) ? ask : null;
  return { seen: new Set(seen), ask: want, next: want ? 8 : FIRST[0] + Math.random() * (FIRST[1] - FIRST[0]), cur: null, last: null };
}

const START = {
  // The mother swims right to left, high enough to cross the moon, with her calf tucked in under her flipper.
  calf: K => {
    const L = K.phone ? 130 : 210;
    return {
      key: 'calf', x: K.WU + K.EX + L * .3, y: K.phone ? 380 : 160, sp: K.phone ? 12 : 17, L, e: { hit: 0 }, copy: -1,
      mom: { dir: -1, L, ph: 0, fog: .3, spout: -1 },
      kid: { dir: -1, L: L * .4, ph: 1.3, fog: .3, spout: -1 },
    };
  },
  // The village drifts the other way, slower, above the heading; on a phone, with its roofs just under the buttons.
  hamlet: K => {
    const w = K.phone ? 96 : 150;
    return { key: 'hamlet', x: -K.EX - w, y: K.phone ? 510 : 170, sp: K.phone ? 9 : 13, w, e: { hit: 0 }, lit: 0, wave: -1 };
  },
  // The lantern ship sails high, left to right, across the top of the sky.
  lanternship: K => {
    const L = K.phone ? 80 : 140;
    return { key: 'lanternship', x: -K.EX - L, y: K.phone ? 300 : 200, sp: K.phone ? 14 : 20, L, e: { hit: 0 }, lit: 0, ring: -1 };
  },
};

function pick(R) {
  const pool = RARE.filter(k => k !== R.last), fresh = pool.filter(k => !R.seen.has(k)), from = fresh.length ? fresh : pool;
  return from[Math.floor(Math.random() * from.length)];
}

export function updateRare(Lf, K, dt, pulses) {
  const R = Lf.rare;
  if (!R.cur) {
    // None starts while the world dozes.
    if ((R.next -= dt) > 0 || Lf.doze > .5) return;
    R.cur = START[R.ask || pick(R)](K);
    R.ask = null;
  }
  const S = R.cur, t = Lf.t, looked = Lf.hover === S.key;
  if (looked) R.seen.add(S.key);
  let gone;
  if (S.key === 'calf') {
    S.x -= S.sp * dt;
    const { mom, kid, L } = S;
    mom.ph += dt * 1.1;
    kid.ph += dt * 1.7;
    [mom.x, mom.y] = [S.x, S.y];
    // The calf keeps just under and behind her flipper, drifting a little ahead and back.
    [kid.x, kid.y] = [S.x + L * (.32 + .05 * Math.sin(t * .4)), S.y + L * (.2 + .02 * Math.sin(t * .7))];
    // A click on her makes her spout, and the calf copies her a moment later, with a much smaller one.
    if (pulseAt(pulses, D_BACK, S.x + L * .4, S.y, S.e)?.[2] < L * .6 && mom.spout < 0) {
      mom.spout = 0;
      S.copy = COPY;
      Lf.sfx.push(['spout', S.x]);
    }
    if (S.copy > 0 && (S.copy -= dt) <= 0) {
      kid.spout = 0;
      Lf.sfx.push(['pfft', kid.x]);
    }
    for (const w of [mom, kid]) if (w.spout >= 0 && (w.spout += dt) > SPOUT) w.spout = -1;
    gone = S.x < -K.EX - L * 1.4;
  } else if (S.key === 'hamlet') {
    S.x += S.sp * dt;
    // Looked at, its windows light up one by one to see who it is. A click makes them all wink, one after another.
    S.lit = clamp(S.lit + (looked ? dt / 1.5 : -dt / 4), 0, 1);
    if (pulseAt(pulses, D_BACK, S.x, S.y, S.e)?.[2] < S.w * .6) {
      S.wave = 0;
      Lf.sfx.push(['hamlet', S.x]);
    }
    if (S.wave >= 0 && (S.wave += dt) > 2.2) S.wave = -1;
    gone = S.x > K.WU + K.EX + S.w;
  } else {
    S.x += S.sp * dt;
    // Looked at, the lanterns brighten. A click rings them all, bow to stern.
    S.lit = clamp(S.lit + (looked ? dt / .8 : -dt / 3), 0, 1);
    if (pulseAt(pulses, 0, S.x, S.y - S.L * .35, S.e)?.[2] < S.L * .7) {
      S.ring = 0;
      Lf.sfx.push(['lanternship', S.x]);
    }
    if (S.ring >= 0 && (S.ring += dt) > 2.4) S.ring = -1;
    gone = S.x > K.WU + K.EX + S.L;
  }
  // A quiet shimmer as it first comes into sight.
  if (!S.heard && S.x > 0 && S.x < K.WU) {
    S.heard = true;
    Lf.sfx.push(['rare', S.x]);
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
  if (S.key === 'calf') {
    drawWhale(c, S.mom, P, t);
    drawWhale(c, S.kid, P, t);
    Lf.hits.push(['calf', S.x + S.L * .45, S.y, S.L * .42, D_BACK], ['calf', S.kid.x + S.kid.L * .4, S.kid.y, S.kid.L * .6, D_BACK]);
  } else if (S.key === 'hamlet') drawHamlet(c, S, K, P, t, Lf.hits);
}

// The lantern ship, in the high sky.
export function drawRareHigh(c, Lf, K, P, t) {
  const S = Lf.rare.cur;
  if (S?.key === 'lanternship') drawShip(c, S, P, t, Lf.hits);
}

// ---------- The drifting village ----------

// The village's island, houses and tree, painted once for the theme at the most the layer is ever drawn at, 1.25
// pixels to the unit, as if it stood in the middle of the sky at its height. Its windows, chimney smoke and lantern
// are drawn live on top. Everything is kept relative to the middle of the island's top.
function hamletSprite(S, K, P) {
  if (S.img?.P === P) return S.img;
  const { w, y } = S, cx = K.WU / 2, fog = .36, q = 1.25 * K.U, rnd = seeded(31), above = w * .5, below = w * .62, side = w * .12;
  const cv = makeCanvas(), c = cv.getContext('2d');
  cv.width = Math.ceil((w + side * 2) * q);
  cv.height = Math.ceil((above + below) * q);
  c.setTransform(q, 0, 0, q, (w / 2 + side - cx) * q, (above - y) * q);
  const sh = islandShape(rnd, cx, y, w, w * .5, .45);
  paintRock(c, rnd, K, P, sh, fog);
  const tint = col => rgba(farTint(P, col, y, fog)), [ax, ay] = awayFrom(K, cx, y, 1.6), sky = skyAt(P, y);
  // A little tree at the right-hand end, with a lantern hanging from it.
  const tx = cx + w * .38, ty = sh.topAt(tx), crown = new Path2D(), wood = new Path2D();
  taper(tx, ty + 1, tx + 1, ty - w * .08, tx - 1, ty - w * .15, w * .02, w * .01, wood);
  for (let i = 0; i < 9; i++) ell(crown, tx + (rnd() - .5) * w * .1, ty - w * .17 + (rnd() - .5) * w * .06, w * .04, w * .03, rnd() * 3);
  c.fillStyle = tint(WOOD);
  c.fill(wood);
  c.fillStyle = rgba(mixc(P.leafDark, sky, fog));
  c.fill(crown);
  // Five houses crowded together, the middle ones taller, each with dark windows that light up live.
  const walls = new Path2D(), roofs = [], wins = [], chimneys = [];
  [[-.33, .09, .1], [-.19, .1, .14], [-.05, .11, .17], [.1, .1, .12], [.23, .08, .09]].forEach(([u, hw, hh], i) => {
    const x = cx + u * w, base = sh.topAt(x) + 1, W = hw * w, Ht = hh * w, top = base - Ht;
    walls.rect(x - W / 2, top, W, Ht + 1);
    const roof = new Path2D();
    roof.moveTo(x - W * .62, top + 1);
    roof.lineTo(x, top - W * .5);
    roof.lineTo(x + W * .62, top + 1);
    roof.closePath();
    roofs.push([roof, ROOFS[(i * 2) % ROOFS.length]]);
    for (const dx of hw >= .1 ? [-.22, .22] : [0]) wins.push([x + dx * W, top + Ht * .38, W * .18, W * .22]);
    if (hh >= .14) wins.push([x, top + Ht * .74, W * .18, W * .22]);
    if (i % 2 === 0) chimneys.push([x + W * .25, top - W * .3]);
  });
  c.fillStyle = tint(PLASTER);
  c.fill(walls);
  for (const [x, cy] of chimneys) {
    c.fillStyle = tint(WOOD);
    c.fillRect(x - w * .008, cy - w * .015, w * .016, w * .04);
  }
  for (const [roof, col] of roofs) {
    c.fillStyle = tint(col);
    c.fill(roof);
  }
  c.fillStyle = tint([34, 28, 30]);
  for (const [x, wy, ww, wh] of wins) c.fillRect(x - ww / 2, wy - wh / 2, ww, wh);
  rimLight(c, r => {
    r.fill(walls);
    for (const [roof] of roofs) r.fill(roof);
    r.fill(crown);
  }, ax, ay, mixc(P.rim, sky, fog * .5), .5);
  const rel = ([x, yy, ...more]) => [x - cx, yy - y, ...more];
  S.img = { P, cv, ox: w / 2 + side, oy: above, w: w + side * 2, h: above + below, wins: wins.map(rel), chimneys: chimneys.map(rel), lamp: rel([tx + w * .045, ty - w * .12]) };
  // The chimney smoke, a little of the sky behind it mixed in. Taken where the hamlet rests rather than where it has
  // bobbed to, so it is one colour, and one sprite, for the whole crossing.
  S.img.smoke = sprite(mixc(P.cloudLit, sky, .3));
  return S.img;
}

function drawHamlet(c, S, K, P, t, H) {
  const img = hamletSprite(S, K, P), x = S.x, y = S.y + Math.sin(t * .3) * 4, w = S.w, night = P.night;
  c.drawImage(img.cv, x - img.ox, y - img.oy, img.w, img.h);
  // Chimney smoke curling up and away.
  const { smoke } = img;
  for (const [cx, cy] of img.chimneys) {
    for (let j = 0; j < 4; j++) {
      const u = (t * .22 + j / 4 + cx * .01) % 1;
      dab(c, smoke, x + cx + u * w * .06 + Math.sin(t + j) * w * .01, y + cy - u * w * .16, w * (.012 + u * .03), .35 * Math.sin(Math.PI * u));
    }
  }
  // Windows: lit after dark, lit one by one while looked at, and winking in a wave after a click.
  c.globalCompositeOperation = 'lighter';
  const glow = sprite(LAMP), n = img.wins.length;
  img.wins.forEach(([wx, wy, ww, wh], i) => {
    const one = clamp(S.lit * (n + 2) - i, 0, 1), wink = S.wave >= 0 && Math.abs(S.wave * 6 - i) < 1 ? 0 : 1;
    const on = Math.max(night ? .75 + .15 * Math.sin(t * 1.3 + i * 2) : .1, one) * wink;
    if (on < .05) return;
    c.fillStyle = rgba(LAMP, on * .9);
    c.fillRect(x + wx - ww / 2, y + wy - wh / 2, ww, wh);
    dab(c, glow, x + wx, y + wy, w * .05, on * (night ? .35 : .2));
  });
  // The lantern in its tree.
  const [lx, ly] = img.lamp;
  dab(c, glow, x + lx, y + ly + Math.sin(t * 1.4) * w * .003, w * .07, night ? .55 : .3);
  dab(c, sprite([255, 244, 220]), x + lx, y + ly, w * .012, .9);
  c.globalCompositeOperation = 'source-over';
  H.push(['hamlet', x, y, w * .5, D_BACK]);
}

// ---------- The lantern ship ----------

// Where its lanterns hang, in units of its length from the middle of the keel, in strings that hold hands: the hull's
// keel and rail, the mast, the two sails and the bowsprit, with a pennant at the top.
const SHIP = (() => {
  const runs = [], line = (pts, n) => {
    const run = [];
    for (let i = 0; i < pts.length - 1; i++) {
      for (let k = 0; k < n; k++) {
        const u = k / n, [x0, y0] = pts[i], [x1, y1] = pts[i + 1];
        run.push([x0 + (x1 - x0) * u, y0 + (y1 - y0) * u]);
      }
    }
    run.push(pts[pts.length - 1]);
    runs.push(run);
  };
  line([[-.5, -.1], [-.42, .06], [-.2, .13], [.12, .12], [.36, .05], [.55, -.08]], 2);
  line([[-.52, -.13], [0, -.1], [.56, -.11]], 4);
  line([[0, -.1], [0, -.82]], 6);
  line([[.02, -.78], [.38, -.22], [.04, -.2]], 4);
  line([[-.03, -.68], [-.34, -.2], [-.04, -.2]], 3);
  line([[.56, -.11], [.78, -.2]], 2);
  line([[0, -.82], [.14, -.86], [.02, -.9]], 1);
  return runs;
})();

function drawShip(c, S, P, t, H) {
  const { L, x } = S, y = S.y + Math.sin(t * .35) * 5, rock = Math.sin(t * .5) * .04, night = P.night, cr = Math.cos(rock), sr = Math.sin(rock);
  // Each lantern bobs a little on its own. A ring runs along them from the bow back to the stern: `S.ring` is the
  // seconds since it set off, and `pos` the share of the way it has come.
  let i = 0;
  const pos = S.ring >= 0 ? S.ring / 1.4 : -9, pts = SHIP.map(run => run.map(([u, v]) => {
    const b = v + Math.sin(t * 1.3 + i++ * .9) * .008;
    return [x + (u * cr - b * sr) * L, y + (u * sr + b * cr) * L, Math.max(0, 1 - Math.abs((.8 - u) / 1.35 - pos) * 6)];
  }));
  // The strings between them first, faint.
  c.strokeStyle = rgba(night ? [255, 214, 160] : [255, 236, 210], night ? .22 : .35);
  c.lineWidth = L * .004;
  c.beginPath();
  for (const run of pts) run.forEach(([px, py], k) => (k ? c.lineTo(px, py) : c.moveTo(px, py)));
  c.stroke();
  // Then the lanterns: a warm paper body in its glow, with a bright heart.
  const glow = sprite(LAMP), core = sprite([255, 244, 220]), all = pts.flat();
  c.globalCompositeOperation = 'lighter';
  for (const [px, py, ring] of all) dab(c, glow, px, py, L * (.05 + .03 * ring), (night ? .4 : .28) * (1 + S.lit * .5 + ring));
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = rgba(night ? [255, 196, 120] : [236, 128, 82]);
  c.beginPath();
  for (const [px, py] of all) ell(c, px, py, L * .011, L * .014, 0);
  c.fill();
  c.globalCompositeOperation = 'lighter';
  for (const [px, py, ring] of all) dab(c, core, px, py, L * .012, .5 + S.lit * .4 + ring * .5);
  c.globalCompositeOperation = 'source-over';
  H.push(['lanternship', x, y - L * .35, L * .6, 0]);
}
