// Plays the edge of the world in the canvases the page made for it: paints the still layers once per size, then draws
// what moves (the falls running, mist, the lighthouse beam and the lanterns) on the one canvas that changes, while the
// page is in view. A lantern let go sinks into the galaxy and becomes a star painted into it, which the page keeps.
// The galaxy is painted once flat, then laid down on its own canvas turned as far as the clock says, again each time
// its rim has moved about a pixel. Turning it with CSS instead costs a browser drawing on the CPU (Firefox on Linux) a
// redraw of the whole turned layer every frame anything on the page changes, which stalls it.
// Runs in a worker on canvases handed over by the page, or on the page itself. Takes messages: init {stars, spin},
// size {w, h, dpr}, on {on}, lantern {x, y}. Sends painted once the still layers are, and star {u, v, pan} when a
// lantern arrives.

import { TAU, clamp, dab, lerp, makeCanvas, mixc, rgba, seeded, sprite } from "../world/core";
import { EDGE, paintGalaxy, paintRock, paintSpace, paintWorld } from "./paint";
import { GALAXY, PAD, fallsAt, lipAt, rockPlace, spinAt } from "./layout";

// A lantern takes this long to sink from the pier to the galaxy, and a new star flares for this long, in seconds.
const SINK = 11,
  FLARE = 1.8;

/**
 * @param {{ space: any, galaxy: any, world: any, fx: any, rock: any }} cvs
 * @param {boolean} reduce
 * @param {(m: any) => void} send
 */
export function playEdge(cvs, reduce, send) {
  const ctx = cvs.fx.getContext("2d"),
    disc = makeCanvas(),
    gal = disc.getContext("2d");
  // Workers have no requestAnimationFrame in some browsers; a timer at the same rate stands in.
  const next =
    typeof requestAnimationFrame === "function"
      ? requestAnimationFrame
      : (fn) => setTimeout(() => fn(performance.now()), 16);
  let K = null,
    U = 1,
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
    flares = [];
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
    const hi = Math.min(dpr, 2);
    paintSpace(cover(cvs.space, w, h, 1), K);
    paintWorld(cover(cvs.world, w, h, hi), K);
    place = rockPlace(K);
    const b = place.box;
    cvs.rock.width = Math.round(b.w * U * hi);
    cvs.rock.height = Math.round(b.h * U * hi);
    const rc = cvs.rock.getContext("2d");
    rc.setTransform(U * hi, 0, 0, U * hi, -b.x * U * hi, -b.y * U * hi);
    paintRock(rc, K, place);
    // The galaxy is seen at a slant that squashes it, so half the resolution does.
    const G = Math.min(2048, Math.round(GALAXY.S * U * hi * 0.5));
    disc.width = disc.height = G;
    gal.setTransform(G / GALAXY.S, 0, 0, G / GALAXY.S, 0, 0);
    paintGalaxy(gal, GALAXY.S);
    for (const [u, v] of stars) star(u, v);
    laid = cover(cvs.galaxy, w, h, 1);
    layGalaxy();
    cover(cvs.fx, w, h, 1);

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
    draw(performance.now());
    send({ type: "painted" });
    kick();
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
    dab(gal, sprite(EDGE.lamp), x, y, 70, 0.3);
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

  function lantern(x, y) {
    if (!K) return;
    // A click down over the void picks where it goes; anywhere else, it finds its own way down.
    const free = y < 700,
      tx = free ? K.WU * (0.2 + rnd() * 0.6) : x,
      ty = free ? 780 + rnd() * 120 : Math.max(y, 720);
    if (reduce) return land(tx, ty);
    if (lanterns.length >= 12) return;
    const [x0, y0] = place.pier;
    lanterns.push({ x0, y0, tx, ty, t0: performance.now(), seed: rnd() * TAU });
    kick();
  }

  function falls(t) {
    ctx.fillStyle = rgba(EDGE.cloudLit);
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
    const s = sprite(mixc(EDGE.fall, EDGE.fallLit, 0.6));
    for (const m of mists)
      dab(ctx, s, m.x + Math.sin(t * 0.07 + m.ph) * 30, m.y, m.r, 0.1 + 0.04 * Math.sin(t * 0.3 + m.ph), m.hold);
  }

  // The lighthouse lamp turns: its beam swings across, shortening as it comes round toward the viewer, when the lamp
  // itself flares, and away again.
  function beam(t) {
    const [lx, ly] = place.lamp,
      phi = t * 0.45,
      across = Math.cos(phi),
      toward = Math.sin(phi);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const ex = lx + across * 1100,
      ey = ly + 40,
      hw = 30 + 50 * Math.abs(toward);
    const g = ctx.createLinearGradient(lx, ly, ex, ey);
    g.addColorStop(0, rgba(EDGE.lamp, 0.22));
    g.addColorStop(1, rgba(EDGE.lamp, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(lx, ly - 4);
    ctx.lineTo(ex, ey - hw);
    ctx.lineTo(ex, ey + hw);
    ctx.lineTo(lx, ly + 4);
    ctx.closePath();
    ctx.fill();
    if (toward > 0) dab(ctx, sprite(EDGE.lamp), lx, ly, 50 * place.s, toward ** 6 * 0.7);
    ctx.restore();
  }

  function lanternsDraw(now) {
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const glow = sprite(EDGE.lamp);
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
      ctx.fillStyle = rgba(EDGE.lamp);
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

  function draw(now) {
    if (!K) return;
    const t = now / 1000;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cvs.fx.width, cvs.fx.height);
    ctx.restore();
    if (reduce) return;
    // The rim moves about a pixel a step, the galaxy's half width in screen pixels times the angle turned.
    if (Math.abs(angle() - turned) * GALAXY.S * U * 0.5 > 1) layGalaxy();
    falls(t);
    mist(t);
    beam(t);
    lanternsDraw(now);
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
    } else if (m.type === "size") paint(m);
    else if (m.type === "on") {
      on = m.on;
      kick();
    } else if (m.type === "lantern") lantern(m.x, m.y);
  };
}
