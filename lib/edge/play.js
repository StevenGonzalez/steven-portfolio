// Plays the edge of the world in the canvases the page made for it: paints the still layers once per size and theme,
// then draws what moves (the falls running, mist and fog, the lighthouse beam, chimney smoke, a whale, jellies and the
// lanterns) on the one canvas that changes, while the page is in view. A lantern let go sinks into the galaxy and
// becomes a star painted into it, which the page keeps.
// The galaxy is painted once flat, then laid down on its own canvas turned as far as the clock says, again each time
// its rim has moved about a pixel. Turning it with CSS instead costs a browser drawing on the CPU (Firefox on Linux) a
// redraw of the whole turned layer every frame anything on the page changes, which stalls it.
// Everything the pointer can name answers a click: the lighthouse flashes and swings its beam round, the cottage door
// opens on its lit room, the maple drops a few leaves over the edge, the whale spouts and a jelly flares. A click on
// anything else lets a lantern go from the pier toward it.
// What the rock's own things do when clicked is drawn on a canvas just in front of the rock, the rock's size, cleared
// only after something was drawn on it.
// Runs in a worker on canvases handed over by the page, or on the page itself. Takes messages: init {stars, spin,
// night}, size {w, h, dpr}, theme {night}, on {on}, view {ox, oy}, how far the layers have moved for parallax per unit
// of depth, hover {x, y} and click {x, y}, a point in the scene, lantern, one let go from the button, and twin, for the
// other theme's sky and world to fade in as the sun or moon is dragged down. Sends painted once the still layers are,
// star {u, v, pan} when a lantern arrives, hover {key} when what is under the pointer changes, and act {what, pan} when
// a click did something, for the page to sound.

import { TAU, clamp, dab, lerp, makeCanvas, mixc, rgba, seeded, sprite } from "../world/core";
import { LEAVES, seasonOf, turnOf } from "../world/calendar";
import { drawJelly, drawWhale, mistSprite } from "../world/life";
import { edgePalette, paintBody, paintFront, paintGalaxy, paintRock, paintSpace, paintWorld } from "./paint";
import { DEPTH, GALAXY, LIP, PAD, SEA, fallsAt, lipAt, moonAt, rockPlace, spinAt, sunAt } from "./layout";

// A lantern takes this long to sink from the pier to the galaxy, and a new star flares for this long, in seconds. At
// most MANY are in the air at once; one more sends the oldest straight down to make room, so no click goes unanswered.
const SINK = 9,
  FLARE = 1.8,
  MANY = 40;
// How long the lighthouse's quick turn, the open door, a falling leaf and a whale's spout last, in seconds.
const SIGNAL = 3,
  OPEN = 4,
  FALL = 6,
  SPOUT = 2.8;
// The whale takes about this long to cross, and waits about this long out of sight before it comes back, in seconds.
const CROSS = 110,
  AWAY = 25;

/**
 * @param {{ space: any, spaceTwin: any, body: any, galaxy: any, world: any, worldTwin: any, fx: any, rock: any,
 *   near: any, front: any }} cvs
 * @param {boolean} reduce
 * @param {(m: any) => void} send
 */
export function playEdge(cvs, reduce, send) {
  const ctx = cvs.fx.getContext("2d"),
    nc = cvs.near.getContext("2d"),
    disc = makeCanvas(),
    gal = disc.getContext("2d"),
    mask = makeCanvas(),
    mc = /** @type {CanvasRenderingContext2D} */ (mask.getContext("2d", { willReadFrequently: true }));
  // Workers have no requestAnimationFrame in some browsers; a timer at the same rate stands in.
  const next =
    typeof requestAnimationFrame === "function"
      ? requestAnimationFrame
      : (fn) => setTimeout(() => fn(performance.now()), 16);
  let K = null,
    U = 1,
    hi = 1,
    P = edgePalette(true),
    place = null,
    stars = [],
    spin = 0,
    on = false,
    ticking = false,
    last = 0,
    turned = 0,
    laid = null;
  let columns = [],
    mists = [],
    lanterns = [],
    flares = [],
    whale = null,
    jellies = [],
    fogs = [],
    motes = [],
    rings = [],
    leaves = [],
    hovered = null,
    aim = null,
    marked = false,
    solid = null,
    twinned = false;
  // How far the layers have moved for parallax, per unit of depth, and the lighthouse's lamp: how far round it has turned,
  // and when it was last clicked. `door` is when the cottage door was opened.
  let view = { ox: 0, oy: 0 },
    phi = 0,
    signal = -1e9,
    door = -1e9;
  const rnd = seeded(71);

  // A canvas covering the scene and its overhang at `r` pixels to a CSS pixel, set up to draw in scene units.
  function cover(cv, w, h, r) {
    cv.width = Math.round((w + PAD * 2) * r);
    cv.height = Math.round((h + PAD * 2) * r);
    const c = cv.getContext("2d");
    c.setTransform(U * r, 0, 0, U * r, PAD * r, PAD * r);
    return c;
  }

  function paint({ w, h, dpr }) {
    U = h / 1000;
    K = { WU: w / U, PAD: PAD / U };
    hi = Math.min(dpr, 2);
    place = rockPlace(K);
    // The galaxy is seen at a slant that squashes it, so half the resolution does.
    const G = Math.min(2048, Math.round(GALAXY.S * U * hi * 0.5));
    disc.width = disc.height = G;
    gal.setTransform(G / GALAXY.S, 0, 0, G / GALAXY.S, 0, 0);
    paintGalaxy(gal, GALAXY.S);
    for (const [u, v] of stars) star(u, v);
    laid = cover(cvs.galaxy, w, h, 1);
    layGalaxy();
    cover(cvs.fx, w, h, 1);
    still();

    // The falls run as streaks down columns along the edge, each its own speed, and mist hangs where they thin out.
    columns = [];
    for (let x = -K.PAD; x < K.WU + K.PAD; x += 5) {
      const f = fallsAt(x);
      if (f > 0.1)
        columns.push({
          x: x + rnd() * 3,
          top: lipAt(K, x) + 2,
          len: (170 + 300 * f) * (0.75 + rnd() * 0.25),
          f,
          ph: rnd(),
          sp: 0.16 + rnd() * 0.1,
        });
    }
    mists = [];
    for (let i = 0; i < 16; i++) {
      const x = ((i + rnd()) / 16) * K.WU,
        f = fallsAt(x);
      if (f < 0.3) continue;
      mists.push({ x, y: lipAt(K, x) + (150 + 280 * f) * 0.85, r: 60 + rnd() * 60, ph: rnd() * TAU, hold: {} });
    }
    // Life in the void: a whale that crosses now and then, jellies rising out of the galaxy, banks of fog drifting, and
    // sparks of light about the rock.
    const k = place.s;
    whale ||= { x: K.WU * 0.62, y: 720, dir: 1, L: 0, sp: 0, ph: 0, fog: 0.25, wait: 0, spout: -1 };
    whale.L = 300 * Math.max(0.6, Math.min(1, K.WU / 1500));
    whale.sp = (K.WU + whale.L * 2) / CROSS;
    jellies = Array.from({ length: K.WU < 900 ? 2 : 4 }, (_, i) => ({
      back: true,
      x: K.WU * (0.15 + rnd() * 0.8),
      y: 560 + rnd() * 440,
      R: 6 + rnd() * 5,
      ph: rnd() * TAU,
      rate: 1.3 + rnd() * 0.5,
      flash: 0,
      ci: i % 3,
      hit: 0,
      wait: 0,
    }));
    fogs = Array.from({ length: 4 }, (_, i) => ({
      x: rnd() * K.WU,
      y: 600 + i * 50 + rnd() * 40,
      w: 700 + rnd() * 500,
      sp: (4 + rnd() * 5) * (i % 2 ? 1 : -1),
      a: 0.12 + rnd() * 0.1,
    }));
    motes = Array.from({ length: 18 }, () => ({
      x: rnd() * 700 * k,
      y: 1000 - rnd() * 420 * k,
      ph: rnd() * TAU,
      sp: 3 + rnd() * 5,
      r: (1.4 + rnd() * 1.6) * Math.max(k, 0.7),
    }));
    draw(performance.now());
    send({ type: "painted" });
    kick();
  }

  // The layers that change with the theme: the sky and void, the world, the rock and the plants in front.
  function still() {
    const w = K.WU * U,
      h = 1000 * U;
    paintSpace(cover(cvs.space, w, h, 1), K, P);
    paintBody(cover(cvs.body, w, h, 1), K, P);
    paintWorld(cover(cvs.world, w, h, hi), K, P);
    twinned = false;
    const b = place.box;
    cvs.rock.width = Math.round(b.w * U * hi);
    cvs.rock.height = Math.round(b.h * U * hi);
    const rc = cvs.rock.getContext("2d");
    rc.setTransform(U * hi, 0, 0, U * hi, -b.x * U * hi, -b.y * U * hi);
    paintRock(rc, K, place, P);
    // Where the rock is solid, a cell to every four scene units, so the pointer can't reach past it to what's behind.
    mask.width = Math.ceil(b.w / 4);
    mask.height = Math.ceil(b.h / 4);
    mc.drawImage(cvs.rock, 0, 0, mask.width, mask.height);
    solid = mc.getImageData(0, 0, mask.width, mask.height).data;
    cvs.near.width = cvs.rock.width;
    cvs.near.height = cvs.rock.height;
    nc.setTransform(U * hi, 0, 0, U * hi, -b.x * U * hi, -b.y * U * hi);
    marked = false;
    paintFront(cover(cvs.front, w, h, 1), K, P);
  }

  // The sky and the world in the other theme, with its sun or moon, for the page to fade in as the sun or moon is
  // dragged down. Painted when first asked for, and again only once the size or the theme has changed.
  function twin() {
    if (!K || twinned) return;
    twinned = true;
    const w = K.WU * U,
      h = 1000 * U,
      Q = edgePalette(!P.night);
    paintSpace(cover(cvs.spaceTwin, w, h, 1), K, Q, true);
    paintWorld(cover(cvs.worldTwin, w, h, hi), K, Q);
  }

  function theme(night) {
    if (P.night !== night) {
      P = edgePalette(night);
      if (K) still();
    }
    if (K) send({ type: "painted" });
  }

  const angle = () => (reduce ? spin : spinAt(Date.now()));

  // Lays the galaxy down below the edge, turned to the angle now.
  function layGalaxy() {
    turned = angle();
    const c = laid;
    c.save();
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.clearRect(0, 0, cvs.galaxy.width, cvs.galaxy.height);
    c.restore();
    c.save();
    c.translate(K.WU / 2, GALAXY.y);
    c.scale(1, GALAXY.TILT);
    c.rotate(turned);
    c.drawImage(disc, -GALAXY.S / 2, -GALAXY.S / 2, GALAXY.S, GALAXY.S);
    c.restore();
  }

  // A star where a lantern came down, at `u`, `v` across the galaxy from its middle.
  function star(u, v) {
    const x = GALAXY.S / 2 + u,
      y = GALAXY.S / 2 + v;
    gal.save();
    gal.globalCompositeOperation = "lighter";
    dab(gal, sprite([255, 214, 150]), x, y, 70, 0.3);
    dab(gal, sprite([255, 246, 220]), x, y, 22, 0.9);
    gal.restore();
  }

  // Where a point in the scene lies on the galaxy right now, from its middle, as the galaxy is turned and laid down.
  function onGalaxy(x, y) {
    const th = angle(),
      dx = x - K.WU / 2,
      b = (y - GALAXY.y) / GALAXY.TILT;
    let u = Math.cos(th) * dx + Math.sin(th) * b,
      v = -Math.sin(th) * dx + Math.cos(th) * b;
    const r = Math.hypot(u, v),
      most = GALAXY.S * 0.45;
    if (r > most) {
      u *= most / r;
      v *= most / r;
    }
    return [Math.round(u), Math.round(v)];
  }

  function land(x, y) {
    const [u, v] = onGalaxy(x, y);
    star(u, v);
    layGalaxy();
    stars.push([u, v]);
    send({ type: "star", u, v, pan: clamp((x / K.WU) * 2 - 1, -1, 1) });
  }

  // A lantern from the pier, sinking to the galaxy below (x, y) on the layer it moves on, or from the button, wherever
  // it drifts. It sets off from the pier where the pier is on screen now.
  function lantern(x, y) {
    if (!K) return;
    const tx = x ?? K.WU * (0.2 + rnd() * 0.6),
      ty = Math.max(y ?? 780 + rnd() * 120, 720);
    if (reduce) return land(tx, ty);
    if (lanterns.length >= MANY) {
      const old = lanterns.shift();
      land(old.tx, old.ty);
    }
    const [x0, y0] = place.pier,
      k = DEPTH.rock - DEPTH.fx;
    lanterns.push({ x0: x0 + view.ox * k, y0: y0 + view.oy * k, tx, ty, t0: performance.now(), seed: rnd() * TAU });
    kick();
  }

  // A click: whatever is under it answers, or a lantern goes toward it. A ring of light shows where it landed.
  function click(x, y) {
    if (!K) return;
    const what = pick(x, y, view.ox, view.oy) ?? "lantern",
      now = performance.now(),
      fx = x - view.ox * DEPTH.fx,
      fy = y - view.oy * DEPTH.fx;
    // On the rock the ring is drawn in front of it, where the rock is.
    if (!reduce)
      rings.push(
        ["lighthouse", "cottage", "maple", "pier", "rock"].includes(what)
          ? { c: nc, x: x - view.ox * DEPTH.rock, y: y - view.oy * DEPTH.rock, t0: now }
          : { c: ctx, x: fx, y: fy, t0: now },
      );
    if (what === "lighthouse") signal = now;
    else if (what === "cottage") door = now;
    else if (what === "maple" && !reduce) shake(now);
    else if (what === "whale") whale.spout = 0;
    else if (what === "jelly") {
      const j = jellies.reduce((a, b) => (Math.hypot(b.x - fx, b.y - fy) < Math.hypot(a.x - fx, a.y - fy) ? b : a));
      j.flash = 1;
    } else if (what === "rock") lantern();
    else {
      // Over the void it sinks to the spot; over the sky, the sea or the falls, to the galaxy below it.
      lantern(clamp(fx, 0, K.WU), fy > 700 ? fy : undefined);
    }
    send({
      type: "act",
      what: ["lighthouse", "cottage", "maple", "whale", "jelly"].includes(what) ? what : "lantern",
      pan: clamp((x / K.WU) * 2 - 1, -1, 1),
    });
    if (reduce) draw(now);
    kick();
  }

  // The maple lets a few leaves go, in the season's colours, or a little snow off its bare branches, and they flutter
  // out over the edge.
  function shake(now) {
    const season = seasonOf(new Date()),
      turn = season === "autumn" ? turnOf(new Date()) : 0;
    for (let i = 0; i < 14; i++) {
      const [x, y] = place.at(352 + (rnd() - 0.5) * 60, 600 + (rnd() - 0.5) * 30);
      leaves.push({
        x,
        y,
        vx: (14 + rnd() * 24) * place.s,
        vy: (22 + rnd() * 18) * place.s,
        ph: rnd() * TAU,
        t0: now + rnd() * 400,
        snow: season === "winter",
        col: mixc(mixc(P.leaf, [120, 150, 70], rnd() * 0.5), LEAVES[i % LEAVES.length], turn * (0.7 + rnd() * 0.3)),
      });
    }
  }

  function falls(t) {
    ctx.fillStyle = rgba(P.cloudLit);
    for (const c of columns) {
      for (let k = 0; k < 2; k++) {
        const p = (t * c.sp + c.ph + k * 0.5) % 1;
        ctx.globalAlpha = c.f * 0.45 * (1 - p) * Math.min(1, p * 8);
        ctx.fillRect(c.x, c.top + c.len * p ** 1.5, 1.6, 6 + 40 * p);
      }
    }
    ctx.globalAlpha = 1;
  }

  function mist(t) {
    const s = sprite(mixc(P.fall, P.fallLit, 0.6));
    for (const m of mists)
      dab(ctx, s, m.x + Math.sin(t * 0.07 + m.ph) * 30, m.y, m.r, 0.1 + 0.04 * Math.sin(t * 0.3 + m.ph), m.hold);
  }

  // The lighthouse lamp turns: its beam swings across, shortening as it comes round toward the viewer, when the lamp
  // itself flares, and away again.
  // Clicked, it signals: the lamp flares and the beam swings round fast a few times, then slows back to its watch.
  function beam(dt, now) {
    const q = (now - signal) / 1000 / SIGNAL,
      quick = q < 1 ? Math.sin(Math.PI * Math.min(1, q * 1.5)) : 0;
    phi += dt * (0.45 + 4 * quick);
    const [lx, ly] = place.lamp,
      across = Math.cos(phi),
      toward = Math.sin(phi);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const ex = lx + across * 1100,
      ey = ly + 40,
      hw = 30 + 50 * Math.abs(toward);
    const g = ctx.createLinearGradient(lx, ly, ex, ey);
    g.addColorStop(0, rgba(P.lamp, 0.22));
    g.addColorStop(1, rgba(P.lamp, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(lx, ly - 4);
    ctx.lineTo(ex, ey - hw);
    ctx.lineTo(ex, ey + hw);
    ctx.lineTo(lx, ly + 4);
    ctx.closePath();
    ctx.fill();
    if (toward > 0) dab(ctx, sprite(P.lamp), lx, ly, 50 * place.s, toward ** 6 * 0.7);
    if (quick > 0) dab(ctx, sprite(P.lamp), lx, ly, 120 * place.s, 0.5 * quick);
    ctx.restore();
  }

  // The cottage door swings open on the lit room inside, stands open a moment while nobody comes out, and shuts.
  function doorway(now) {
    const q = (now - door) / 1000 / OPEN;
    if (q >= 1) return;
    const open = Math.min(1, q * 6, (1 - q) * 5),
      k = place.s,
      [x, y] = place.at(284, 656);
    nc.fillStyle = rgba(P.lamp, 0.95);
    nc.fillRect(x + 12 * k * (1 - open), y, 12 * k * open, 20 * k);
    nc.save();
    nc.globalCompositeOperation = "lighter";
    dab(nc, sprite(P.lamp), x + 6 * k, y + 16 * k, 40 * k, 0.5 * open);
    // Light spilling out across the turf in front.
    dab(nc, sprite(P.lamp), x + 6 * k, y + 22 * k, 26 * k, 0.35 * open);
    nc.restore();
  }

  // Leaves off the maple, rocking as they fall.
  function flutter(dt, now) {
    leaves = leaves.filter((l) => {
      const q = (now - l.t0) / 1000 / FALL;
      if (q >= 1) return false;
      if (q < 0) return true;
      l.ph += dt * 3;
      l.x += (l.vx + Math.sin(l.ph) * 30 * place.s) * dt;
      l.y += l.vy * dt;
      nc.globalAlpha = Math.min(1, (1 - q) * 3);
      if (l.snow) dab(nc, sprite([236, 244, 250]), l.x, l.y, 5 * place.s, 0.8);
      else {
        nc.save();
        nc.translate(l.x, l.y);
        nc.rotate(Math.sin(l.ph) * 0.9);
        nc.scale(1, 0.35 + 0.65 * Math.abs(Math.cos(l.ph * 0.7)));
        nc.fillStyle = rgba(l.col);
        nc.beginPath();
        nc.ellipse(0, 0, 6 * place.s, 3.6 * place.s, 0, 0, TAU);
        nc.fill();
        nc.restore();
      }
      return true;
    });
    nc.globalAlpha = 1;
  }

  // Where a click landed: a ring of the lamps' light opening out and fading.
  function ripple(now) {
    rings = rings.filter(({ c, x, y, t0 }) => {
      const q = (now - t0) / 700;
      if (q >= 1) return false;
      c.lineWidth = 1.5;
      c.strokeStyle = rgba(P.lamp, 0.6 * (1 - q));
      c.beginPath();
      c.arc(x, y, 6 + 26 * Math.sqrt(q), 0, TAU);
      c.stroke();
      return true;
    });
  }

  function lanternsDraw(now) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = sprite(P.lamp);
    lanterns = lanterns.filter((l) => {
      const q = (now - l.t0) / 1000 / SINK;
      if (q >= 1) {
        land(l.tx, l.ty);
        flares.push({ x: l.tx, y: l.ty, t0: now });
        return false;
      }
      // Up off the pier first, then out and down, growing smaller with the distance.
      const e = q * q * (3 - 2 * q),
        cx = lerp(l.x0, l.tx, 0.3),
        cy = Math.min(l.y0, l.ty) - 170,
        m = 1 - e,
        k = lerp(1, 0.08, e ** 0.7) * (place.s * 0.5 + 0.5),
        x = m * m * l.x0 + 2 * m * e * cx + e * e * l.tx + Math.sin(q * TAU * 1.5 + l.seed) * 8 * k,
        y = m * m * l.y0 + 2 * m * e * cy + e * e * l.ty,
        flicker = 0.85 + 0.15 * Math.sin(now / 90 + l.seed * 7),
        fade = Math.min(1, q * 6);
      dab(ctx, glow, x, y, 34 * k, 0.45 * flicker * fade);
      ctx.globalAlpha = fade;
      ctx.fillStyle = rgba(P.lamp);
      ctx.fillRect(x - 4 * k, y - 5 * k, 8 * k, 10 * k);
      ctx.fillStyle = rgba([255, 250, 230]);
      ctx.fillRect(x - 2 * k, y - 1 * k, 4 * k, 5 * k);
      ctx.globalAlpha = 1;
      return true;
    });
    flares = flares.filter((f) => {
      const q = (now - f.t0) / 1000 / FLARE;
      if (q >= 1) return false;
      dab(ctx, glow, f.x, f.y, lerp(8, 70, q ** 0.5), 0.8 * (1 - q));
      dab(ctx, sprite([255, 250, 236]), f.x, f.y, lerp(3, 14, q), 1 - q);
      return true;
    });
    ctx.restore();
  }

  // Banks of fog drifting slowly across the void, in front of the galaxy.
  function fog(dt) {
    const m = mistSprite(P);
    for (const f of fogs) {
      f.x += f.sp * dt;
      if (f.x > K.WU + f.w / 2) f.x = -f.w / 2;
      else if (f.x < -f.w / 2) f.x = K.WU + f.w / 2;
      ctx.globalAlpha = f.a;
      ctx.drawImage(m, f.x - f.w / 2, f.y - f.w * 0.14, f.w, f.w * 0.28);
    }
    ctx.globalAlpha = 1;
  }

  // The whale crosses the void below the rock, lit from underneath by the galaxy, then waits out of sight and comes
  // back the other way.
  function swim(dt, t) {
    const w = whale;
    if (w.wait > 0) {
      w.wait -= dt;
      return;
    }
    w.ph += dt * 1.1;
    w.x += w.dir * w.sp * dt;
    if (w.spout >= 0 && (w.spout += dt) > SPOUT) w.spout = -1;
    if (w.dir > 0 ? w.x > K.WU + w.L * 1.4 + K.PAD : w.x < -w.L * 1.4 - K.PAD) {
      w.dir = -w.dir;
      w.wait = AWAY * (0.6 + rnd() * 0.8);
      w.y = 660 + rnd() * 110;
      w.x = w.dir > 0 ? -K.PAD - w.L * 0.2 : K.WU + K.PAD + w.L * 0.2;
      return;
    }
    drawWhale(ctx, w, { ...P, haze: P.below[1][1] }, t);
  }

  // Jellies drift up out of the galaxy in slow pulses, and fade back into light as they near the falls.
  function drift(dt, t) {
    for (const j of jellies) {
      j.ph += dt * j.rate * TAU * 0.5;
      j.flash = Math.max(0, j.flash - dt * 0.7);
      const c = Math.max(0, Math.sin(j.ph));
      // A jelly that was clicked darts up faster for a moment.
      j.y -= (4 + 26 * c * c) * dt * 0.6 * (1 + j.flash * 3);
      j.x += Math.sin(t * 0.2 + j.ph * 0.1) * 4 * dt;
      if (j.y < 540) {
        j.y = 980 + rnd() * 60;
        j.x = K.WU * (0.15 + rnd() * 0.8);
      }
      ctx.globalAlpha = clamp((j.y - 540) / 120, 0, 1) * clamp((1040 - j.y) / 80, 0, 1);
      if (ctx.globalAlpha > 0.02) drawJelly(ctx, j, P, t);
      // Clicked, it flares: a burst of light opening out from it.
      if (j.flash > 0) {
        ctx.globalCompositeOperation = "lighter";
        dab(ctx, sprite([255, 250, 236]), j.x, j.y, j.R * (3 + 9 * (1 - j.flash)), 0.7 * j.flash ** 2);
        ctx.globalCompositeOperation = "source-over";
      }
    }
    ctx.globalAlpha = 1;
  }

  // Smoke from the cottage chimney, and sparks of light rising slowly about the rock.
  function about(t) {
    const [cx, cy] = place.at(299, 612),
      k = place.s,
      smoke = sprite(mixc(P.haze, P.cloudLit, 0.4));
    for (let i = 0; i < 6; i++) {
      const q = (t / 9 + i / 6) % 1;
      dab(ctx, smoke, cx + q * q * 60 * k, cy - q * 90 * k, (4 + q * 18) * k, 0.16 * Math.sin(Math.PI * q));
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = sprite(P.lamp);
    for (const m of motes) {
      const y = 1000 - ((1000 - m.y + t * m.sp) % (420 * k)),
        x = m.x + Math.sin(t * 0.4 + m.ph) * 12 * k;
      dab(ctx, glow, x, y, m.r * 4, (0.35 + 0.3 * Math.sin(t * 1.7 + m.ph)) * (P.night ? 1 : 0.6));
    }
    ctx.restore();
  }

  // What is under the pointer: the front-most of the rock's things, the rock itself, the creatures, then the scenery
  // behind.
  function pick(x, y, ox, oy) {
    const at = (d) => [x - ox * d, y - oy * d];
    let [px, py] = at(DEPTH.rock);
    const s = place.s,
      rx = px / s,
      ry = 1000 + (py - 1000) / s,
      ground = 672 + 8 * Math.abs((352 - 170) / 280) ** 2;
    if (Math.abs(rx - 160) < 28 && ry > 470 && ry < 672) return "lighthouse";
    if (rx > 240 && rx < 320 && ry > 608 && ry < 678) return "cottage";
    if (Math.hypot(rx - 352, ry - (ground - 70)) < 40) return "maple";
    if (rx > 400 && rx < 690 && ry > 632 && ry < 740) return "pier";
    const b = place.box,
      i = Math.floor((px - b.x) / 4),
      j = Math.floor((py - b.y) / 4);
    if (i >= 0 && j >= 0 && i < mask.width && j < mask.height && solid[(j * mask.width + i) * 4 + 3] > 128)
      return "rock";
    [px, py] = at(DEPTH.fx);
    // The whale's body, head to the root of the tail, as it rises and falls a little.
    const w = whale,
      wx = (px - (w.x - w.dir * w.L * 0.45)) / (w.L * 0.5),
      wy = (py - w.y) / (w.L * 0.17 + 8);
    if (!(w.wait > 0) && wx * wx + wy * wy < 1) return "whale";
    for (const j of jellies) if (j.y > 600 && Math.hypot(px - j.x, py - j.y) < j.R * 2.5) return "jelly";
    [px, py] = at(DEPTH.space);
    const [bx, by] = P.night ? moonAt(K) : sunAt(K);
    if (py < SEA && Math.hypot(px - bx, py - by) < 46) return P.night ? "moon" : "sun";
    [px, py] = at(DEPTH.world);
    const lip = lipAt(K, px);
    if (py > SEA - 40 && py < lip - 8) return "sea";
    if (py >= lip - 8 && py < lip + 320 && fallsAt(px) > 0.3) return "falls";
    [px, py] = at(DEPTH.galaxy);
    const gx = (px - K.WU / 2) / (GALAXY.S * 0.45),
      gy = (py - GALAXY.y) / (GALAXY.S * 0.45 * GALAXY.TILT);
    if (py > LIP + 300 && gx * gx + gy * gy < 1) return "galaxy";
    return null;
  }

  // Says what is under the pointer, at `p` in the scene, when that changes.
  function over(p) {
    let key = K ? pick(p.x, p.y, view.ox, view.oy) : null;
    if (key === "rock") key = null;
    if (key !== hovered) send({ type: "hover", key: (hovered = key) });
  }

  let then = 0;
  function draw(now) {
    if (!K) return;
    const t = now / 1000,
      dt = Math.min(0.1, (now - (then || now)) / 1000);
    then = now;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cvs.fx.width, cvs.fx.height);
    ctx.restore();
    if (reduce) return;
    // The rim moves about a pixel a step, the galaxy's half width in screen pixels times the angle turned.
    if (Math.abs(angle() - turned) * GALAXY.S * U * 0.5 > 1) layGalaxy();
    fog(dt);
    drift(dt, t);
    swim(dt, t);
    falls(t);
    mist(t);
    // What belongs to the rock is drawn where the rock is on screen, though this layer moves less for parallax.
    const k = DEPTH.rock - DEPTH.fx;
    ctx.save();
    ctx.translate(view.ox * k, view.oy * k);
    about(t);
    beam(dt, now);
    ctx.restore();
    if (marked) {
      nc.save();
      nc.setTransform(1, 0, 0, 1, 0, 0);
      nc.clearRect(0, 0, cvs.near.width, cvs.near.height);
      nc.restore();
    }
    marked = (now - door) / 1000 < OPEN || leaves.length > 0 || rings.some((r) => r.c === nc);
    doorway(now);
    flutter(dt, now);
    lanternsDraw(now);
    ripple(now);
  }

  function frame(now) {
    ticking = false;
    if (!on) return;
    // Thirty frames a second is plenty for falls and drifting lights.
    if (now - last >= 32) {
      last = now;
      draw(now);
    }
    kick();
  }
  function kick() {
    if (ticking || !on || reduce || !K) return;
    ticking = true;
    next(frame);
  }

  return (m) => {
    if (m.type === "init") {
      stars = m.stars;
      spin = m.spin;
      P = edgePalette(m.night);
    } else if (m.type === "size") paint(m);
    else if (m.type === "theme") theme(m.night);
    else if (m.type === "view") {
      // The layers moving can bring something else under a pointer that stays still.
      view = m;
      if (aim) over(aim);
    } else if (m.type === "hover") over((aim = m));
    else if (m.type === "on") {
      on = m.on;
      kick();
    } else if (m.type === "click") click(m.x, m.y);
    else if (m.type === "twin") twin();
    else if (m.type === "lantern") {
      lantern();
      if (K) send({ type: "act", what: "lantern", pan: -0.6 });
    }
  };
}
