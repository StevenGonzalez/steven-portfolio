// Draws the world: every canvas layer, everything that moves, and the hit tests behind the field-guide labels. Where the
// browser can hand canvases to a worker, this runs in render.worker.js, so the page's main thread only slides the
// finished layers about; otherwise stage.js runs it on the page. Either way it hears from stage.js only through the
// function makeRenderer returns, and answers only through `send`, listing beside an answer anything a worker should hand
// over rather than copy.

import { PAD, TAU, clamp, dab, makeCanvas, mixc, panAt, rgba, sprite } from './core';
import { layout, setLight, paintGate } from './scene';
import { D_BACK, D_ISLE, D_FRONT, makeLife, updateLife, drawIsle, drawFront, drawBack, spawnKoi } from './life';
import { D_FAR, makeDepth, updateDepth, drawFar, drawHigh, drawNearLife } from './depth';
import { woodBand } from './land';
import { makeWhimsy, updateWhimsy, drawSwing, drawBubbles, drawStar } from './whimsy';
import { makeCall, updateCall, drawCall } from './story';
import { makeCritters, updateCritters, drawCritters, drawUnderside, napOnSwing, wander } from './critters';
import { stagger } from './arrival';
import { makeDesk, onArch, knock, updateDesk, drawDesk } from './desk';
import { PAINTERS } from './painters';
import { LEAVES, makeSeason, palette, catchBit, leafColour, leafFlip, updateSeason, drawSeasonIsle, drawSeasonFront, drawSeasonBack, drawSnowCaps, launch } from './season';
import { makePlay, updatePlay, drawPlay, drawPlayFront, press, drag, release, sweep, catchAt } from './play';
import { makeSapling, plantAt, updateSapling, drawSapling } from './sapling';
import { makeKite, grab, pull, letGo, snag, updateKite, drawKite } from './kite';
import { makeRare, updateRare, drawRareBack, drawRareHigh } from './rare';
import { startFestival, updateFestival, drawFestival } from './festival';
import { makeStars, starAt, linkFrom, linkTo, linkDone, updateStars, drawStars } from './stars';
import { makeBand, bandPans, hearing, drawBand, drawMoonCamp } from './band';
import { makeToast, fireSpot, toast, eat, updateToast, drawToast } from './toast';
import { makeQuantum, glance, hop, drawQuantum } from './quantum';
import { makeWind, updateWind, drawWind } from './wind';
import { makePile, poke, updatePile, drawPile } from './pile';

const PULSE_LIFE = 1.8;
// How long, in seconds, nothing has to move before the world dozes off, and how long it takes to fall asleep and to
// wake up again.
const DOZE = 60, FALL_ASLEEP = 8, WAKE_UP = 2.5;
// How long the sun takes to swell before the world starts over, in seconds.
const SWELL = 14;
const NOVA = [150, 200, 255], NOVA_CORE = [236, 244, 255];

// Back to front, one canvas each. Static layers are painted once; animated layers, named by `draw`, are redrawn every
// frame. A layer that only paints a band of the scene (top and bottom in scene units) gets a canvas just that tall, so
// there is less to composite.
export const LAYERS = [
  { d: 0, res: .6, paint: 'sky' },
  { d: D_FAR, res: .5, paint: 'far' },
  { d: D_BACK, res: .5, paint: 'ridge', band: K => woodBand(K.land.ridge) },
  { d: D_BACK, res: .8, draw: 'back', half: 'odd' },
  { d: .3, res: .5, paint: 'mid', band: K => [K.HZ - 280, 1000 + K.EX] },
  { d: .4, res: .5, paint: 'flanks', band: K => woodBand(...K.land.flanks) },
  { d: D_ISLE, res: 1, paint: 'island' },
  { d: D_ISLE, res: 1, draw: 'isle' },
  { d: .65, res: .45, paint: 'front' },
  { d: D_FRONT, res: 1, half: 'even', draw: 'front' },
  { d: 1, res: .3, paint: 'fg' },
];

// How far a layer at depth d is shifted on the page: nearer layers slide further with the pointer, and lag less behind
// the page as it scrolls. `mx` and `my` are the eased pointer, -1 to 1 across the hero.
export const shift = (d, mx, my, scroll, H) => [-mx * d * 28, -my * d * 14 + Math.min(scroll, H) * (1 - d) * .3];

export function makeRenderer(canvases, reduce, send) {
  let K, P, Lf, W = 0, H = 0, dpr = 1, mx = 0, my = 0, scroll = 0, pointer = null, pulses = [], pulseId = 0, shown = null, shot = false;
  // How many of the band have joined, which outlasts a new layout, and the players at the fire under the pointer.
  let joined = 0, near = null;
  // The sun swelling blue, which the page starts the world over from; one asked for during the festival waits for it
  // to end. `stale` is a world held still that needs drawing again.
  let nova = null, novaWant = false, stale = false;

  const offset = d => shift(d, mx, my, scroll, H);
  function toLayer(d, px, py) {
    const [ox, oy] = offset(d);
    return { x: (px - ox) / K.U, y: (py - oy) / K.U };
  }
  const ptr = d => (pointer ? toLayer(d, pointer.x, pointer.y) : null);

  // Far life and the high sky share the back canvas to save layers, each shifted every frame so it stays registered
  // with its own layer.
  function drawFarAndBack(c, ...a) {
    const [fx, fy] = offset(D_FAR), [bx, by] = offset(D_BACK), [sx, sy] = offset(0);
    c.save();
    c.translate((sx - bx) / K.U, (sy - by) / K.U);
    drawHigh(c, ...a);
    drawMoonCamp(c, ...a);
    drawRareHigh(c, ...a);
    drawQuantum(c, ...a);
    drawStars(c, ...a);
    drawNova(c, a[1]);
    c.restore();
    c.save();
    c.translate((fx - bx) / K.U, (fy - by) / K.U);
    drawFar(c, ...a);
    drawBand(c, ...a);
    c.restore();
    drawBack(c, ...a);
    drawRareBack(c, ...a);
    drawSeasonBack(c, a[0].season, a[1], a[2], a[3]);
  }
  const DRAW = {
    back: drawFarAndBack,
    isle: (c, Lf, K, P, t) => {
      drawUnderside(c, Lf, K, P, t);
      drawDesk(c, Lf, K, P, t);
      drawWind(c, Lf, K, P, t);
      drawPile(c, Lf, K, P);
      drawIsle(c, Lf, K, P, t);
      drawSapling(c, Lf, K, P, t);
      drawToast(c, Lf, K, P, t);
      drawSnowCaps(c, Lf.season, K, P);
      drawCritters(c, Lf, K, P, t);
      drawSwing(c, Lf, K, P);
      drawCall(c, Lf, K, P, t);
      drawSeasonIsle(c, Lf.season, K, P);
      drawPlay(c, Lf, K, P, t);
      drawFestival(c, Lf, K, P);
      drawKite(c, Lf, K, P);
    },
    front: (...a) => { drawFront(...a); drawNearLife(...a); drawBubbles(...a); drawSeasonFront(a[0], a[1].season, a[2], a[3]); drawSparks(...a); drawPlayFront(...a); drawDusk(...a); drawFlash(a[0], a[2]); },
  };
  const layers = LAYERS.map((l, i) => ({ ...l, cv: canvases[i], c: canvases[i].getContext('2d'), draw: l.draw && DRAW[l.draw] }));

  // The monitor on the desk behind the arch shows this world, copied small from the layers once as the arch opens and
  // cropped to fill. Copying every frame cost too much for a picture this size.
  const screen = makeCanvas(), sc = screen.getContext('2d');
  screen.width = 160;
  screen.height = 100;
  function copyWorld() {
    const k = Math.max(screen.width / W, screen.height / H), dx = (screen.width - W * k) / 2, dy = (screen.height - H * k) / 2;
    for (const l of layers) {
      const [ox, oy] = offset(l.d);
      sc.drawImage(l.cv, dx + (ox - PAD) * k, dy + (l.top - PAD + oy) * k, (W + PAD * 2) * k, (l.cv.height / l.r) * k);
    }
  }

  // A still of the world as it looks right now, for a postcard: every layer flattened, at up to 2000 pixels wide.
  function snap() {
    const s = Math.min(2, 2000 / W), cv = makeCanvas(), c = cv.getContext('2d');
    cv.width = Math.round(W * s);
    cv.height = Math.round(H * s);
    for (const l of layers) {
      const [ox, oy] = offset(l.d);
      c.drawImage(l.cv, (ox - PAD) * s, (l.top - PAD + oy) * s, (W + PAD * 2) * s, (l.cv.height / l.r) * s);
    }
    const img = cv.transferToImageBitmap ? cv.transferToImageBitmap() : cv;
    send({ type: 'snap', img }, [img]);
  }

  // A new field-guide entry throws a little burst of sparks from the pointer. Sparks live in hero pixels.
  let sparks = [];
  function burst(sx, sy) {
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * TAU, v = 50 + Math.random() * 120;
      sparks.push({ sx, sy, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 30, age: 0, life: .9 + Math.random() * .9, r: 1.5 + Math.random() * 2.5, star: i % 3 === 0 });
    }
  }
  function updateSparks(dt) {
    const drag = Math.pow(.05, dt);
    for (const p of sparks) {
      p.age += dt;
      p.vx *= drag;
      p.vy = p.vy * drag - 26 * dt;
      p.sx += p.vx * dt;
      p.sy += p.vy * dt;
    }
    sparks = sparks.filter(p => p.age < p.life);
  }
  function drawSparks(c, Lf, K, P) {
    if (!sparks.length) return;
    const gs = sprite(P.glow), U = K.U;
    c.globalCompositeOperation = 'lighter';
    for (const p of sparks) {
      const { x, y } = toLayer(D_FRONT, p.sx, p.sy), k = 1 - p.age / p.life, tw = .75 + .25 * Math.sin(p.age * 30 + p.r * 9);
      dab(c, gs, x, y, p.r * 5 / U, (P.night ? .5 : .28) * k);
      if (p.star) drawStar(c, x, y, p.r * 3.2 * tw / U, [255, 250, 235], k);
      else dab(c, sprite([255, 250, 235]), x, y, p.r * 1.4 / U, k);
    }
    c.globalCompositeOperation = 'source-over';
  }

  // Sizes a layer's canvas to its band. Animated layers are redrawn in full every frame, so their pixel ratio is kept
  // lower than the painted layers', drops to 1 once frames run long, and to .7 if that is still not enough. `css` is
  // the size and place the page gives it.
  function fit(l) {
    l.r = l.res * Math.min(dpr, l.draw ? (lite ? 1 : 1.25) : 1.75) * (l.draw && lower ? .7 : 1);
    const [y0, y1] = l.band ? l.band(K) : [-K.EX, 1000 + K.EX], bottom = Math.min(H + PAD * 2, Math.ceil(y1 * K.U + PAD));
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
    K = layout(W, H, m.grown, m.occasion);
    Lf = makeLife(K);
    Lf.depth = makeDepth(K);
    Lf.call = makeCall(K);
    Lf.wh = makeWhimsy(K);
    Lf.critters = makeCritters(K, m.night);
    Lf.desk = makeDesk();
    Lf.desk.view = screen;
    Lf.season = makeSeason(K, m.season, m.turn);
    Lf.play = makePlay(K, m.jar);
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
    for (const l of layers) fit(l);
    if (m.wait) theme(m.night);
    else paint(m.night);
    send({
      type: 'layout', first: m.first, U: K.U, phone: K.phone, L: [K.L.x, K.L.y], tree: [K.tree.cx, K.tree.cy],
      stars: { pts: Lf.stars.pts.map(([x, y]) => [x, y]), R: Lf.stars.R }, band: bandPans(K, Lf.band), fire: fireSpot(Lf, K),
      spots: { falls: K.falls.map(f => panAt(K, f.x)), up: panAt(K, K.wh.mill.up.x), fire: panAt(K, Lf.toast.x), tree: panAt(K, K.tree.cx) },
      css: layers.map(l => l.css),
      paints: layers.filter(l => l.paint).map(l => ({ name: l.paint, r: l.r, top: l.top, w: l.cv.width, h: l.cv.height })),
    });
    // Let the flock form before the first frame is shown.
    for (let i = 0; i < 90; i++) {
      updateLife(Lf, K, 1 / 30, () => null, [], toLayer);
      updateDepth(Lf, K, 1 / 30, () => null, []);
    }
    // A world held still for reduced motion shows everyone at once instead.
    if (m.first && !reduce) stagger(Lf, K);
    if (m.first) nova = null;
    render(0);
    Lf.sfx.length = 0;
    if (raining) Lf.sfx.push(['rain', 0, 0]);
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
  }

  function render(dt) {
    for (const p of pulses) {
      p.age += dt;
      p.r = p.age * 560;
    }
    pulses = pulses.filter(p => p.age < PULSE_LIFE);
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
    updatePile(Lf, K, dt, ptr);
    updatePlay(Lf, K, dt);
    updateSapling(Lf, dt);
    updateToast(Lf, dt);
    updateKite(Lf, K, dt);
    updateStars(Lf, K, dt, ptr);
    if (!reduce) updateRare(Lf, K, dt, pulses);
    // A festival asked for while the world dozes waits for it to wake.
    if (Lf.festWant && !dozing && !Lf.doze) {
      Lf.festWant = false;
      startFestival(Lf, K);
    }
    updateFestival(Lf, K, dt);
    if (novaWant && !Lf.fest) {
      novaWant = false;
      nova = { t: 0, sent: false };
      Lf.sfx.push(['nova', K.L.x, SWELL]);
    }
    // Gone: the page takes it from here.
    if (nova && (nova.t += dt) >= SWELL && !nova.sent) {
      nova.sent = true;
      send({ type: 'nova' });
    }
    if (Lf.desk.o > 0 && !shot) copyWorld();
    shot = Lf.desk.o > 0;
    const rings = pulses.map(p => ({ ...toLayer(D_FRONT, p.px, p.py), r: p.r, age: p.age, life: PULSE_LIFE }));
    Lf.hits.length = 0;
    for (const l of layers) {
      if (!l.draw) continue;
      // A skipped layer keeps last frame's pixels, so it keeps last frame's hover targets too.
      if (l.half && Lf.lite && l.half === (frameNo & 1 ? 'odd' : 'even') && l.hits) {
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
  // back than `floor` counts.
  function label() {
    shown = pointer ? pick(pointer.x, pointer.y) : null;
    near = hearing(Lf, shown, ptr);
    if (glance(Lf, K, shown, ptr(0)) && reduce) stale = true;
  }
  function pick(px, py, floor = -1) {
    let best = null, br = Infinity;
    const under = Lf.hits.filter(([, x, y, r, d]) => {
      const [ox, oy] = offset(d);
      return Math.hypot(x * K.U + ox - px, y * K.U + oy - py) < r * K.U;
    });
    const q = toLayer(D_ISLE, px, py), I = K.isle, rock = q.x > I.x0 && q.x < I.x0 + I.w && q.y > I.topAt(q.x) - 10 * K.s && q.y < I.underAt(q.x);
    const wall = Math.max(floor, rock ? D_ISLE : -1, ...under.filter(h => h[5]).map(h => h[4]));
    for (const [k, , , r, d] of under) {
      if (d >= wall && r < br) {
        best = k;
        br = r;
      }
    }
    return best;
  }

  // The sun swelling, and turning blue as it goes, in the high sky. Its light floods everything nearer, and at the last
  // the whole world goes white.
  function drawNova(c, K) {
    if (!nova) return;
    const u = Math.min(1, nova.t / SWELL), R = 40 + 1100 * u ** 2.4;
    c.globalCompositeOperation = 'lighter';
    dab(c, sprite(NOVA), K.L.x, K.L.y, R * 1.6, .25 + .5 * u);
    dab(c, sprite(NOVA_CORE), K.L.x, K.L.y, R * .5, .3 + .7 * u);
    c.globalCompositeOperation = 'source-over';
  }
  function drawFlash(c, K) {
    if (!nova) return;
    const u = Math.min(1, nova.t / SWELL), a = clamp((u - .55) / .45, 0, 1) ** 2;
    if (a <= 0) return;
    c.fillStyle = rgba(mixc(NOVA, NOVA_CORE, a), a);
    c.fillRect(-K.EX, -K.EX, K.WU + K.EX * 2, 1000 + K.EX * 2);
  }

  // Asleep, the light goes down a little, as if the evening were drawing on.
  function drawDusk(c, Lf, K, P) {
    if (Lf.doze <= 0) return;
    c.fillStyle = rgba(P.night ? [0, 6, 16] : [36, 30, 64], .2 * Lf.doze);
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
      if (!sleepy && Lf.doze > .5) {
        const L = K.tree.lanterns, x0 = Math.min(...L.map(l => l.x)), x1 = Math.max(...L.map(l => l.x));
        for (const l of L) l.wake = .1 + ((l.x - x0) / (x1 - x0 || 1)) * 1.1;
        Lf.sfx.push(['wake', K.tree.cx]);
      }
    }
    Lf.dozing = dozing;
    Lf.doze = clamp(Lf.doze + (dozing ? dt / FALL_ASLEEP : -dt / WAKE_UP), 0, 1);
    return dt * (1 - .45 * Lf.doze);
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
    send({ type: 'hover', hover: shown, near, sfx: sounds() });
  }

  // When frames run long for a while, drop the costliest decoration, draw the animated layers at a pixel ratio of 1, and
  // redraw the far and front layers at half rate, on alternate frames, so no one frame carries both.
  // It stays on once set: flipping in and out would show more than either mode does. One-off hitches are left out of
  // the average, but a long run of them is a device that cannot keep up at all, so that sets it too.
  // If frames still run long once the average has settled in lite mode, the animated layers drop to a pixel ratio of
  // .7 as well. Firefox on Linux needs this: it draws canvases on the CPU, where the cost follows the pixel count.
  // `raw` is the time since the last frame drawn here, which is what the device can actually keep up with.
  let frameAvg = 1 / 60, slow = 0, lite = false, lower = false, liteAt = 0, frameNo = 0;
  function frame(m) {
    const t0 = performance.now();
    ({ mx, my, scroll, pointer } = m);
    const { raw } = m;
    // Asleep, frames come slower by choice, which says nothing about the device.
    if (!dozing && !Lf.doze) {
      if (raw < .05) frameAvg += (raw - frameAvg) * .03;
      slow = raw < .05 ? 0 : slow + 1;
    }
    if (!lite && (frameAvg > 1 / 54 || slow > 12)) {
      lite = true;
      liteAt = frameNo;
      for (const l of layers) if (l.draw) fit(l);
    } else if (lite && !lower && frameNo - liteAt > 150 && frameAvg > 1 / 45) {
      lower = true;
      for (const l of layers) if (l.draw) fit(l);
    }
    Lf.lite = lite;
    Lf.still = m.still;
    frameNo++;
    render(doze(m.idle, Math.min(.05, raw)));
    const sfx = sounds();
    // A firefly went into the jar: the page keeps the count for next time.
    if (Lf.play.dirty) {
      Lf.play.dirty = false;
      send({ type: 'jar', n: Lf.play.jar.n });
    }
    // How long the frame took to draw, which the page paces the frames by.
    send({ type: 'frame', hover: shown, near, sfx, ms: performance.now() - t0, asleep: dozing });
  }

  // A click sends a ring of light through the scene. One on a falling leaf catches it, for the page to press in the
  // field guide, starting from just where and how the leaf was; one on a falling seed sends it spinning back up. Nothing
  // behind either one hears that click. Over the cloud sea a click also startles a koi. Knocking on the arch opens it
  // onto the desk, or shuts it again. A click on the door in the sky throws it open and tells the page, which lets the
  // other time of day out through it. The first click on bare turf plants a tree, and the page keeps where;
  // whatever stands far off behind the turf doesn't get in the way. One on the leaf pile sends its leaves flying, and
  // plants nothing. A click rings a lantern it lands on, catches a firefly, and on the far mountains comes back as an
  // echo. A press on the kite takes hold of its string. After dark, one on a star starts joining up the stars from it.
  // One on the campfire toasts a marshmallow for as long as it is held, even with a dandelion or a firefly in the way,
  // just as the page judges it when it stops the press scrolling. Held anywhere else, it may brew a storm.
  function down({ x, y }) {
    const q = toLayer(D_ISLE, x, y), on = pick(x, y, D_ISLE), sq = toLayer(0, x, y), star = P.night ? starAt(Lf, sq.x, sq.y) : -1;
    const [fx, fy, fr] = fireSpot(Lf, K), fire = Math.hypot(q.x - fx, q.y - fy) < fr;
    if (star >= 0 || fire) {
      if (star >= 0) linkFrom(Lf, star);
      else toast(Lf, reduce);
      if (reduce) return redraw();
      pulses.push({ px: x, py: y, age: 0, r: 0, id: ++pulseId });
      press(Lf, q.x, q.y, x, y);
      Lf.play.press[star >= 0 ? 'stars' : 'toast'] = true;
      return;
    }
    const bit = catchBit(Lf.season, K, q.x, q.y, reduce);
    if (bit) {
      if (Lf.season.name === 'autumn') {
        const [ox, oy] = offset(D_ISLE);
        send({
          type: 'leaf', x: bit.x * K.U + ox, y: bit.y * K.U + oy, r: bit.size * 1.2 * K.U, rot: Math.atan2(Math.sin(bit.ph), Math.cos(bit.ph)),
          flip: leafFlip(bit), c: Math.floor(bit.col * LEAVES.length), fill: leafColour(bit, P),
        });
      } else Lf.sfx.push(['whirl', bit.x]);
      if (reduce) return redraw();
      pulses.push({ px: x, py: y, age: 0, r: 0, id: ++pulseId });
      return;
    }
    if (onArch(K, q.x, q.y)) {
      knock(Lf);
      Lf.sfx.push(['knock', q.x]);
      if (reduce) {
        Lf.desk.o = +Lf.desk.on;
        render(0);
      }
    }
    // The same reach as the door's field-guide label, so a click lands wherever hovering names it.
    const Dr = K.wh.door, f = toLayer(D_FAR, x, y);
    if (Dr && Math.hypot(f.x - Dr.x, f.y - (Dr.y - Dr.h / 2)) < Dr.h * .9) {
      Lf.wh.door.hold = 6;
      const [ox, oy] = offset(D_FAR);
      send({ type: 'door', x: Dr.x * K.U + ox, y: (Dr.y - Dr.h / 2) * K.U + oy });
    }
    const pile = poke(Lf, K, q.x, q.y, reduce);
    if (!pile && [null, 'meadow', 'bells', 'tree'].includes(on) && plantAt(Lf, K, q.x, q.y)) {
      send({ type: 'plant', u: Lf.sapling.u });
      if (reduce) {
        Lf.sapling.k = 1;
        render(0);
      }
    }
    if (reduce) return pile ? redraw() : undefined;
    pulses.push({ px: x, py: y, age: 0, r: 0, id: ++pulseId });
    if (q.y > K.HZ - 30) spawnKoi(Lf, K, q.x);
    press(Lf, q.x, q.y, x, y);
    Lf.play.press.kite = grab(Lf, K, q.x, q.y);
    sweep(Lf, K, q.x, q.y, q.x, q.y);
    if (P.night) catchAt(Lf, K, q.x, q.y);
    // The page rings the click's note itself, from where it landed on the page, so the echo is placed the same way. It
    // asks what was clicked without the floor that planting asks with, which leaves out everything behind the island,
    // the mountains included.
    const far = pick(x, y);
    if (far === 'peaks' || far === 'hills') Lf.sfx.push(['echo', x / K.U]);
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
      const mine = linkDone(Lf, K);
      if (mine) send({ type: 'stars', ...mine });
      release(Lf);
      if (!reduce) return;
      Lf.stars.flash = 0;
      return redraw();
    }
    const pr = release(Lf);
    if (pr?.kite) return letGo(Lf, K, pr.moved < 10 && Lf.t - pr.t < .45);
    if (!pr || pr.storm || Lf.t - pr.t > .45 || K.occasion !== 'newyear') return;
    const b = toLayer(D_BACK, pr.px, pr.py);
    if (b.y > K.HZ - 80) return;
    if (launch(Lf.season, K, b.x, b.y)) Lf.sfx.push(['launch', b.x]);
  }

  // The page was out of sight for a while, and something changed while nobody was looking: the kite got away into the
  // tree, a sheep fell asleep on the swing, or a snail went exploring. One thing after a short while away, two after a
  // long one.
  function away(secs) {
    let n = secs > 120 ? 2 : 1;
    for (const f of [() => snag(Lf, K), () => napOnSwing(Lf), () => wander(Lf, K)].sort(() => Math.random() - .5)) if (n > 0 && f()) n--;
    if (reduce) render(0);
  }

  return m => {
    switch (m.type) {
      case 'size':
        return rebuild(m);
      // Painting clears every layer, and a world held still for reduced motion draws no next frame, so draw one now.
      case 'paint':
        paint(P.night, m.bitmaps);
        return render(0);
      case 'theme':
        paint(m.night, m.bitmaps);
        return render(0);
      case 'frame':
        return frame(m);
      // Names whatever is under the pointer without moving the world on, for a tap or a world held still.
      case 'look':
        ({ mx, my, scroll, pointer } = m);
        label();
        if (stale) {
          stale = false;
          render(0);
        }
        return send({ type: 'hover', hover: shown, near });
      case 'down':
        return down(m);
      case 'drag': {
        if (Lf.stars.link) {
          const s = toLayer(0, m.x, m.y);
          linkTo(Lf, s.x, s.y);
          return reduce ? redraw() : undefined;
        }
        const q = toLayer(D_ISLE, m.x, m.y);
        pull(Lf, q.x, q.y);
        return drag(Lf, K, q.x, q.y);
      }
      case 'up':
        return up();
      case 'burst':
        return burst(m.x, m.y);
      // Finishing the guide calls the serpent up straight away.
      case 'serpent':
        if (Lf.serpent.tau < 0) Lf.serpent.wait = 1;
        return;
      // The lantern festival, for finishing the guide.
      case 'festival':
        if (!reduce) Lf.festWant = true;
        return;
      case 'flash':
        Lf.treeFlash = 1;
        return;
      case 'snap':
        return snap();
      case 'away':
        return away(m.secs);
      // The world gone out of sight, so the shy rock can be somewhere else when it is back.
      case 'unseen':
        hop(Lf);
        return reduce ? render(0) : undefined;
      // Time for the world to start over, every 22 minutes on the page.
      case 'nova':
        novaWant = !reduce && !nova;
        return;
      // How many of the band have joined, which grows with the guide.
      case 'band':
        joined = Lf.band.n = m.n;
        return reduce ? redraw() : undefined;
    }
  };
}
