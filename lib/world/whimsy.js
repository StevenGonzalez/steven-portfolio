// Storybook landmarks. Far out: stackhouses climbing a spire, a door standing in mid-air, a sky mill whose upfall pours
// up into a cloud while its lines fish for stars, a lighthouse, and a patchwork balloon drifting by.
// Up close: bubbles that pop when poked, and a swing hanging from the lantern tree.
// Static parts are painted with the far spires; moving parts are drawn on the back canvas in far units.

import { TAU, awayFrom, clamp, dab, lerp, makeCanvas, mixc, puff, rgba, rimLight, seeded, skyAt, sprite } from "./core";
import { cloud, islandShape, paintRock } from "./scene";
import { D_FAR, D_FRONT, D_ISLE } from "./layers";
import { pulseAt } from "./life";
import { FIRE, FIRE_CORE, spire } from "./depth";
import { ease } from "./story";
import { gust } from "./wind";

export const WOOD = [112, 80, 58],
  PLASTER = [224, 206, 178],
  LAMP = [255, 206, 128];
export const ROOFS = [
  [164, 84, 64],
  [72, 120, 122],
  [188, 140, 74],
  [118, 90, 128],
  [98, 130, 90],
];
const PATCHES = [
  [180, 86, 70],
  [234, 216, 180],
  [72, 130, 134],
  [206, 158, 82],
  [130, 92, 134],
  [226, 196, 150],
];
const CLOTHES = [
  [236, 226, 204],
  [200, 96, 82],
  [92, 150, 170],
  [226, 184, 92],
];

// A material seen through the haze at height y. At night every material first sinks toward the colour of the rock.
export function farTint(P, col, y, fog) {
  return mixc(P.night ? mixc(col, P.rock, 0.6) : col, skyAt(P, y), fog);
}

function quadAt(x0, y0, cx, cy, x1, y1, u) {
  const m = 1 - u;
  return [m * m * x0 + 2 * m * u * cx + u * u * x1, m * m * y0 + 2 * m * u * cy + u * u * y1];
}

export const turnTo = (a, b) => Math.atan2(Math.sin(b - a), Math.cos(b - a));

// Clicked, the mill's sails spin up, take off and flutter back down. FLIGHT is how long that takes in seconds.
const FLIGHT = 11;

// Clicked, the barbell in the stars does one rep, REP seconds long.
const REP = 2.4;

// Clicked, the stackhouses wobble like a jelly for WOBBLE seconds, each house a beat behind the one below.
const WOBBLE = 4;
const lean = (f, i) => (f < 0 ? 0 : 0.08 * (1 - Math.exp(-f * 12)) * Math.exp(-f * 1.2) * Math.sin(f * 7.5 - i * 0.8));

// Where each stackhouse stands this frame: the point its base pivots on, and its lean. Each house stands on the one
// below, so a house carries every house above it as it leans.
function stackFrames(St, f, dir) {
  let x = St.houses[0].x,
    y = St.houses[0].y,
    a = 0;
  return St.houses.map((H, i) => {
    if (i) {
      const B = St.houses[i - 1],
        dx = H.x - B.x,
        dy = H.y - B.y;
      x += dx * Math.cos(a) - dy * Math.sin(a);
      y += dx * Math.sin(a) + dy * Math.cos(a);
    }
    a += lean(f, i) * dir;
    return { x, y, a };
  });
}

// Moves the canvas into a stackhouse's frame, so it can draw at the house's resting coordinates.
function inHouse(c, F, H) {
  c.translate(F.x, F.y);
  c.rotate(F.a);
  c.translate(-H.x, -H.y);
}

// Where the sails are `f` seconds into a flight: an offset from the hub, a wobble, and how fast they turn.
function millFlight(f, ws) {
  if (f < 0) return null;
  const air = ease((f - 1.6) / 2.2) * (1 - ease((f - 5) / 5.5));
  return {
    air,
    x: Math.sin(f * 1.3) * 34 * ws * air,
    y: -150 * ws * air,
    tilt: Math.sin(f * 2.2) * 0.5 * air,
    spin: f < 5 ? 18 : 4,
  };
}

export function buildWhimsy(K) {
  const rnd = seeded(71),
    { WU, phone, s } = K,
    ws = phone ? 0.72 : clamp(s, 0.82, 1.05),
    e = 3 * ws;
  const W = (K.wh = { ws, spires: [], clear: [] });

  // Stackhouses: each house sits on the roof of the one below, propped up on short stilts.
  const st = spire(rnd, WU * (phone ? 0.9 : 0.445), phone ? 610 : 480, 40 * ws, true);
  st.mark = true;
  W.spires.push(st);
  // A returning visitor finds a house more on top for each day they came back (K.grown), up to two on a phone, where
  // the stack stands under the copy. Those draw on a random sequence of their own, so the rest of the sky lands in the
  // same place either way.
  const houses = [],
    wins = [],
    first = phone ? 4 : 5,
    more = seeded(72);
  let prev = null;
  for (let i = 0, n = first + Math.min(K.grown, phone ? 2 : 3); i < n; i++) {
    const r = i < first ? rnd : more;
    const w = (48 - i * 4 + r() * 8) * ws,
      h = (24 + r() * 8) * ws,
      rh = w * (0.38 + r() * 0.14),
      tilt = (r() - 0.5) * 0.1;
    const x = prev ? prev.x + (i % 2 ? 1 : -1) * (5 + r() * 6) * ws : st.x,
      y = prev ? prev.y - prev.h - prev.rh * 0.55 : st.top + 3 * ws;
    const H = {
      x,
      y,
      w,
      h,
      rh,
      tilt,
      roof: ROOFS[i % ROOFS.length],
      props: [],
      wins: [],
      wall: new Path2D(),
      cover: new Path2D(),
    };
    H.wall.rect(-w / 2, -h, w, h);
    H.cover.moveTo(-w / 2 - e, -h + 1);
    H.cover.lineTo(0, -h - rh);
    H.cover.lineTo(w / 2 + e, -h + 1);
    H.cover.closePath();
    if (prev)
      for (const side of [-1, 1]) {
        const px = x + side * w * 0.4,
          dx = Math.abs(px - prev.x),
          half = prev.w / 2 + e;
        const land = dx < half ? prev.y - prev.h - prev.rh * (1 - dx / half) : prev.y - prev.h;
        if (land > y + 1) H.props.push([px, y, px + side * 2 * ws, land]);
      }
    const spots = i === 0 ? [-0.22] : w > 38 * ws ? [-0.24, 0.24] : [0];
    for (const u of spots) {
      const lx = u * w,
        ly = -h * 0.56;
      H.wins.push([lx, ly]);
      wins.push([x + lx * Math.cos(tilt) - ly * Math.sin(tilt), y + lx * Math.sin(tilt) + ly * Math.cos(tilt)]);
    }
    houses.push(H);
    prev = H;
  }
  houses[0].door = true;
  const T0 = houses[houses.length - 1],
    cx = T0.w * 0.24,
    ry = -T0.h - T0.rh * (1 - cx / (T0.w / 2 + e));
  T0.cover.rect(cx - 3 * ws, ry - 10 * ws, 6 * ws, 12 * ws);
  const L1 = houses[1],
    lx0 = L1.x + L1.w / 2,
    ly0 = L1.y - L1.h * 0.85,
    px1 = lx0 + 44 * ws,
    py1 = L1.y - L1.h - 10 * ws;
  const roofTop = T0.y - T0.h - T0.rh;
  W.stack = {
    houses,
    wins,
    chim: [T0.x + cx, T0.y + ry - 10 * ws],
    pole: [lx0, L1.y - L1.h * 0.2, px1, py1],
    line: [lx0, ly0, (lx0 + px1) / 2, (ly0 + py1) / 2 + 8 * ws, px1, py1],
    hit: [st.x, (st.top + roofTop) / 2, (st.top - roofTop) / 2 + 8 * ws],
  };
  W.clear.push([st.x, 70 * ws]);

  // A door on a scrap of rock high in the sky, above the copy, where the sky is otherwise empty. Desktop only: a phone
  // has no sky to spare above the copy.
  if (!phone) {
    const dx = WU * 0.37,
      sh = islandShape(rnd, dx, 128, 84 * ws, 32 * ws, 0.5);
    W.door = { x: dx, y: sh.topAt(dx) + 1, w: 28 * ws, h: 46 * ws, sh };
    // Six stars in the gap between the door and the tree that make a barbell, for whoever finds them.
    const bx = WU * 0.51,
      by = 96;
    W.lifter = {
      x: bx,
      y: by,
      r: 64 * ws,
      stars: [
        [-52, -16],
        [-52, 16],
        [-26, 1],
        [24, -1],
        [52, -16],
        [52, 16],
      ].map(([x, y]) => [bx + x * ws, by + y * ws]),
    };
  }

  // The sky mill: a tower with sails on a small isle, an upfall off one end and fishing rods off the other.
  const mx = WU * (phone ? 0.14 : 0.872),
    mtop = phone ? 590 : 340,
    mw = (phone ? 110 : 150) * ws;
  const msh = islandShape(rnd, mx, mtop, mw, mw * 0.5, 0.45),
    tx = mx + mw * 0.06,
    base = msh.topAt(tx) + 2 * ws;
  const ux = mx - mw * 0.33,
    uy = msh.topAt(ux) + 1,
    jx = msh.x0 + mw * 0.7;
  W.mill = {
    sh: msh,
    tx,
    base,
    hub: [tx, base - 46 * ws],
    sail: 52 * ws,
    up: { x: ux, y0: uy, y1: uy - 110 * ws, w: 12 * ws },
    jar: [jx, msh.topAt(jx)],
    rods: [0.78, 0.85, 0.92].map((u, i) => {
      const bx = msh.x0 + mw * u,
        by = msh.topAt(bx),
        tip = [bx + (40 + i * 6) * ws, by - (22 - i * 4) * ws];
      return { base: [bx, by], tip, len: (phone ? 690 : 545 + i * 26) - tip[1] };
    }),
  };
  W.clear.push([mx, mw * 0.7]);

  if (!phone) {
    const lh = spire(rnd, WU * 0.972, 470, 30 * ws, true),
      h = 92 * ws,
      b = lh.top + 2 * ws;
    lh.mark = true;
    W.spires.push(lh);
    W.lh = { x: lh.x, base: b, h, lamp: [lh.x, b - h + 9 * ws] };
    W.clear.push([lh.x, 60 * ws]);
  }

  // The swing hangs from the rightmost of the tree's first limbs.
  const arm = K.tree.arms.reduce((a, b) => (b[4] - b[0] > a[4] - a[0] ? b : a)),
    [hx, hy] = quadAt(...arm, 0.78);
  W.swing = { x: hx, y: hy, len: K.isle.topAt(hx) - 26 * s - hy, w: 13 * s };
  return W;
}

// ---------- Painting ----------

// Spire-top landmarks, painted straight after the near spires they stand on. The stackhouses are drawn live instead,
// from sprites, so they can wobble.
export function paintTowers(c, K, P) {
  if (K.wh.lh) paintLighthouse(c, K, P);
}

// Floating landmarks, painted in front of the far cloud banks.
export function paintSkyIsles(c, K, P) {
  paintMill(c, K, P);
  if (K.wh.door) paintDoor(c, K, P);
}

// Each stackhouse is painted once per palette into a sprite of its own, with the stilts it stands on, so the stack can
// wobble. The washing pole belongs to the house it hangs from. A sprite's origin is its house's base.
function stackSprites(K, P) {
  const { stack: S, ws } = K.wh;
  if (S.P === P) return S.sprites;
  const fog = 0.4,
    sky = skyAt(P, S.hit[1]),
    [ax, ay] = awayFrom(K, S.hit[0], S.hit[1], 2.5),
    q = 2 * K.U;
  const place = (r, H) => {
    r.translate(H.x, H.y);
    r.rotate(H.tilt);
  };
  S.P = P;
  S.sprites = S.houses.map((H, i) => {
    const x0 = -H.w / 2 - 10 * ws,
      x1 = Math.max(H.w / 2 + 10 * ws, i === 1 ? S.pole[2] - H.x + 4 * ws : 0);
    const y0 = -H.h - H.rh - 18 * ws,
      y1 = 30 * ws,
      cv = makeCanvas();
    cv.width = Math.ceil((x1 - x0) * q);
    cv.height = Math.ceil((y1 - y0) * q);
    const c = cv.getContext("2d");
    c.setTransform(q, 0, 0, q, -x0 * q, -y0 * q);
    c.translate(-H.x, -H.y);
    c.lineCap = "round";
    if (i === 1) {
      const [p0, p1, p2, p3] = S.pole,
        [l0, l1, l2, l3, l4, l5] = S.line;
      c.strokeStyle = rgba(farTint(P, WOOD, p3, fog));
      c.lineWidth = 2 * ws;
      c.beginPath();
      c.moveTo(p0, p1);
      c.lineTo(p2, p3);
      c.stroke();
      c.lineWidth = 0.8 * ws;
      c.beginPath();
      c.moveTo(l0, l1);
      c.quadraticCurveTo(l2, l3, l4, l5);
      c.stroke();
    }
    c.strokeStyle = rgba(farTint(P, WOOD, H.y, fog));
    c.lineWidth = 2.2 * ws;
    for (const [x0, y0, x1, y1] of H.props) {
      c.beginPath();
      c.moveTo(x0, y0);
      c.lineTo(x1, y1);
      c.stroke();
    }
    c.save();
    place(c, H);
    c.fillStyle = rgba(farTint(P, PLASTER, H.y, fog));
    c.fill(H.wall);
    // The half turned from the light sits in shade.
    c.fillStyle = `rgba(0,0,0,${P.night ? 0.3 : 0.2})`;
    c.fillRect(K.L.x > H.x ? -H.w / 2 : 0, -H.h, H.w / 2, H.h);
    c.fillStyle = rgba(farTint(P, H.roof, H.y, fog));
    c.fill(H.cover);
    c.fillStyle = rgba(farTint(P, [34, 28, 30], H.y, fog * 0.7));
    for (const [x, y] of H.wins) c.fillRect(x - 3 * ws, y - 4 * ws, 6 * ws, 8 * ws);
    if (H.door) c.fillRect(H.w * 0.14, -12 * ws, 8 * ws, 12 * ws);
    c.restore();
    rimLight(
      c,
      (r) => {
        r.save();
        place(r, H);
        r.fill(H.wall);
        r.fill(H.cover);
        r.restore();
      },
      ax,
      ay,
      mixc(P.rim, sky, fog * 0.5),
      0.6,
    );
    return { cv, x0, y0, w: x1 - x0, h: y1 - y0 };
  });
  return S.sprites;
}

function paintLighthouse(c, K, P) {
  const { lh: L, ws } = K.wh,
    fog = 0.42,
    top = L.base - L.h,
    sky = skyAt(P, top),
    [ax, ay] = awayFrom(K, L.x, top, 2.5);
  const body = new Path2D(),
    bw = 11 * ws,
    tw = 7 * ws,
    neck = top + 17 * ws;
  body.moveTo(L.x - bw, L.base);
  body.lineTo(L.x - tw, neck);
  body.lineTo(L.x + tw, neck);
  body.lineTo(L.x + bw, L.base);
  body.closePath();
  const cap = new Path2D();
  cap.rect(L.x - tw - 3 * ws, neck - 3 * ws, (tw + 3 * ws) * 2, 3 * ws);
  cap.moveTo(L.x - 7 * ws, top + 4 * ws);
  cap.quadraticCurveTo(L.x, top - 6 * ws, L.x + 7 * ws, top + 4 * ws);
  cap.closePath();
  cap.rect(L.x - 0.6 * ws, top - 6 * ws, 1.2 * ws, 6 * ws);
  c.fillStyle = rgba(farTint(P, PLASTER, top, fog));
  c.fill(body);
  c.save();
  c.clip(body);
  c.fillStyle = rgba(farTint(P, ROOFS[0], top, fog));
  for (const k of [0.22, 0.55]) c.fillRect(L.x - bw, neck + (L.base - neck) * k, bw * 2, (L.base - neck) * 0.14);
  c.fillStyle = `rgba(0,0,0,${P.night ? 0.3 : 0.2})`;
  c.fillRect(K.L.x > L.x ? L.x - bw : L.x, top, bw, L.h);
  c.restore();
  // The lamp room: dark glass between the gallery and the dome. The lamp itself is drawn live.
  c.fillStyle = rgba(farTint(P, [40, 46, 52], top, fog * 0.6));
  c.fillRect(L.x - 5 * ws, top + 3 * ws, 10 * ws, neck - top - 5 * ws);
  c.fillStyle = rgba(farTint(P, ROOFS[0], top, fog));
  c.fill(cap);
  rimLight(
    c,
    (r) => {
      r.fill(body);
      r.fill(cap);
    },
    ax,
    ay,
    mixc(P.rim, sky, fog * 0.5),
    0.6,
  );
}

function paintMill(c, K, P) {
  const { mill: M, ws } = K.wh,
    rnd = seeded(73),
    fog = 0.42,
    top = M.hub[1],
    sky = skyAt(P, top),
    [ax, ay] = awayFrom(K, M.tx, top, 2.5);
  // The upfall: a faint column of water climbing from the lip into a small cloud of its own making.
  const U = M.up,
    g = c.createLinearGradient(0, U.y0, 0, U.y1);
  g.addColorStop(0, rgba(mixc(P.water, sky, 0.2), 0.75));
  g.addColorStop(1, rgba(mixc(P.water, sky, 0.2), 0.3));
  c.fillStyle = g;
  c.fillRect(U.x - U.w / 2, U.y1, U.w, U.y0 - U.y1);
  paintRock(c, rnd, K, P, M.sh, fog);
  cloud(c, rnd, K, P, U.x, U.y1, 70 * ws, 36 * ws, 9, 0.25);
  // The tower: whitewashed stone under a timber cap, with a door and one window.
  const body = new Path2D(),
    b = M.base,
    bw = 13 * ws,
    tw = 8 * ws,
    h = 46 * ws;
  body.moveTo(M.tx - bw, b);
  body.lineTo(M.tx - tw, b - h);
  body.lineTo(M.tx + tw, b - h);
  body.lineTo(M.tx + bw, b);
  body.closePath();
  const cap = new Path2D();
  cap.moveTo(M.tx - tw - 3 * ws, b - h + 2 * ws);
  cap.quadraticCurveTo(M.tx, b - h - 22 * ws, M.tx + tw + 3 * ws, b - h + 2 * ws);
  cap.closePath();
  c.fillStyle = rgba(farTint(P, PLASTER, top, fog));
  c.fill(body);
  c.save();
  c.clip(body);
  c.fillStyle = `rgba(0,0,0,${P.night ? 0.3 : 0.2})`;
  c.fillRect(K.L.x > M.tx ? M.tx - bw : M.tx, b - h, bw, h);
  c.restore();
  c.fillStyle = rgba(farTint(P, WOOD, top, fog));
  c.fill(cap);
  c.fillStyle = rgba(farTint(P, [34, 28, 30], top, fog * 0.7));
  c.fillRect(M.tx - 3.5 * ws, b - 12 * ws, 7 * ws, 12 * ws);
  c.fillRect(M.tx - 2.5 * ws, b - 30 * ws, 5 * ws, 6 * ws);
  // Rods propped on the far edge, and a jar for whatever they catch.
  c.strokeStyle = rgba(farTint(P, WOOD, top, fog));
  c.lineWidth = 1.5 * ws;
  c.lineCap = "round";
  for (const {
    base: [x0, y0],
    tip: [x1, y1],
  } of M.rods) {
    c.beginPath();
    c.moveTo(x0, y0);
    c.lineTo(x1, y1);
    c.stroke();
  }
  const [jx, jy] = M.jar;
  c.strokeStyle = rgba(mixc(P.light, sky, 0.4), 0.5);
  c.lineWidth = 1 * ws;
  c.strokeRect(jx - 4 * ws, jy - 11 * ws, 8 * ws, 11 * ws);
  rimLight(
    c,
    (r) => {
      r.fill(body);
      r.fill(cap);
    },
    ax,
    ay,
    mixc(P.rim, sky, fog * 0.5),
    0.6,
  );
}

function paintDoor(c, K, P) {
  const { door: D, ws } = K.wh,
    rnd = seeded(74),
    fog = 0.45,
    sky = skyAt(P, D.y),
    [ax, ay] = awayFrom(K, D.x, D.y, 2.5);
  paintRock(c, rnd, K, P, D.sh, fog);
  // Posts and a lintel around an opening; the opening itself is drawn live, since the door swings.
  const f = new Path2D(),
    b = 3.5 * ws,
    x0 = D.x - D.w / 2,
    y0 = D.y - D.h;
  f.rect(x0 - b, y0 - b, D.w + b * 2, D.h + b);
  f.rect(x0, y0, D.w, D.h);
  c.fillStyle = rgba(farTint(P, P.stone, D.y, fog * 0.8));
  c.fill(f, "evenodd");
  rimLight(c, (r) => r.fill(f, "evenodd"), ax, ay, mixc(P.rim, sky, fog * 0.5), 0.6);
}

// ---------- Life ----------

export function makeWhimsy(K) {
  const rnd = seeded(81),
    W = K.wh,
    { WU, phone } = K;
  const S = {
    rnd,
    wins: W.stack.wins.map(() => ({ on: rnd() < 0.55 ? 1 : 0, l: 0, next: rnd() * 10 })),
    smoke: [],
    puffT: 0,
    stackLit: 0,
    stackE: { hit: 0 },
    wobble: { f: -1, dir: 1, cough: 0 },
    door: { o: 0, hold: 0, next: 7, mt: 0, e: { hit: 0 } },
    motes: [],
    mill: { a: rnd() * TAU, v: 0.7, f: -1, e: { hit: 0 } },
    lifter: { l: 0, f: -1, e: { hit: 0 } },
    lines: W.mill.rods.map((_, i) => ({ ph: rnd() * TAU, reel: -1, lift: 0, wait: 6 + i * 11 + rnd() * 5, dip: 0 })),
    jar: 0,
    tug: false,
    lh: { th: 0, spin: 0, e: { hit: 0 } },
    bal: { x: WU * 0.7, y: phone ? 530 : 140, dir: -1, wait: 0, flare: 0, lift: 0, lv: 0, hov: false, e: { hit: 0 } },
    bubbles: [],
    ceil: phone ? 540 : -K.EX,
    swing: { a: 0, av: 0, e: { hit: 0 } },
  };
  for (let i = 0; i < (phone ? 4 : 7); i++) S.bubbles.push(newBubble(S, K, 100 + rnd() * 900));
  return S;
}

// Bubbles rise on the right, clear of the copy; on a phone they fade before reaching it.
function newBubble(S, K, y) {
  const r = S.rnd;
  return {
    x: K.WU * (K.phone ? 0.05 + r() * 0.9 : 0.5 + r() * 0.5),
    y,
    R: (10 + r() * 14) * (K.phone ? 0.8 : 1),
    vy: 16 + r() * 14,
    ph: r() * TAU,
    pop: -1,
    e: { hit: 0 },
  };
}

export function updateWhimsy(Lf, K, dt, pulses) {
  const W = K.wh,
    S = Lf.wh,
    t = Lf.t,
    rnd = S.rnd,
    hov = Lf.hover,
    ws = W.ws,
    { WU, EX } = K;

  // Stackhouse windows come and go on their own; hovering, or a pulse, puts every light on. A click on the stack itself
  // sets it wobbling, and the chimney coughs.
  const St = W.stack,
    Wb = S.wobble,
    knock = pulseAt(pulses, D_FAR, St.hit[0], St.hit[1], S.stackE);
  if (knock) S.stackLit = 3;
  if (knock?.[2] < St.hit[2]) {
    Object.assign(Wb, { f: 0, dir: knock[0] < 0 ? -1 : 1, cough: 5 });
    Lf.sfx.push(["wobble", St.hit[0]]);
  }
  if (Wb.f >= 0 && (Wb.f += dt) > WOBBLE) Wb.f = -1;
  S.frames = stackFrames(St, Wb.f, Wb.dir);
  S.stackLit -= dt;
  const all = hov === "stack" || S.stackLit > 0;
  for (const w of S.wins) {
    if ((w.next -= dt) <= 0) {
      w.on = rnd() < 0.55 ? 1 : 0;
      w.next = 4 + rnd() * 14;
    }
    w.l += ((all ? 1 : w.on) - w.l) * Math.min(1, dt * (all ? 8 : 2));
  }
  if ((S.puffT -= dt) <= 0) {
    const T = St.houses.length - 1,
      F = S.frames[T],
      H = St.houses[T],
      dx = St.chim[0] - H.x,
      dy = St.chim[1] - H.y;
    const big = Wb.cough > 0 && Wb.cough--;
    S.puffT = big ? 0.12 : 0.5;
    S.smoke.push({
      x: F.x + dx * Math.cos(F.a) - dy * Math.sin(F.a),
      y: F.y + dx * Math.sin(F.a) + dy * Math.cos(F.a),
      r: (big ? 6 : 3) * ws,
      life: 1,
      ph: rnd() * TAU,
    });
  }
  for (const p of S.smoke) {
    p.x += (5 + 3 * Math.sin(t + p.ph)) * ws * dt;
    p.y -= 8 * ws * dt;
    p.r += 3.5 * ws * dt;
    p.life -= dt * 0.2;
  }
  S.smoke = S.smoke.filter((p) => p.life > 0);

  // The door opens by itself now and then, when hovered, or when a pulse knocks.
  if (W.door) {
    const D = S.door,
      Wd = W.door;
    if (t > D.next) {
      D.hold = 5;
      D.next = t + 18 + rnd() * 10;
    }
    if (pulseAt(pulses, D_FAR, Wd.x, Wd.y - Wd.h / 2, D.e)) D.hold = 4;
    D.hold -= dt;
    D.o = clamp(D.o + (hov === "door" || D.hold > 0 ? dt / 1.1 : -dt / 1.5), 0, 1);
    if (D.o > 0.6 && (D.mt -= dt) <= 0) {
      D.mt = 0.22;
      S.motes.push({
        x: Wd.x + (rnd() - 0.5) * Wd.w * 0.6,
        y: Wd.y - Wd.h * (0.2 + rnd() * 0.6),
        vx: (rnd() - 0.35) * 16 * ws,
        vy: (rnd() - 0.6) * 10 * ws,
        life: 1,
        ph: rnd() * TAU,
      });
    }
  }
  for (const m of S.motes) {
    m.x += m.vx * dt;
    m.y += m.vy * dt;
    m.life -= dt / 3;
  }
  S.motes = S.motes.filter((m) => m.life > 0);

  // The mill turns with the breeze, and races when pushed. Clicked, its sails spin up and take off for a while.
  const Mi = S.mill,
    Wm = W.mill,
    push = pulseAt(pulses, D_FAR, Wm.hub[0], Wm.hub[1], Mi.e);
  if (push) Mi.v = 7;
  if (push && push[2] < Wm.sail * 1.2 && Mi.f < 0) {
    Mi.f = 0;
    Lf.sfx.push(["mill", Wm.hub[0]]);
  }
  if (Mi.f >= 0 && (Mi.f += dt) > FLIGHT) Mi.f = -1;
  const fly = (Mi.fly = millFlight(Mi.f, ws));
  Mi.v +=
    ((fly ? fly.spin : hov === "mill" ? 5 : 0.7 + 3 * Math.abs(gust(Lf.wind, K, Wm.hub[0]))) - Mi.v) *
    Math.min(1, dt * (fly ? 1.4 : 0.9));
  Mi.a += Mi.v * dt;

  // The barbell's lines show while it is hovered or lifting. A click on it starts one rep.
  if (W.lifter) {
    const Lr = S.lifter,
      Wl = W.lifter;
    if (pulseAt(pulses, D_FAR, Wl.x, Wl.y, Lr.e)?.[2] < Wl.r && Lr.f < 0) {
      Lr.f = 0;
      Lf.sfx.push(["rep", Wl.x]);
    }
    if (Lr.f >= 0 && (Lr.f += dt) > REP) Lr.f = -1;
    Lr.l = clamp(Lr.l + (hov === "lifter" || Lr.f >= 0 ? dt * 2 : -dt), 0, 1);
  }

  // Every so often a line reels in a star and drops it in the jar, then pays back out slowly. Hovering the lines checks
  // them straight away. A line still on its way down is reeled in from wherever it has got to.
  S.jar = Math.max(0, S.jar - dt * 0.3);
  if (hov === "lines" && !S.tug) {
    const idle = S.lines.filter((L) => L.reel < 0);
    if (idle.length) {
      const L = idle[Math.floor(rnd() * idle.length)];
      L.reel = L.lift;
    }
    for (const L of S.lines) L.dip = 1;
  }
  S.tug = hov === "lines";
  for (const L of S.lines) {
    L.dip = Math.max(0, L.dip - dt * 1.5);
    if (L.reel >= 0) {
      if ((L.reel += dt / 3) >= 1) {
        L.reel = -1;
        L.wait = 18 + rnd() * 22;
        S.jar = 1;
      }
    } else if ((L.wait -= dt) <= 0) L.reel = L.lift;
    L.lift = L.reel >= 0 ? L.reel : Math.max(0, L.lift - dt / 4);
  }

  // The lighthouse sweeps the haze. Hovered, it turns its lamp on the viewer and holds it there. Clicked, it gets
  // flustered and whirls its beam round for a few seconds.
  if (W.lh) {
    const Lh = S.lh,
      Wl = W.lh;
    if (pulseAt(pulses, D_FAR, Wl.x, Wl.base - Wl.h * 0.5, Lh.e)?.[2] < Wl.h * 0.6) {
      Lh.spin = 3;
      Lf.sfx.push(["spin", Wl.x]);
    }
    Lh.spin = Math.max(0, Lh.spin - dt);
    Lh.th +=
      Lh.spin > 0
        ? dt * (0.7 + 11 * ease(Lh.spin / 1.2))
        : hov === "lighthouse"
          ? turnTo(Lh.th, Math.PI / 2) * Math.min(1, dt * 3)
          : dt * 0.7;
  }

  // The balloon crosses the sky, waits, and comes back the other way. A hover or a pulse gives it a puff of flame.
  const B = S.bal;
  if (B.wait > 0) {
    if ((B.wait -= dt) <= 0) {
      B.dir = -B.dir;
      B.x = B.dir > 0 ? -EX - 40 : WU + EX + 40;
      B.y = (K.phone ? 510 : 120) + rnd() * 50;
    }
  } else {
    B.x += B.dir * 11 * dt;
    if (B.dir < 0 ? B.x < -EX - 40 : B.x > WU + EX + 40) B.wait = 14 + rnd() * 18;
  }
  const kick = (hov === "balloon" && !B.hov) || pulseAt(pulses, D_FAR, B.x, B.y - B.lift, B.e);
  B.hov = hov === "balloon";
  if (kick) {
    B.flare = 1;
    B.lv = 22 * ws;
  }
  B.flare = Math.max(0, B.flare - dt * 0.7);
  B.lv += (-B.lift * 0.4 - B.lv * 0.7) * dt;
  B.lift += B.lv * dt;

  // Bubbles pop when a pulse reaches them, so a click on one pops it; hovering only names it. A new one rises from below.
  S.bubbles = S.bubbles.map((b) => {
    if (b.pop >= 0) return (b.pop += dt) > 3 + b.R * 0.1 ? newBubble(S, K, 1000 + EX + 30) : b;
    b.y -= b.vy * dt;
    b.x += Math.sin(t * 0.8 + b.ph) * 9 * dt;
    if (b.y < S.ceil - b.R) return newBubble(S, K, 1000 + EX + 30);
    const hit = pulseAt(pulses, D_FRONT, b.x, b.y, b.e);
    if (hit) {
      b.pop = 0;
      Lf.sfx.push(["pop", b.x]);
      b.drops = Array.from({ length: 7 }, (_, i) => {
        const a = (i / 7) * TAU + rnd() * 0.5;
        return [Math.cos(a), Math.sin(a)];
      });
    }
    return b;
  });

  // The swing is a pendulum that a click pushes, and a gust too. Hovering only names it, so it stays put long enough to
  // read.
  const Sw = S.swing,
    Ws = W.swing;
  const sx = Ws.x + Math.sin(Sw.a) * Ws.len,
    sy = Ws.y + Math.cos(Sw.a) * Ws.len;
  const hit = pulseAt(pulses, D_ISLE, sx, sy, Sw.e);
  if (hit) Sw.av += hit[0] * 1.4;
  Sw.av +=
    (-(900 / Ws.len) * Math.sin(Sw.a) - Sw.av * 0.35 + 0.25 * Math.sin(t * 0.7) + 1.4 * gust(Lf.wind, K, Ws.x)) * dt;
  Sw.a = clamp(Sw.a + Sw.av * dt, -1.2, 1.2);
}

// ---------- Drawing ----------

// The far landmarks' moving parts, drawn on the back canvas in far units.
export function drawWhimsy(c, Lf, K, P, t) {
  const W = K.wh,
    S = Lf.wh,
    H = Lf.hits,
    ws = W.ws,
    fs = sprite(FIRE),
    cs = sprite(FIRE_CORE),
    ls = sprite(P.light);
  const St = W.stack;

  // The houses, then chimney smoke, washing on the line, and the lit windows, each in the frame of its house.
  const sp = stackSprites(K, P),
    fr = S.frames,
    shake = Math.abs(lean(S.wobble.f, 0)) * 18;
  St.houses.forEach((Ho, i) => {
    c.save();
    c.translate(fr[i].x, fr[i].y);
    c.rotate(fr[i].a);
    c.drawImage(sp[i].cv, sp[i].x0, sp[i].y0, sp[i].w, sp[i].h);
    c.restore();
  });
  const smokeCol = mixc(P.cloudLit, skyAt(P, St.chim[1]), 0.5),
    ss = sprite(smokeCol);
  for (const p of S.smoke) dab(c, ss, p.x, p.y, p.r * 2, 0.3 * p.life * Math.min(1, (1 - p.life) * 6));
  const [l0, l1, l2, l3, l4, l5] = St.line;
  c.save();
  inHouse(c, fr[1], St.houses[1]);
  CLOTHES.forEach((col, i) => {
    const [x, y] = quadAt(l0, l1, l2, l3, l4, l5, 0.2 + i * 0.2),
      w = (5 + (i % 2) * 2) * ws,
      h = (7 + (i % 3)) * ws;
    const sw = Math.sin(t * (2.4 + shake * 4) + i * 1.3) * 2.2 * ws * (1 + shake * 2);
    c.fillStyle = rgba(farTint(P, col, y, 0.4));
    c.beginPath();
    c.moveTo(x - w / 2, y);
    c.lineTo(x + w / 2, y);
    c.lineTo(x + w / 2 + sw, y + h);
    c.lineTo(x - w / 2 + sw * 0.8, y + h);
    c.fill();
  });
  c.restore();
  let k = 0;
  St.houses.forEach((Ho, i) => {
    c.save();
    inHouse(c, fr[i], Ho);
    for (const [x, y] of Ho.wins) {
      const l = S.wins[k++].l;
      if (l < 0.02) continue;
      c.save();
      c.translate(Ho.x, Ho.y);
      c.rotate(Ho.tilt);
      c.globalAlpha = l * 0.95;
      c.fillStyle = rgba(LAMP);
      c.fillRect(x - 3 * ws, y - 4 * ws, 6 * ws, 8 * ws);
      c.globalAlpha = 1;
      c.globalCompositeOperation = "lighter";
      dab(c, fs, x, y, 11 * ws, 0.32 * l);
      c.restore();
    }
    c.restore();
  });
  H.push(["stack", ...St.hit, D_FAR]);

  if (W.door) drawDoor(c, W.door, S, P, ws, H);
  if (W.lifter) drawLifter(c, W.lifter, S, P, t, ws, H);
  drawMill(c, W.mill, S, P, t, ws, H, fs, cs);
  if (W.lh) drawLighthouse(c, W.lh, S, P, ws, H, ls, cs);
  drawBalloon(c, S.bal, K, P, t, ws, H, fs);
}

function drawDoor(c, D, S, P, ws, H) {
  const o = ease(S.door.o),
    a = o * 1.3,
    x0 = D.x - D.w / 2,
    y0 = D.y - D.h,
    spill = P.night ? [255, 226, 168] : [176, 206, 255];
  if (o > 0.01) c.drawImage(otherSkySprite(P), x0, y0, D.w, D.h);
  // The leaf swings out toward the viewer, so its outer edge grows a little as it turns.
  const ex = x0 + D.w * Math.cos(a),
    grow = D.w * Math.sin(a) * 0.1;
  c.fillStyle = rgba(farTint(P, mixc(WOOD, [0, 0, 0], 0.3 * o), D.y, 0.4));
  c.beginPath();
  c.moveTo(x0, y0);
  c.lineTo(ex, y0 - grow);
  c.lineTo(ex, D.y + grow);
  c.lineTo(x0, D.y);
  c.fill();
  c.globalCompositeOperation = "lighter";
  dab(c, sprite(FIRE_CORE), x0 + (ex - x0) * 0.82, D.y - D.h * 0.48, 1.6 * ws, 0.7);
  if (o > 0.01) {
    const sp = sprite(spill);
    dab(c, sp, D.x, D.y - D.h * 0.45, D.h * 1.2, 0.3 * o);
    for (const m of S.motes) dab(c, sp, m.x, m.y, 4 * ws, m.life * (0.6 + 0.4 * Math.sin(m.life * 20 + m.ph)));
  }
  c.globalCompositeOperation = "source-over";
  H.push(["door", D.x, D.y - D.h / 2, D.h * 0.9, D_FAR]);
}

function drawLifter(c, L, S, P, t, ws, H) {
  const Lr = S.lifter,
    up = Lr.f >= 0 ? Math.sin((Math.PI * Lr.f) / REP) ** 2 * 22 * ws : 0,
    col = P.night ? [230, 236, 255] : [255, 244, 224];
  const st = L.stars.map(([x, y]) => [x, y - up]),
    [a, b, , , e, f] = st,
    bar = (a[1] + b[1]) / 2;
  c.globalCompositeOperation = "lighter";
  if (Lr.l > 0.01) {
    c.strokeStyle = rgba(col, 0.35 * Lr.l);
    c.lineWidth = ws;
    c.beginPath();
    c.moveTo(...a);
    c.lineTo(...b);
    c.moveTo(...e);
    c.lineTo(...f);
    c.moveTo(a[0] - 8 * ws, bar);
    c.lineTo(e[0] + 8 * ws, bar);
    c.stroke();
  }
  const gl = sprite(col);
  st.forEach(([x, y], i) => {
    const k = (P.night ? 0.9 : 0.6) * (0.75 + 0.25 * Math.sin(t * 1.7 + i * 2.1));
    dab(c, gl, x, y, 7 * ws, 0.35 * k);
    drawStar(c, x, y, (i === 2 || i === 3 ? 3 : 4.2) * ws, col, k);
  });
  c.globalCompositeOperation = "source-over";
  H.push(["lifter", L.x, L.y - up, L.r, D_FAR]);
}

function drawMill(c, M, S, P, t, ws, H, fs, cs) {
  const [ax, ay] = M.hub,
    L = M.sail,
    cloth = new Path2D(),
    spars = new Path2D(),
    fly = S.mill.fly;
  const wood = rgba(farTint(P, WOOD, ay, 0.4));
  // Flying, the sails wobble as they go, and the bare axle is left on the tower.
  c.save();
  if (fly) {
    c.fillStyle = wood;
    c.beginPath();
    c.arc(ax, ay, 2 * ws, 0, TAU);
    c.fill();
    c.translate(ax + fly.x, ay + fly.y);
    c.rotate(fly.tilt * 0.4);
    c.scale(1 - Math.abs(fly.tilt) * 0.6, 1);
  } else c.translate(ax, ay);
  for (let k = 0; k < 4; k++) {
    const a = S.mill.a + (k * TAU) / 4,
      dx = Math.cos(a),
      dy = Math.sin(a),
      nx = -dy * 8 * ws,
      ny = dx * 8 * ws;
    spars.moveTo(0, 0);
    spars.lineTo(dx * L, dy * L);
    cloth.moveTo(dx * L * 0.2, dy * L * 0.2);
    cloth.lineTo(dx * L * 0.98, dy * L * 0.98);
    cloth.lineTo(dx * L * 0.98 + nx, dy * L * 0.98 + ny);
    cloth.lineTo(dx * L * 0.2 + nx * 0.7, dy * L * 0.2 + ny * 0.7);
    cloth.closePath();
  }
  const cloth0 = farTint(P, PLASTER, ay, 0.4),
    blur = clamp((S.mill.v - 8) / 8, 0, 1);
  c.fillStyle = rgba(cloth0, 0.9 * (1 - blur * 0.6));
  c.fill(cloth);
  // Spinning flat out, the sails smear into a disc.
  if (blur > 0) {
    c.fillStyle = rgba(cloth0, 0.3 * blur);
    c.beginPath();
    c.arc(0, 0, L, 0, TAU);
    c.fill();
  }
  c.strokeStyle = wood;
  c.lineWidth = 1.6 * ws;
  c.stroke(spars);
  c.fillStyle = wood;
  c.beginPath();
  c.arc(0, 0, 2.6 * ws, 0, TAU);
  c.fill();
  c.restore();
  H.push(["mill", M.tx, M.base - 30 * ws, 44 * ws, D_FAR]);

  // Water climbing the upfall in bright streaks.
  const U = M.up;
  c.strokeStyle = rgba(mixc(P.water, [255, 255, 255], 0.5), 0.8);
  c.lineWidth = 1.8 * ws;
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const k = (t * 0.45 + i / 8) % 1,
      y = lerp(U.y0, U.y1, k),
      x = U.x + Math.sin(i * 2.3) * U.w * 0.32;
    c.moveTo(x, y + 14 * ws * (1 - k));
    c.lineTo(x, y);
  }
  c.stroke();
  H.push(["upfall", U.x, (U.y0 + U.y1) / 2, (U.y0 - U.y1) / 2, D_FAR]);

  // Lines hang into the cloud sea, each with a glowing float. A reeled-in star climbs the line to the rod.
  c.strokeStyle = rgba(mixc(P.light, skyAt(P, ay), 0.5), 0.45);
  c.lineWidth = 0.7 * ws;
  const ends = M.rods.map((r, i) => {
    const Ln = S.lines[i],
      [tx, ty] = r.tip,
      k = ease(Ln.lift),
      len = r.len * (1 - k * 0.96) + Ln.dip * 12 * ws;
    const bx = tx + Math.sin(t * 0.5 + Ln.ph) * 5 * ws * (1 - k),
      by = ty + len;
    c.beginPath();
    c.moveTo(tx, ty);
    c.quadraticCurveTo(tx + (bx - tx) * 0.3, ty + len * 0.5, bx, by);
    c.stroke();
    return [bx, by, Ln.reel >= 0];
  });
  c.globalCompositeOperation = "lighter";
  const ls = sprite(P.light);
  for (const [bx, by, star] of ends) {
    dab(c, fs, bx, by, 11 * ws, 0.6);
    dab(c, cs, bx, by, 2.4 * ws, 1);
    if (star) {
      dab(c, ls, bx, by + 6 * ws, 10 * ws, 0.5);
      drawStar(c, bx, by + 6 * ws, 5 * ws, P.light, 0.95);
    }
  }
  const [jx, jy] = M.jar;
  dab(c, ls, jx, jy - 5 * ws, (7 + 10 * S.jar) * ws, 0.25 + 0.5 * S.jar);
  dab(c, sprite(FIRE_CORE), jx, jy - 5 * ws, 2.2 * ws, 0.6 + 0.4 * S.jar);
  c.globalCompositeOperation = "source-over";
  const [mx, my] = ends[1];
  H.push(["lines", mx, (M.rods[1].tip[1] + my) / 2, (my - M.rods[1].tip[1]) / 2 + 10 * ws, D_FAR]);
}

// A four-pointed twinkle.
export function drawStar(c, x, y, r, col, a) {
  c.fillStyle = rgba(col, a);
  c.beginPath();
  for (let i = 0; i < 8; i++) {
    const ang = (i * Math.PI) / 4 - Math.PI / 2,
      rr = i % 2 ? r * 0.28 : r;
    c.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr);
  }
  c.fill();
}

function drawLighthouse(c, L, S, P, ws, H, ls, cs) {
  // The beam turns in a flat circle. Seen from the side it reaches far; turned toward the viewer it shortens and the lamp flares.
  const th = S.lh.th,
    cx = Math.cos(th),
    sn = Math.sin(th),
    [lx, ly] = L.lamp,
    len = (40 + 600 * Math.abs(cx)) * ws;
  const toward = (sn + 1) / 2,
    flare = Math.pow(Math.max(0, sn), 8);
  c.globalCompositeOperation = "lighter";
  c.save();
  c.translate(lx, ly);
  c.rotate(cx >= 0 ? 0.05 : Math.PI - 0.05);
  const cone = coneSprite(),
    a = (P.night ? 0.26 : 0.16) * (0.2 + 0.8 * toward);
  for (const [k, hw] of [
    [0.5, 38],
    [1, 16],
  ]) {
    c.globalAlpha = a * k;
    c.drawImage(cone, 0, -hw * ws * (1 + sn * 0.6), len, hw * 2 * ws * (1 + sn * 0.6));
  }
  c.restore();
  dab(c, ls, lx, ly, (10 + 46 * flare) * ws, 0.45 + 0.5 * flare);
  dab(c, cs, lx, ly, 2.4 * ws, 1);
  c.globalCompositeOperation = "source-over";
  H.push(["lighthouse", L.x, L.base - L.h * 0.5, L.h * 0.6, D_FAR]);
}

function drawBalloon(c, B, K, P, t, ws, H, fs) {
  if (B.wait > 0) return;
  const x = B.x,
    y = B.y - B.lift + Math.sin(t * 0.4) * 5 * ws,
    cv = balloonSprite(P);
  c.drawImage(cv, x - 32 * ws, y - 30 * ws, 64 * ws, 92 * ws);
  const glow = B.flare + (P.night ? 0.25 : 0);
  if (glow > 0.01) {
    c.globalCompositeOperation = "lighter";
    dab(c, sprite(LAMP), x, y + 6 * ws, 30 * ws, 0.28 * glow);
    dab(c, fs, x, y + 28 * ws, (5 + 10 * B.flare) * ws, 0.8 * glow);
    c.globalCompositeOperation = "source-over";
  }
  H.push(["balloon", x, y + 8 * ws, 34 * ws, D_FAR]);
}

// Drawn on the island layer, after the island's own life.
export function drawSwing(c, Lf, K, P) {
  const W = K.wh.swing,
    S = Lf.wh.swing,
    s = K.s,
    ca = Math.cos(S.a),
    sa = Math.sin(S.a);
  const sx = W.x + sa * W.len,
    sy = W.y + ca * W.len,
    ex = ca * W.w,
    ey = -sa * W.w;
  c.lineCap = "round";
  c.strokeStyle = rgba(mixc(P.leafDark, P.rockLit, 0.3));
  c.lineWidth = 1.1 * s;
  c.beginPath();
  c.moveTo(W.x - W.w * 0.8, W.y);
  c.lineTo(sx - ex, sy - ey);
  c.moveTo(W.x + W.w * 0.8, W.y);
  c.lineTo(sx + ex, sy + ey);
  c.stroke();
  c.strokeStyle = rgba(mixc(P.rock, P.rockLit, 0.35));
  c.lineWidth = 3.4 * s;
  c.beginPath();
  c.moveTo(sx - ex * 1.1, sy - ey * 1.1);
  c.lineTo(sx + ex * 1.1, sy + ey * 1.1);
  c.stroke();
  c.strokeStyle = rgba(P.rim, 0.45);
  c.lineWidth = 1 * s;
  c.beginPath();
  c.moveTo(sx - ex, sy - ey - 1.4 * s);
  c.lineTo(sx + ex, sy + ey - 1.4 * s);
  c.stroke();
  Lf.hits.push(["swing", sx, sy - 10 * s, 24 * s, D_ISLE]);
}

// Drawn on the front layer, last.
export function drawBubbles(c, Lf, K, P, t) {
  const S = Lf.wh,
    H = Lf.hits,
    bs = bubbleSprite(),
    ls = sprite(P.light);
  for (const b of S.bubbles) {
    if (b.pop < 0) {
      const r = b.R * (1 + 0.04 * Math.sin(t * 3 + b.ph)),
        fade = K.phone ? clamp((b.y - S.ceil) / 80, 0, 1) : 1;
      c.globalAlpha = (P.night ? 0.7 : 0.9) * fade;
      c.drawImage(bs, b.x - r, b.y - r * 1.03, r * 2, r * 2.06);
      H.push(["bubbles", b.x, b.y, b.R * 1.2, D_FRONT]);
    } else if (b.pop < 0.5) {
      const k = b.pop / 0.5;
      c.globalAlpha = 1;
      c.strokeStyle = rgba(P.light, 0.5 * (1 - k));
      c.lineWidth = 1.2;
      c.beginPath();
      c.arc(b.x, b.y, b.R * (1 + k * 0.7), 0, TAU);
      c.stroke();
      c.globalCompositeOperation = "lighter";
      for (const [dx, dy] of b.drops)
        dab(c, ls, b.x + dx * b.R * (1 + k * 2), b.y + dy * b.R * (1 + k * 2) + k * k * 14, 3, 0.8 * (1 - k));
      c.globalCompositeOperation = "source-over";
      H.push(["bubbles", b.x, b.y, b.R * 1.6, D_FRONT]);
    }
  }
  c.globalAlpha = 1;
}

// ---------- Sprites ----------

// What shows through the open door: night over there while it is dusk here, and a bright day while it is night.
let otherCv, otherKey;
function otherSkySprite(P) {
  const key = P.night ? "n" : "d";
  if (otherKey === key) return otherCv;
  otherKey = key;
  otherCv ||= makeCanvas();
  otherCv.width = 44;
  otherCv.height = 72;
  const c = otherCv.getContext("2d"),
    rnd = seeded(91),
    g = c.createLinearGradient(0, 0, 0, 72);
  if (!P.night) {
    g.addColorStop(0, "#0b1532");
    g.addColorStop(1, "#25466e");
    c.fillStyle = g;
    c.fillRect(0, 0, 44, 72);
    for (let i = 0; i < 18; i++) {
      c.fillStyle = `rgba(236,242,255,${(0.4 + rnd() * 0.6).toFixed(2)})`;
      c.beginPath();
      c.arc(rnd() * 44, rnd() * 62, rnd() < 0.2 ? 1.3 : 0.7, 0, TAU);
      c.fill();
    }
    // A crescent: the moon, then a disc of sky over most of it.
    c.fillStyle = "#f6f0d8";
    c.beginPath();
    c.arc(29, 17, 7, 0, TAU);
    c.fill();
    c.fillStyle = g;
    c.beginPath();
    c.arc(33, 14, 6.4, 0, TAU);
    c.fill();
  } else {
    g.addColorStop(0, "#6cb0e6");
    g.addColorStop(0.7, "#d2e8ee");
    g.addColorStop(1, "#f4e2b4");
    c.fillStyle = g;
    c.fillRect(0, 0, 44, 72);
    puff(c, 12, 15, 18, [255, 246, 206], 1);
    for (const [x, y, r] of [
      [22, 48, 8],
      [31, 45, 7],
      [15, 50, 6],
    ])
      puff(c, x, y, r * 1.6, [255, 255, 255], 0.95);
    c.fillStyle = "#86b26e";
    c.beginPath();
    c.ellipse(22, 76, 34, 12, 0, 0, TAU);
    c.fill();
  }
  return otherCv;
}

// The balloon in local units: envelope radius 24 centred at (0, 0), basket hanging below. Drawn 64 by 92 units.
let balloonCv, balloonKey;
function balloonSprite(P) {
  const key = P.night ? "n" : "d";
  if (balloonKey === key) return balloonCv;
  balloonKey = key;
  const R = 24,
    k = 3,
    fog = 0.3,
    tint = (col) => rgba(farTint(P, col, 150, fog));
  balloonCv ||= makeCanvas();
  balloonCv.width = 64 * k;
  balloonCv.height = 92 * k;
  const c = balloonCv.getContext("2d");
  c.setTransform(k, 0, 0, k, 32 * k, 30 * k);
  const env = new Path2D(),
    a0 = Math.PI * 0.78;
  env.arc(0, 0, R, a0, Math.PI * 0.22);
  env.quadraticCurveTo(R * 0.55, R * 0.95, R * 0.26, R * 1.14);
  env.lineTo(-R * 0.26, R * 1.14);
  env.quadraticCurveTo(-R * 0.55, R * 0.95, R * Math.cos(a0), R * Math.sin(a0));
  env.closePath();
  // Ropes and basket first, so the envelope's neck sits over the rope ends.
  c.strokeStyle = tint(WOOD);
  c.lineWidth = 0.7;
  c.beginPath();
  for (const f of [-1, -0.35, 0.35, 1]) {
    c.moveTo(R * 0.24 * f, R * 1.12);
    c.lineTo(R * 0.19 * f, R * 1.6);
  }
  c.stroke();
  c.fillStyle = tint(WOOD);
  c.fillRect(-R * 0.22, R * 1.58, R * 0.44, R * 0.32);
  c.fillStyle = "rgba(0,0,0,.25)";
  c.fillRect(-R * 0.22, R * 1.58, R * 0.44, R * 0.06);
  c.save();
  c.clip(env);
  // Gores, narrowing toward the sides the way stripes on a sphere do. The outer two reach past the clip.
  const edge = [-1.9, -0.87, -0.5, 0, 0.5, 0.87, 1.9];
  for (let i = 0; i < 6; i++) {
    const p = new Path2D(),
      b0 = edge[i],
      b1 = edge[i + 1];
    p.moveTo(0, -R * 1.05);
    p.quadraticCurveTo(R * 1.3 * b0, 0, R * 0.3 * b0, R * 1.2);
    p.lineTo(R * 0.3 * b1, R * 1.2);
    p.quadraticCurveTo(R * 1.3 * b1, 0, 0, -R * 1.05);
    c.fillStyle = tint(PATCHES[i]);
    c.fill(p);
  }
  // A few patches sewn over old tears.
  c.setLineDash([0.8, 0.8]);
  c.lineWidth = 0.4;
  c.strokeStyle = "rgba(255,255,255,.35)";
  for (const [x, y, r, i] of [
    [-9, -6, 0.3, 3],
    [7, 8, -0.2, 0],
    [2, -15, 0.1, 4],
  ]) {
    c.save();
    c.translate(x, y);
    c.rotate(r);
    c.fillStyle = tint(PATCHES[i]);
    c.fillRect(-3, -2.5, 6, 5);
    c.strokeRect(-3, -2.5, 6, 5);
    c.restore();
  }
  c.setLineDash([]);
  const g = c.createRadialGradient(R * 0.35, -R * 0.45, R * 0.1, 0, R * 0.1, R * 1.4);
  g.addColorStop(0, rgba(P.light, P.night ? 0.12 : 0.3));
  g.addColorStop(0.45, "rgba(0,0,0,0)");
  g.addColorStop(1, `rgba(0,0,0,${P.night ? 0.5 : 0.4})`);
  c.fillStyle = g;
  c.fillRect(-R * 1.2, -R * 1.2, R * 2.4, R * 2.6);
  c.restore();
  c.strokeStyle = rgba(P.rim, P.night ? 0.3 : 0.4);
  c.lineWidth = 0.7;
  c.beginPath();
  c.arc(0, 0, R - 0.3, -Math.PI * 0.45, Math.PI * 0.05);
  c.stroke();
  c.fillStyle = "rgba(20,16,14,.8)";
  c.fillRect(-2, R * 1.12, 4, 2.5);
  return balloonCv;
}

// A soap bubble: a clear middle, a thin film that brightens toward the rim, colours sliding round the edge and a window glint.
let bubbleCv;
function bubbleSprite() {
  if (bubbleCv) return bubbleCv;
  bubbleCv = makeCanvas();
  bubbleCv.width = bubbleCv.height = 96;
  const c = bubbleCv.getContext("2d"),
    R = 44,
    g = c.createRadialGradient(48, 48, 0, 48, 48, R);
  g.addColorStop(0, "rgba(255,255,255,0)");
  g.addColorStop(0.72, "rgba(255,255,255,.05)");
  g.addColorStop(0.95, "rgba(255,255,255,.3)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, 96, 96);
  const film = c.createConicGradient(0, 48, 48);
  for (const [k, col] of [
    [0, "255,160,214"],
    [0.25, "140,222,255"],
    [0.5, "255,228,140"],
    [0.75, "160,255,204"],
    [1, "255,160,214"],
  ])
    film.addColorStop(k, `rgba(${col},.5)`);
  c.strokeStyle = film;
  c.lineWidth = 3.5;
  c.beginPath();
  c.arc(48, 48, R - 3, 0, TAU);
  c.stroke();
  c.fillStyle = "rgba(255,255,255,.75)";
  c.beginPath();
  c.ellipse(33, 31, 9, 4.5, -0.7, 0, TAU);
  c.fill();
  c.fillStyle = "rgba(255,255,255,.35)";
  c.beginPath();
  c.arc(64, 66, 3, 0, TAU);
  c.fill();
  return bubbleCv;
}

// The lighthouse beam: bright at the lamp, fading along its length.
let coneCv;
function coneSprite() {
  if (coneCv) return coneCv;
  coneCv = makeCanvas();
  coneCv.width = 256;
  coneCv.height = 64;
  const c = coneCv.getContext("2d"),
    g = c.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, rgba(FIRE_CORE, 1));
  g.addColorStop(0.25, rgba(FIRE_CORE, 0.45));
  g.addColorStop(1, rgba(FIRE_CORE, 0));
  c.fillStyle = g;
  c.beginPath();
  c.moveTo(0, 29);
  c.lineTo(256, 0);
  c.lineTo(256, 64);
  c.lineTo(0, 35);
  c.fill();
  return coneCv;
}
