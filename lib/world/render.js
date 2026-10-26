// Draws the world: every canvas layer, everything that moves, and the hit tests behind the field-guide labels. Where the
// browser can hand canvases to a worker, this runs in render.worker.js, so the page's main thread only slides the
// finished layers about; otherwise it runs on the page. Either way, whatever drives it (stage.js on the home page,
// peek.js in the article on how it works) reaches it only through the function makeRenderer returns, and it answers
// only through `send`, listing beside an answer anything a worker should hand over rather than copy.

import { PAD, TAU, clamp, dab, makeCanvas, mixc, panAt, rgba, shuffle, sprite } from "./core";
import { layout, midBand, setLight, paintGate } from "./scene";
import { D_BACK, D_FAR, D_FRONT, D_ISLE, LAYERS, shift } from "./layers";
import { makeLife, updateLife, drawIsle, drawFront, drawBack, spawnKoi } from "./life";
import { makeDepth, updateDepth, drawFar, drawHigh, drawNearLife, catchMeteor } from "./depth";
import { woodBand } from "./land";
import { makeWhimsy, updateWhimsy, drawSwing, drawBubbles, drawStar } from "./whimsy";
import { makeCall, updateCall, drawCall } from "./story";
import { makeCritters, updateCritters, drawCritters, drawUnderside, napOnSwing, wander } from "./critters";
import { overture, stagger } from "./arrival";
import { makeDesk, onArch, knock, updateDesk, drawDesk } from "./desk";
import { PAINTERS } from "./painters";
import { LEAVES } from "./calendar";
import {
  makeSeason,
  palette,
  catchBit,
  leafColour,
  leafFlip,
  updateSeason,
  drawSeasonIsle,
  drawSeasonFront,
  drawSeasonBack,
  drawSnowCaps,
  launch,
} from "./season";
import { makePlay, updatePlay, drawPlay, drawPlayFront, press, drag, release, sweep, catchAt, fall } from "./play";
import { makeSapling, plantAt, updateSapling, drawSapling } from "./sapling";
import { makeKite, grab, pull, letGo, snag, updateKite, drawKite } from "./kite";
import { makeRare, updateRare, drawRareBack, drawRareHigh } from "./rare";
import { startFestival, updateFestival, drawFestival } from "./festival";
import { makeStars, starAt, linkFrom, linkTo, linkDone, updateStars, drawStars } from "./stars";
import { makeBand, bandPans, hearing, drawBand, drawMoonCamp } from "./band";
import { makeToast, fireSpot, toast, eat, updateToast, drawToast } from "./toast";
import { makeQuantum, glance, hop, drawQuantum } from "./quantum";
import { makeWind, updateWind, drawWind } from "./wind";
import { makePile, poke, updatePile, drawPile } from "./pile";
import { makeMail, bringMail, updateMail, drawMail } from "./mail";
import { makeSeeds, blowAt, updateSeeds, drawSeeds } from "./seeds";
import { makeTrain, updateTrain, ring, drawTrain } from "./train";
import { makeWeather, updateWeather, drawFog, drawWeather, drawWeatherBack } from "./weather";

const PULSE_LIFE = 1.8;
// How long, in seconds, nothing has to move before the world dozes off, and how long it takes to fall asleep and to
// wake up again.
const DOZE = 60,
  FALL_ASLEEP = 8,
  WAKE_UP = 2.5;
// How long the sun takes to swell before the world starts over, in seconds.
const SWELL = 14;
const NOVA = [150, 200, 255],
  NOVA_CORE = [236, 244, 255];
// The cloud shadows: how fast each drifts (scene units a second), where along its way it starts (0 to 1), how high it
// crosses (from the island's top, up into the crown), and how wide it is. Each is the same clump of puffs, given as
// where each puff sits and how big it is, as fractions of the width.
const SHADE = [22, 18, 48],
  CLOUDS = [
    [11, 0.1, -40, 520],
    [15, 0.45, -220, 380],
    [9, 0.78, 120, 560],
  ],
  CLUMP = [
    [0, 0, 0.5],
    [0.36, 0.07, 0.36],
    [-0.33, 0.05, 0.33],
    [0.1, -0.1, 0.3],
  ];

// A layer that only paints a band of the scene (top and bottom in scene units) gets a canvas just that tall, so there is
// less to composite.
const BANDS = {
  ridge: (K) => woodBand(K.land.ridge),
  mid: midBand,
  flanks: (K) => woodBand(...K.land.flanks),
  // The cloud shadows reach from over the crown to the island's upper rock.
  shade: (K) => [K.top - 320 * K.s, K.top + 260 * K.s],
};

/** A row of LAYERS as the renderer keeps it: with its canvas, the function that draws it if it moves, the band of the
 *  scene it covers, and what `fit` last sized it to.
 *  @typedef {import("./core").Context2D} Context2D
 *  @typedef {import("./life").Hit} Hit
 *  @typedef {(typeof LAYERS)[number] & {
 *    cv: HTMLCanvasElement | OffscreenCanvas, c: Context2D, draw: any, band: any,
 *    r: number, top: number, css: { w: number, h: number, top: number }, hits: Hit[] | null
 *  }} Layer */

export function makeRenderer(canvases, reduce, send) {
  let K,
    P,
    Lf,
    W = 0,
    H = 0,
    dpr = 1,
    mx = 0,
    my = 0,
    scroll = 0,
    pointer = null,
    pulses = [],
    pulseId = 0,
    shown = null,
    shot = false;
  // How many of the band have joined, which outlasts a new layout, and the players at the fire under the pointer.
  let joined = 0,
    near = null;
  // The sun swelling blue, which the page starts the world over from; one asked for during the festival waits for it
  // to end. A festival asked for while the world dozes waits for it to wake. Both outlast a new layout, since neither is
  // asked for again. `stale` is a world held still that needs drawing again.
  let nova = null,
    novaWant = false,
    festWant = false,
    stale = false;

  const offset = (d) => shift(d, mx, my, scroll, H);
  function toLayer(d, px, py) {
    const [ox, oy] = offset(d);
    return { x: (px - ox) / K.U, y: (py - oy) / K.U };
  }
  const ptr = (d) => (pointer ? toLayer(d, pointer.x, pointer.y) : null);
  // A place in the high sky, as it stands on the island's layer right now.
  function skyToIsle(x, y) {
    const [ox, oy] = offset(0);
    return toLayer(D_ISLE, x * K.U + ox, y * K.U + oy);
  }

  // Far life and the high sky share the back canvas to save layers, each shifted every frame so it stays registered
  // with its own layer.
  function drawFarAndBack(c, ...a) {
    const [fx, fy] = offset(D_FAR),
      [bx, by] = offset(D_BACK),
      [sx, sy] = offset(0);
    c.save();
    c.translate((sx - bx) / K.U, (sy - by) / K.U);
    drawHigh(c, ...a);
    drawMoonCamp(c, ...a);
    drawRareHigh(c, ...a);
    drawQuantum(c, ...a);
    drawStars(c, ...a);
    drawWeatherBack(c, a[0], a[1]);
    drawNova(c, a[1]);
    c.restore();
    c.save();
    c.translate((fx - bx) / K.U, (fy - by) / K.U);
    drawFar(c, ...a);
    drawTrain(c, ...a);
    drawBand(c, ...a);
    c.restore();
    drawBack(c, ...a);
    drawFog(c, ...a);
    drawRareBack(c, ...a);
    drawSeasonBack(c, a[0].season, a[1], a[2], a[3]);
  }
  const DRAW = {
    back: drawFarAndBack,
    shade: drawShade,
    isle: (c, Lf, K, P, t) => {
      drawUnderside(c, Lf, K, P, t);
      drawDesk(c, Lf, K, P, t);
      drawWind(c, Lf, K, P, t);
      drawSeeds(c, Lf, K, P, t);
      drawPile(c, Lf, K, P);
      drawIsle(c, Lf, K, P, t);
      drawSapling(c, Lf, K, P, t);
      drawToast(c, Lf, K, P, t);
      drawMail(c, Lf, K, P, t);
      drawSnowCaps(c, Lf.season, K, P);
      drawCritters(c, Lf, K, P, t);
      drawSwing(c, Lf, K, P);
      drawCall(c, Lf, K, P, t);
      drawSeasonIsle(c, Lf.season, K, P);
      drawPlay(c, Lf, K, P, t);
      drawFestival(c, Lf, K, P);
      drawKite(c, Lf, K, P);
    },
    front: (...a) => {
      drawFront(...a);
      drawNearLife(...a);
      drawBubbles(...a);
      drawSeasonFront(a[0], a[1].season, a[2], a[3]);
      drawWeather(...a);
      drawSparks(...a);
      drawPlayFront(...a);
      drawDusk(...a);
      drawFlash(a[0], a[2]);
    },
  };
  const layers = /** @type {Layer[]} */ (
    LAYERS.map((l, i) => ({
      ...l,
      cv: canvases[i],
      c: canvases[i].getContext("2d"),
      draw: l.draw && DRAW[l.draw],
      band: BANDS[l.paint ?? l.draw],
    }))
  );

  // The monitor on the desk behind the arch shows this world, copied small from the layers once as the arch opens and
  // cropped to fill. Copying every frame cost too much for a picture this size.
  const screen = makeCanvas(),
    sc = screen.getContext("2d");
  screen.width = 160;
  screen.height = 100;
  function copyWorld() {
    const k = Math.max(screen.width / W, screen.height / H),
      dx = (screen.width - W * k) / 2,
      dy = (screen.height - H * k) / 2;
    for (const l of layers) {
      const [ox, oy] = offset(l.d);
      sc.drawImage(l.cv, dx + (ox - PAD) * k, dy + (l.top - PAD + oy) * k, (W + PAD * 2) * k, (l.cv.height / l.r) * k);
    }
  }

  // A still of the world as it looks right now, for a postcard: every layer flattened, at up to 2000 pixels wide.
  function snap() {
    const s = Math.min(2, 2000 / W),
      cv = makeCanvas(),
      c = cv.getContext("2d");
    cv.width = Math.round(W * s);
    cv.height = Math.round(H * s);
    for (const l of layers) {
      const [ox, oy] = offset(l.d);
      c.drawImage(l.cv, (ox - PAD) * s, (l.top - PAD + oy) * s, (W + PAD * 2) * s, (l.cv.height / l.r) * s);
    }
    const img = "transferToImageBitmap" in cv ? cv.transferToImageBitmap() : cv;
    send({ type: "snap", img }, [img]);
  }

  // A new field-guide entry throws a little burst of sparks from the pointer. Sparks live in hero pixels.
  let sparks = [];
  function burst(sx, sy) {
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * TAU,
        v = 50 + Math.random() * 120;
      sparks.push({
        sx,
        sy,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 30,
        age: 0,
        life: 0.9 + Math.random() * 0.9,
        r: 1.5 + Math.random() * 2.5,
        star: i % 3 === 0,
      });
    }
  }
  function updateSparks(dt) {
    const drag = Math.pow(0.05, dt);
    for (const p of sparks) {
      p.age += dt;
      p.vx *= drag;
      p.vy = p.vy * drag - 26 * dt;
      p.sx += p.vx * dt;
      p.sy += p.vy * dt;
    }
    sparks = sparks.filter((p) => p.age < p.life);
  }
  function drawSparks(c, Lf, K, P) {
    if (!sparks.length) return;
    const gs = sprite(P.glow),
      U = K.U;
    c.globalCompositeOperation = "lighter";
    for (const p of sparks) {
      const { x, y } = toLayer(D_FRONT, p.sx, p.sy),
        k = 1 - p.age / p.life,
        tw = 0.75 + 0.25 * Math.sin(p.age * 30 + p.r * 9);
      dab(c, gs, x, y, (p.r * 5) / U, (P.night ? 0.5 : 0.28) * k);
      if (p.star) drawStar(c, x, y, (p.r * 3.2 * tw) / U, [255, 250, 235], k);
      else dab(c, sprite([255, 250, 235]), x, y, (p.r * 1.4) / U, k);
    }
    c.globalCompositeOperation = "source-over";
  }

  // Sizes a layer's canvas to its band. Animated layers are redrawn in full every frame, so their pixel ratio is kept
  // lower than the painted layers', drops to 1 once frames run long, and to .7 if that is still not enough. `css` is
  // the size and place the page gives it.
  function fit(l) {
    l.r = l.res * Math.min(dpr, l.draw ? (lite ? 1 : 1.25) : 1.75) * (l.draw && lower ? 0.7 : 1);
    const [y0, y1] = l.band ? l.band(K) : [-K.EX, 1000 + K.EX],
      bottom = Math.min(H + PAD * 2, Math.ceil(y1 * K.U + PAD));
    l.top = Math.max(0, Math.floor(y0 * K.U + PAD));
    l.cv.width = Math.round((W + PAD * 2) * l.r);
    l.cv.height = Math.round((bottom - l.top) * l.r);
    l.css = { w: W + PAD * 2, h: bottom - l.top, top: l.top - PAD };
    // Resized, so it is blank: a half-rate layer must draw on the next frame.
    l.hits = null;
  }

  // Lays the world out for the hero's size and tells the page where everything went. On first load the page has the
  // paint worker paint the static layers (`wait`), and sends them on when they are done.
  function rebuild(m) {
    ({ W, H, dpr } = m);
    // A storm raining when the world is laid out again is gone, so its rain has to stop. Rain stopping fades out where it
    // was, so the place given for it here is never heard.
    const raining = Lf?.play.storm?.sent > 0;
    // A few things the visitor did outlast the world being laid out again, even when it starts over: where the shy rock
    // got to, a kite caught in the tree, and the sticks of burnt marshmallows standing by the fire.
    const kept = Lf && { rock: Lf.quantum.at, caught: Lf.kite.st === "caught", burnt: Lf.toast.burnt };
    K = layout(W, H, m.grown, m.occasion, m.here);
    Lf = makeLife(K);
    Lf.depth = makeDepth(K, m.shower);
    Lf.call = makeCall(K);
    Lf.wh = makeWhimsy(K);
    Lf.critters = makeCritters(K, m.night);
    Lf.desk = makeDesk();
    Lf.desk.view = screen;
    Lf.season = makeSeason(K, m.season, m.turn);
    Lf.play = makePlay(K, m.jar, m.jarStars);
    Lf.sapling = makeSapling(K, m.sapling);
    Lf.kite = makeKite(K);
    Lf.wind = makeWind(K);
    Lf.pile = makePile(K, m.season, m.turn);
    Lf.rare = makeRare(m.rare, m.ask);
    Lf.stars = makeStars(K, m.stars);
    Lf.quantum = makeQuantum(K, Lf.stars.pts);
    Lf.band = makeBand(K);
    Lf.band.n = joined;
    Lf.toast = makeToast(K, Lf.sapling);
    Lf.mail = makeMail(K, m.mail);
    Lf.seeds = makeSeeds(Lf, K, m.seeds);
    Lf.train = makeTrain();
    Lf.weather = m.weather && makeWeather(Lf, K, m.weather);
    if (kept) {
      if (Lf.quantum.spots[kept.rock]) Lf.quantum.at = kept.rock;
      if (kept.caught) snag(Lf, K);
      Lf.toast.burnt = kept.burnt;
    }
    // A screen this device was too slow for last time starts at the step down it needed then.
    if (m.tier >= 1 && !lite) lite = true;
    if (m.tier >= 2) lower = true;
    for (const l of layers) fit(l);
    if (m.wait) theme(m.night);
    else paint(m.night);
    send({
      type: "layout",
      first: m.first,
      U: K.U,
      phone: K.phone,
      L: [K.L.x, K.L.y],
      tree: [K.tree.cx, K.tree.cy],
      stars: { pts: Lf.stars.pts.map(([x, y]) => [x, y]), R: Lf.stars.R },
      band: bandPans(K, Lf.band),
      fire: fireSpot(Lf, K),
      spots: {
        falls: K.falls.map((f) => panAt(K, f.x)),
        up: panAt(K, K.wh.mill.up.x),
        fire: panAt(K, Lf.toast.x),
        tree: panAt(K, K.tree.cx),
      },
      css: layers.map((l) => l.css),
      paints: layers
        .filter((l) => l.paint)
        .map((l) => ({ name: l.paint, r: l.r, top: l.top, w: l.cv.width, h: l.cv.height })),
    });
    // Let the flock form before the first frame is shown.
    for (let i = 0; i < 90; i++) {
      updateLife(Lf, K, 1 / 30, () => null, [], toLayer);
      updateDepth(Lf, K, 1 / 30, () => null, []);
    }
    // A world held still for reduced motion shows everyone at once instead.
    if (m.first && !reduce) stagger(Lf, K);
    // A letter owed today sends for the trader, after the arrival has set the trader's crossings.
    if (Lf.mail.st === "due") bringMail(Lf, K);
    if (m.first) nova = null;
    render(0);
    Lf.sfx.length = 0;
    if (raining) Lf.sfx.push(["rain", 0, 0]);
  }

  function theme(night) {
    P = palette(night, Lf.season.name, Lf.season.turn);
    setLight(K, P.night);
    paintGate(K, P, K.U * Math.min(dpr, 1.25));
  }

  // Paints the static layers for a theme, or copies them from bitmaps the paint worker already painted.
  function paint(night, pre) {
    theme(night);
    let i = 0;
    for (const l of layers) {
      l.c.setTransform(1, 0, 0, 1, 0, 0);
      l.c.clearRect(0, 0, l.cv.width, l.cv.height);
      if (pre && l.paint) {
        const b = pre[i++];
        l.c.drawImage(b, 0, 0);
        b.close();
      } else {
        l.c.setTransform(l.r * K.U, 0, 0, l.r * K.U, l.r * PAD, l.r * (PAD - l.top));
        if (l.paint) PAINTERS[l.paint](l.c, K, P);
      }
      // Cleared, so a half-rate layer must draw on the next frame.
      l.hits = null;
    }
    shaped = false;
  }

  function render(dt) {
    for (const p of pulses) {
      p.age += dt;
      p.r = p.age * 560;
    }
    pulses = pulses.filter((p) => p.age < PULSE_LIFE);
    updateSparks(dt);
    Lf.hover = shown;
    updateWind(Lf, K, dt);
    updateLife(Lf, K, dt, ptr, pulses, toLayer);
    updateDepth(Lf, K, dt, ptr, pulses);
    updateWhimsy(Lf, K, dt, pulses);
    updateCritters(Lf, K, dt, ptr, pulses, P.night);
    updateCall(Lf, K, dt, toLayer);
    updateDesk(Lf, dt);
    updateSeason(Lf.season, K, dt, Lf.sfx, Lf.wind);
    updateWeather(Lf, K, dt);
    updatePile(Lf, K, dt, ptr);
    updatePlay(Lf, K, dt);
    updateSapling(Lf, dt);
    updateToast(Lf, dt);
    updateKite(Lf, K, dt);
    updateMail(Lf, K, dt, skyToIsle);
    updateSeeds(Lf, K, dt, ptr(D_ISLE));
    updateTrain(Lf, K, dt);
    if (Lf.seeds.landed.length) send({ type: "seeds", u: Lf.seeds.landed.splice(0) });
    updateStars(Lf, K, dt, ptr);
    if (!reduce) updateRare(Lf, K, dt, pulses);
    if (festWant && !dozing && !Lf.doze) {
      festWant = false;
      startFestival(Lf, K);
    }
    updateFestival(Lf, K, dt);
    if (novaWant && !Lf.fest) {
      novaWant = false;
      nova = { t: 0, sent: false };
      Lf.sfx.push(["nova", K.L.x, SWELL]);
    }
    // Gone: the page takes it from here.
    if (nova && (nova.t += dt) >= SWELL && !nova.sent) {
      nova.sent = true;
      send({ type: "nova" });
    }
    if (Lf.desk.o > 0 && !shot) copyWorld();
    shot = Lf.desk.o > 0;
    const rings = pulses.map((p) => ({ ...toLayer(D_FRONT, p.px, p.py), r: p.r, age: p.age, life: PULSE_LIFE }));
    Lf.hits.length = 0;
    for (const l of layers) {
      if (!l.draw) continue;
      // A skipped layer keeps last frame's pixels, so it keeps last frame's hover targets too.
      if (l.half && Lf.lite && l.half === (frameNo & 1 ? "odd" : "even") && l.hits) {
        Lf.hits.push(...l.hits);
        continue;
      }
      const h0 = Lf.hits.length;
      l.c.setTransform(1, 0, 0, 1, 0, 0);
      l.c.clearRect(0, 0, l.cv.width, l.cv.height);
      l.c.setTransform(l.r * K.U, 0, 0, l.r * K.U, l.r * PAD, l.r * (PAD - l.top));
      l.draw(l.c, Lf, K, P, Lf.t, rings);
      l.hits = Lf.hits.slice(h0);
    }
    label();
  }

  // Finds the smallest thing under the pointer, for the field-guide label. A solid thing hides whatever is behind it,
  // however small, and so does the island itself, grass and rock, though it has no label of its own. Nothing further
  // back than `floor` counts. With the keyboard on something, the label names that, whatever is in front of it.
  function label() {
    if (aim) follow();
    shown = aim ? aim.k || null : pointer ? pick(pointer.x, pointer.y) : null;
    near = hearing(Lf, shown, ptr);
    if (glance(Lf, K, shown, ptr(0)) && reduce) stale = true;
  }
  function pick(px, py, floor = -1) {
    let best = null,
      br = Infinity;
    const under = Lf.hits.filter(([, x, y, r, d]) => {
      const [ox, oy] = offset(d);
      return Math.hypot(x * K.U + ox - px, y * K.U + oy - py) < r * K.U;
    });
    const q = toLayer(D_ISLE, px, py),
      I = K.isle,
      rock = q.x > I.x0 && q.x < I.x0 + I.w && q.y > I.topAt(q.x) - 10 * K.s && q.y < I.underAt(q.x);
    const wall = Math.max(floor, rock ? D_ISLE : -1, ...under.filter((h) => h[5]).map((h) => h[4]));
    for (const [k, , , r, d] of under) {
      if (d >= wall && r < br) {
        best = k;
        br = r;
      }
    }
    return best;
  }

  // Exploring from the keyboard. `aim` is the thing the keyboard is on, and where on the page it was last seen. While
  // there is one it stands where the pointer would, so the world answers it as it would a hover.
  let aim = null;
  const STEPS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
  const stand = () => {
    if (aim) pointer = { x: aim.x, y: aim.y };
  };
  // Sent with each label, only while the keyboard is on something.
  const aimed = () => aim && { aim: { x: aim.x, y: aim.y, r: aim.r } };
  // Everything in sight that the label can name, on the page, and how far each is from (x, y). Of the things there are
  // several of, only the nearest counts, except the tree's lanterns, which count once for each of the four groups the
  // far gate's song points at: `group` is which one. After dark the stars to join up count as well, each one on its
  // own: `star` is which one. The real ones go by their own names, and those in the visitor's constellation by its name.
  function sights(x, y) {
    const seen = new Map();
    const see = (id, s) => {
      if (s.x < 0 || s.x > W || s.y < 0 || s.y > H) return;
      s.far = Math.hypot(s.x - x, s.y - y);
      const was = seen.get(id);
      if (!was || s.far < was.far) seen.set(id, s);
    };
    for (const [k, hx, hy, r, d] of Lf.hits) {
      const [ox, oy] = offset(d);
      if (k !== "lanterns") see(k, { k, x: hx * K.U + ox, y: hy * K.U + oy, r: r * K.U, far: 0 });
    }
    const [lx, ly] = offset(D_ISLE);
    for (const l of K.tree.lanterns)
      see(`lanterns${l.group}`, {
        k: "lanterns",
        group: l.group,
        x: l.x * K.U + lx,
        y: l.y * K.U + ly,
        r: 7 * K.s * K.U,
        far: 0,
      });
    if (P.night) {
      const [ox, oy] = offset(0),
        S = Lf.stars,
        mine = S.mine?.pts ?? [];
      S.pts.forEach(([hx, hy, , id], i) => {
        const k = mine.some(([mx, my]) => Math.hypot(mx - hx, my - hy) < 1) ? "mine" : id === undefined ? "" : `*${id}`;
        see(i, { k, star: i, x: hx * K.U + ox, y: hy * K.U + oy, r: S.R * K.U, far: 0 });
      });
    }
    return [...seen.values()];
  }
  const nearest = (all) => all.sort((a, b) => a.far - b.far)[0];
  // The keyboard comes into the world on the lantern maple. Each arrow key moves it to the nearest thing that way, with
  // distance off to the side counted double, so it keeps to the line of the key. Without a direction it lets go, which
  // finishes any stars it was joining up. While it joins them up, the arrow keys go only from star to star, drawing the
  // line on to each one.
  function steer(dir) {
    if (!dir) {
      aim = pointer = null;
      if (Lf.stars.link?.key) starsDone();
      return;
    }
    const step = STEPS[dir];
    if (!step || !aim) {
      const all = sights(W / 2, H / 2);
      aim = all.find((s) => s.k === "tree") ?? nearest(all) ?? null;
      return stand();
    }
    const [ux, uy] = step,
      { k, star, group, x, y } = aim,
      joining = !!Lf.stars.link?.key;
    let score = Infinity;
    for (const s of sights(x, y)) {
      const along = (s.x - x) * ux + (s.y - y) * uy,
        off = Math.abs((s.x - x) * uy - (s.y - y) * ux);
      if ((s.k === k && s.star === star && s.group === group) || (joining && s.star === undefined)) continue;
      if (along < 1 || along + off * 2 >= score) continue;
      score = along + off * 2;
      aim = s;
    }
    if (joining && aim.star !== undefined) {
      const [sx, sy] = Lf.stars.pts[aim.star];
      linkTo(Lf, sx, sy);
    }
    stand();
  }
  // Things move, so the one the keyboard is on is found again each time the world is drawn, nearest where it was. Gone
  // out of sight, the keyboard moves to whatever is nearest instead, so it is always on something.
  function follow() {
    const { k, star, group, x, y } = aim,
      all = sights(x, y);
    aim = all.find((s) => s.k === k && s.star === star && s.group === group) ?? nearest(all) ?? aim;
    stand();
  }

  // The sun swelling, and turning blue as it goes, in the high sky. Its light floods everything nearer, and at the last
  // the whole world goes white.
  function drawNova(c, K) {
    if (!nova) return;
    const u = Math.min(1, nova.t / SWELL),
      R = 40 + 1100 * u ** 2.4;
    c.globalCompositeOperation = "lighter";
    dab(c, sprite(NOVA), K.L.x, K.L.y, R * 1.6, 0.25 + 0.5 * u);
    dab(c, sprite(NOVA_CORE), K.L.x, K.L.y, R * 0.5, 0.3 + 0.7 * u);
    c.globalCompositeOperation = "source-over";
  }
  function drawFlash(c, K) {
    if (!nova) return;
    const u = Math.min(1, nova.t / SWELL),
      a = clamp((u - 0.55) / 0.45, 0, 1) ** 2;
    if (a <= 0) return;
    c.fillStyle = rgba(mixc(NOVA, NOVA_CORE, a), a);
    c.fillRect(-K.EX, -K.EX, K.WU + K.EX * 2, 1000 + K.EX * 2);
  }

  // The shadows of clouds no one can see drift slowly across the island and its tree, each a few soft puffs, drawn
  // small on a layer of their own and cut to the island's shape. The shape is the island's layer, the band of it this
  // one covers, copied down to this one's size, again whenever either changes.
  const shape = makeCanvas();
  let shaped = false;
  function drawShade(c, Lf, K, P, t) {
    const l = layers[LAYERS.findIndex((o) => o.draw === "shade")],
      isle = layers[LAYERS.findIndex((o) => o.paint === "island")];
    const { width: cw, height: ch } = l.cv;
    if (!shaped || shape.width !== cw || shape.height !== ch) {
      const k = isle.r / l.r;
      shape.width = cw;
      shape.height = ch;
      shape.getContext("2d").drawImage(isle.cv, 0, (l.top - isle.top) * isle.r, cw * k, ch * k, 0, 0, cw, ch);
      shaped = true;
    }
    const { s, WU, EX, top } = K,
      span = WU + EX * 2 + 1200 * s,
      puff = sprite(SHADE);
    c.globalAlpha = P.night ? 0.14 : 0.26;
    for (const [v, at, y, w] of CLOUDS) {
      const x = ((t * v * s + at * span) % span) - EX - 600 * s;
      for (const [px, py, k] of CLUMP) {
        const r = w * k * s;
        c.drawImage(puff, x + px * w * s - r, top + (y + py * w) * s - r * 0.4, r * 2, r * 0.8);
      }
    }
    c.globalAlpha = 1;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalCompositeOperation = "destination-in";
    c.drawImage(shape, 0, 0);
    c.globalCompositeOperation = "source-over";
  }

  // Asleep, the light goes down a little, as if the evening were drawing on.
  function drawDusk(c, Lf, K, P) {
    if (Lf.doze <= 0) return;
    c.fillStyle = rgba(P.night ? [0, 6, 16] : [36, 30, 64], 0.2 * Lf.doze);
    c.fillRect(-K.EX, -K.EX, K.WU + K.EX * 2, 1000 + K.EX * 2);
  }

  // The world dozes off after a minute with nothing stirring on the page, once its arrival is long over, and wakes as
  // soon as anything does. Asleep, it runs at a little over half speed, and the page draws it at half rate. Waking, the
  // lanterns light up one after another from left to right.
  let dozing = false;
  function doze(idle, dt) {
    const sleepy = !reduce && idle > DOZE && Lf.t > 80 && !Lf.fest;
    if (sleepy !== dozing) {
      dozing = sleepy;
      // One only just nodding off wakes without a fuss.
      if (!sleepy && Lf.doze > 0.5) {
        const L = K.tree.lanterns,
          x0 = Math.min(...L.map((l) => l.x)),
          x1 = Math.max(...L.map((l) => l.x));
        for (const l of L) l.wake = 0.1 + ((l.x - x0) / (x1 - x0 || 1)) * 1.1;
        Lf.sfx.push(["wake", K.tree.cx]);
      }
    }
    Lf.doze = clamp(Lf.doze + (dozing ? dt / FALL_ASLEEP : -dt / WAKE_UP), 0, 1);
    return dt * (1 - 0.45 * Lf.doze);
  }

  // Whatever made a sound since the last frame, where across the world it was, from -1 at the left to 1 at the right,
  // and anything more the sound needs: where a sound that travels ends up, or which note to ring.
  function sounds() {
    const sfx = Lf.sfx.length ? Lf.sfx.map(([name, x, arg]) => [name, panAt(K, x), arg]) : null;
    Lf.sfx.length = 0;
    return sfx;
  }
  // A world held still for reduced motion draws only when something changes, and sends its sounds with the label.
  function redraw() {
    render(0);
    send({ type: "hover", hover: shown, near, sfx: sounds(), ...aimed() });
  }
  // Names whatever is under the pointer, or the keyboard, without moving the world on.
  function look() {
    label();
    if (stale) {
      stale = false;
      render(0);
    }
    send({ type: "hover", hover: shown, near, ...aimed() });
  }

  // When frames run long for a while, drop the costliest decoration, draw the animated layers at a pixel ratio of 1, and
  // redraw the far and front layers at half rate, on alternate frames, so no one frame carries both.
  // It stays on once set: flipping in and out would show more than either mode does. One-off hitches are left out of
  // the average, but a long run of them is a device that cannot keep up at all, so that sets it too.
  // If frames still run long once the average has settled in lite mode, the animated layers drop to a pixel ratio of
  // .7 as well. Firefox on Linux needs this: it draws canvases on the CPU, where the cost follows the pixel count.
  // The average starts over in lite mode, so it measures lite frames only, and settles in about 45 of them: waiting
  // longer kept a slow device on its slowest frames for the first several seconds of every visit. Each step down is
  // sent to the page, which keeps it, so the next visit on that screen starts there (`tier`).
  // `raw` is the time since the last frame drawn here, which is what the device can actually keep up with.
  let frameAvg = 1 / 60,
    slow = 0,
    lite = false,
    lower = false,
    liteAt = 0,
    frameNo = 0;
  function frame(m) {
    const t0 = performance.now();
    ({ mx, my, scroll, pointer } = m);
    stand();
    const { raw } = m;
    // Asleep, frames come slower by choice, which says nothing about the device.
    if (!dozing && !Lf.doze) {
      if (raw < 0.05) frameAvg += (raw - frameAvg) * 0.03;
      slow = raw < 0.05 ? 0 : slow + 1;
    }
    if (!lite && (frameAvg > 1 / 54 || slow > 12)) {
      lite = true;
      liteAt = frameNo;
      frameAvg = 1 / 60;
      for (const l of layers) if (l.draw) fit(l);
      send({ type: "tier", n: 1 });
    } else if (lite && !lower && frameNo - liteAt > 45 && frameAvg > 1 / 45) {
      lower = true;
      for (const l of layers) if (l.draw) fit(l);
      send({ type: "tier", n: 2 });
    }
    Lf.lite = lite;
    Lf.still = m.still;
    frameNo++;
    render(doze(m.idle, Math.min(0.05, raw)));
    const sfx = sounds();
    // A firefly or a star went into the jar: the page keeps the count for next time.
    if (Lf.play.dirty) {
      Lf.play.dirty = false;
      send({ type: "jar", n: Lf.play.jar.n, stars: Lf.play.jar.stars });
    }
    // The far gate opened wide, for the page to record in the field guide.
    if (Lf.call.tell) {
      Lf.call.tell = false;
      send({ type: "gate" });
    }
    // The trader's letter landed, for the page to keep.
    if (Lf.mail.landed) {
      Lf.mail.landed = false;
      send({ type: "mail" });
    }
    // How long the frame took to draw, which the page paces the frames by.
    send({
      type: "frame",
      hover: shown,
      near,
      sfx,
      ms: performance.now() - t0,
      held,
      asleep: dozing,
      hush: Lf.notice > 0.5,
      ...aimed(),
    });
    held = false;
  }

  // A click sends a ring of light through the scene. One on a falling leaf catches it, for the page to press in the
  // field guide, starting from just where and how the leaf was; one on a falling seed sends it spinning back up.
  // Nothing behind either one hears that click, nor one on a shooting star, which catches it and drops it into the
  // firefly jar. Over the cloud sea a click also startles a koi. Knocking on the arch opens it onto the desk, or shuts
  // it again, but not through a letter leaning on it. A click on the door in the sky throws it open and tells the page,
  // which lets the other time of day out through it. The first click on bare turf plants a tree, and the page keeps
  // where; whatever stands far off behind the turf doesn't get in the way. One on the leaf pile sends its leaves
  // flying, and one on a dandelion clock blows its seeds off, and neither plants anything. A click rings a lantern it
  // lands on, catches a firefly, and on the far mountains comes back as an echo. A press on the kite takes hold of its
  // string. After dark, one on a star starts joining up the stars from it. One on the campfire toasts a marshmallow for
  // as long as it is held, even with a dandelion or a firefly in the way, just as the page judges it when it stops the
  // press scrolling. Held anywhere else, it may brew a storm.
  // From the keyboard, joining up the stars starts with a press on a star and goes on after it lets go, for the arrow
  // keys to draw from star to star; the next press finishes it.
  function down({ x, y }) {
    if (Lf.stars.link?.key) return starsDone();
    // A press can land far from where the pointer last was, as a finger does from one tap to the next, so it starts a
    // new sweep through the leaf pile and the dandelion clocks rather than carrying the last one on across the gap.
    if (Lf.pile) Lf.pile.last = null;
    Lf.seeds.last = null;
    const q = toLayer(D_ISLE, x, y),
      on = pick(x, y, D_ISLE),
      sq = toLayer(0, x, y),
      star = P.night ? starAt(Lf, sq.x, sq.y) : -1;
    if (P.night && pick(x, y) === "meteor") {
      catchMeteor(Lf);
      fall(Lf, q.x, q.y);
      Lf.sfx.push(["wish", q.x]);
      if (reduce) return redraw();
      pulses.push({ px: x, py: y, age: 0, r: 0, id: ++pulseId });
      return;
    }
    const [fx, fy, fr] = fireSpot(Lf, K),
      fire = Math.hypot(q.x - fx, q.y - fy) < fr;
    if (star >= 0 || fire) {
      if (star >= 0) {
        linkFrom(Lf, star);
        Lf.stars.link.key = !!aim;
      } else toast(Lf, reduce);
      if (reduce) return redraw();
      pulses.push({ px: x, py: y, age: 0, r: 0, id: ++pulseId });
      press(Lf, q.x, q.y, x, y);
      Lf.play.press[star >= 0 ? "stars" : "toast"] = true;
      return;
    }
    const bit = catchBit(Lf.season, K, q.x, q.y, reduce);
    if (bit) {
      if (Lf.season.name === "autumn") {
        const [ox, oy] = offset(D_ISLE);
        send({
          type: "leaf",
          x: bit.x * K.U + ox,
          y: bit.y * K.U + oy,
          r: bit.size * 1.2 * K.U,
          rot: Math.atan2(Math.sin(bit.ph), Math.cos(bit.ph)),
          flip: leafFlip(bit),
          c: Math.floor(bit.col * LEAVES.length),
          fill: leafColour(bit, P),
        });
      } else Lf.sfx.push(["whirl", bit.x]);
      if (reduce) return redraw();
      pulses.push({ px: x, py: y, age: 0, r: 0, id: ++pulseId });
      return;
    }
    if (on !== "mail" && onArch(K, q.x, q.y)) {
      knock(Lf);
      Lf.sfx.push(["knock", q.x]);
      if (reduce) Lf.desk.o = +Lf.desk.on;
    }
    // The same reach as the door's field-guide label, so a click lands wherever hovering names it.
    const Dr = K.wh.door,
      f = toLayer(D_FAR, x, y);
    if (Dr && Math.hypot(f.x - Dr.x, f.y - (Dr.y - Dr.h / 2)) < Dr.h * 0.9) {
      Lf.wh.door.hold = 6;
      const [ox, oy] = offset(D_FAR);
      send({ type: "door", x: Dr.x * K.U + ox, y: (Dr.y - Dr.h / 2) * K.U + oy });
    }
    const pile = poke(Lf, K, q.x, q.y, reduce),
      blown = !pile && blowAt(Lf, K, q.x, q.y, reduce);
    if (!pile && !blown && [null, "meadow", "bells", "tree"].includes(on) && plantAt(Lf, K, q.x, q.y)) {
      send({ type: "plant", u: Lf.sapling.u });
      if (reduce) Lf.sapling.k = 1;
    }
    // The page rings the click's note itself, from where it landed on the page, so the echo is placed the same way. It
    // asks what was clicked without the floor that planting asks with, which leaves out everything behind the island,
    // the mountains included.
    const far = pick(x, y);
    if (far === "peaks" || far === "hills") Lf.sfx.push(["echo", x / K.U]);
    if (far === "train") ring(Lf, K);
    // A world held still shows what the click changed straight away, and the page hears what it sounded like.
    if (reduce) return redraw();
    pulses.push({ px: x, py: y, age: 0, r: 0, id: ++pulseId });
    if (q.y > K.HZ - 30) spawnKoi(Lf, K, q.x);
    press(Lf, q.x, q.y, x, y);
    Lf.play.press.kite = grab(Lf, K, q.x, q.y);
    sweep(Lf, K, q.x, q.y, q.x, q.y);
    if (P.night) catchAt(Lf, K, q.x, q.y);
  }

  // A short press that brewed no storm is a click; at New Year, one on the open sky sends up a firework. One on the kite
  // launches it, or loops it if it is flying; a longer one that pulled it about lets it go. Letting go of a marshmallow
  // eats it.
  function up() {
    if (Lf.toast.on) {
      eat(Lf, reduce);
      release(Lf);
      return reduce ? redraw() : undefined;
    }
    if (Lf.stars.link) {
      if (Lf.stars.link.key) return void release(Lf);
      return starsDone();
    }
    const pr = release(Lf);
    if (pr?.kite) return letGo(Lf, K, pr.moved < 10 && Lf.t - pr.t < 0.45);
    if (!pr || pr.storm || Lf.t - pr.t > 0.45 || K.occasion !== "newyear") return;
    const b = toLayer(D_BACK, pr.px, pr.py);
    if (b.y > K.HZ - 80) return;
    if (launch(Lf.season, K, b.x, b.y)) Lf.sfx.push(["launch", b.x]);
  }

  // Done joining up the stars. Two lines or more make the visitor's constellation, for the page to name and keep.
  function starsDone() {
    const mine = linkDone(Lf, K);
    if (mine) send({ type: "stars", ...mine });
    release(Lf);
    if (!reduce) return;
    Lf.stars.flash = 0;
    redraw();
  }

  // The page was out of sight for a while, and something changed while nobody was looking: the kite got away into the
  // tree, a sheep fell asleep on the swing, or a snail went exploring. One thing after a short while away, two after a
  // long one.
  function away(secs) {
    let n = secs > 120 ? 2 : 1;
    for (const f of shuffle([() => snag(Lf, K), () => napOnSwing(Lf), () => wander(Lf, K)])) if (n > 0 && f()) n--;
    if (reduce) redraw();
  }

  // Laying out and painting are one-off work that a frame handed over meanwhile waits behind, so that frame says it was
  // held up, and the page does not take its wait for what frames cost.
  let held = false;
  return (m) => {
    switch (m.type) {
      case "size":
        held = true;
        return rebuild(m);
      // Painting clears every layer, and a world held still for reduced motion draws no next frame, so draw one now.
      case "paint":
        held = true;
        paint(P.night, m.bitmaps);
        return render(0);
      case "theme":
        held = true;
        paint(m.night, m.bitmaps);
        return render(0);
      case "frame":
        return frame(m);
      // Names whatever is under the pointer without moving the world on, for a tap or a world held still.
      case "look":
        ({ mx, my, scroll, pointer } = m);
        stand();
        return look();
      // The keyboard moved in the world, or left it, which names what it is on straight away. A world held still shows
      // a line it drew on to the next star, and hears the star ring.
      case "aim":
        steer(m.dir);
        return reduce && Lf.stars.link?.key ? redraw() : look();
      case "down":
        return down(m);
      case "drag": {
        if (Lf.stars.link) {
          const s = toLayer(0, m.x, m.y);
          linkTo(Lf, s.x, s.y);
          return reduce ? redraw() : undefined;
        }
        const q = toLayer(D_ISLE, m.x, m.y);
        pull(Lf, q.x, q.y);
        return drag(Lf, K, q.x, q.y);
      }
      case "up":
        return up();
      case "burst":
        return burst(m.x, m.y);
      // Finishing the guide calls the serpent up straight away.
      case "serpent":
        if (Lf.serpent.tau < 0) Lf.serpent.wait = 1;
        return;
      // The lantern festival, for finishing the guide.
      case "festival":
        festWant = !reduce;
        return;
      case "flash": {
        Lf.treeFlash = 1;
        if (reduce) return;
        const [ox, oy] = offset(D_ISLE),
          crown = toLayer(D_BACK, K.tree.cx * K.U + ox, K.tree.cy * K.U + oy);
        return overture(Lf, K, [crown.x, crown.y]);
      }
      case "snap":
        return snap();
      case "away":
        return away(m.secs);
      // The world gone out of sight, so the shy rock can be somewhere else when it is back.
      case "unseen":
        hop(Lf);
        return reduce ? render(0) : undefined;
      // Time for the world to start over, every 22 minutes on the page.
      case "nova":
        novaWant = !reduce && !nova;
        return;
      // The weather where the visitor is, which the page asks the site for once it has started the world.
      case "weather":
        if (!Lf) return;
        Lf.weather = makeWeather(Lf, K, m.w);
        return reduce ? render(0) : undefined;
      // How many of the band have joined, which grows with the guide.
      case "band":
        joined = Lf.band.n = m.n;
        return reduce ? redraw() : undefined;
    }
  };
}
