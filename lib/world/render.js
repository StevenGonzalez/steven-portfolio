// Draws the world: every canvas layer, everything that moves, and the hit tests behind the field-guide labels. Where the
// browser can hand canvases to a worker, this runs in render.worker.js, so the page's main thread only slides the
// finished layers about; otherwise stage.js runs it on the page. Either way it hears from stage.js only through the
// function makeRenderer returns, and answers only through `send`.

import { PAD, TAU, dab, makeCanvas, panAt, sprite } from './core';
import { layout, setLight, paintGate } from './scene';
import { D_BACK, D_ISLE, D_FRONT, makeLife, updateLife, drawIsle, drawFront, drawBack, spawnKoi } from './life';
import { D_FAR, makeDepth, updateDepth, drawFar, drawHigh, drawNearLife } from './depth';
import { woodBand } from './land';
import { makeWhimsy, updateWhimsy, drawSwing, drawBubbles, drawStar } from './whimsy';
import { makeCall, updateCall, drawCall } from './story';
import { makeCritters, updateCritters, drawCritters, drawUnderside } from './critters';
import { stagger } from './arrival';
import { makeDesk, onArch, knock, updateDesk, drawDesk } from './desk';
import { PAINTERS } from './painters';
import { makeSeason, palette, updateSeason, drawSeasonIsle, drawSeasonFront, drawSeasonBack, drawSnowCaps, launch } from './season';
import { makePlay, updatePlay, drawPlay, drawPlayFront, press, drag, release, sweep, catchAt } from './play';

const PULSE_LIFE = 1.8;

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
    c.restore();
    c.save();
    c.translate((fx - bx) / K.U, (fy - by) / K.U);
    drawFar(c, ...a);
    c.restore();
    drawBack(c, ...a);
    drawSeasonBack(c, a[0].season, a[1], a[2], a[3]);
  }
  const DRAW = {
    back: drawFarAndBack,
    isle: (c, Lf, K, P, t) => {
      drawUnderside(c, Lf, K, P, t);
      drawDesk(c, Lf, K, P, t);
      drawIsle(c, Lf, K, P, t);
      drawSnowCaps(c, Lf.season, K, P);
      drawCritters(c, Lf, K, P, t);
      drawSwing(c, Lf, K, P);
      drawCall(c, Lf, K, P, t);
      drawSeasonIsle(c, Lf.season, K, P);
      drawPlay(c, Lf, K, P, t);
    },
    front: (...a) => { drawFront(...a); drawNearLife(...a); drawBubbles(...a); drawSeasonFront(a[0], a[1].season, a[2], a[3]); drawSparks(...a); drawPlayFront(...a); },
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
    send({ type: 'snap', img: cv.transferToImageBitmap ? cv.transferToImageBitmap() : cv });
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
    // A storm raining when the world is laid out again is gone, so its rain has to stop.
    const raining = Lf?.play.storm?.sent > 0;
    K = layout(W, H, m.grown, m.occasion);
    Lf = makeLife(K);
    Lf.depth = makeDepth(K);
    Lf.call = makeCall(K);
    Lf.wh = makeWhimsy(K);
    Lf.critters = makeCritters(K, m.night);
    Lf.desk = makeDesk();
    Lf.desk.view = screen;
    Lf.season = makeSeason(K, m.season);
    Lf.play = makePlay(K, m.jar);
    for (const l of layers) fit(l);
    if (m.wait) theme(m.night);
    else paint(m.night);
    send({
      type: 'layout', first: m.first, U: K.U, phone: K.phone, L: [K.L.x, K.L.y], tree: [K.tree.cx, K.tree.cy],
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
    render(0);
    Lf.sfx.length = 0;
    if (raining) Lf.sfx.push(['rain', 0, 0]);
  }

  function theme(night) {
    P = palette(night, Lf.season.name);
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
    updateLife(Lf, K, dt, ptr, pulses, toLayer);
    updateDepth(Lf, K, dt, ptr, pulses);
    updateWhimsy(Lf, K, dt, pulses);
    updateCritters(Lf, K, dt, ptr, pulses, P.night);
    updateCall(Lf, K, dt, toLayer);
    updateDesk(Lf, dt);
    updateSeason(Lf.season, K, dt, Lf.sfx);
    updatePlay(Lf, K, dt);
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
  // however small.
  function label() {
    shown = pointer ? pick(pointer.x, pointer.y) : null;
  }
  function pick(px, py) {
    let best = null, br = Infinity;
    const under = Lf.hits.filter(([, x, y, r, d]) => {
      const [ox, oy] = offset(d);
      return Math.hypot(x * K.U + ox - px, y * K.U + oy - py) < r * K.U;
    });
    const wall = Math.max(-1, ...under.filter(h => h[5]).map(h => h[4]));
    for (const [k, , , r, d] of under) {
      if (d >= wall && r < br) {
        best = k;
        br = r;
      }
    }
    return best;
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
    if (raw < .05) frameAvg += (raw - frameAvg) * .03;
    slow = raw < .05 ? 0 : slow + 1;
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
    render(Math.min(.05, raw));
    // Whatever made a sound this frame, where across the world it was, from -1 at the left to 1 at the right, and
    // anything more the sound needs: where a sound that travels ends up, or which note to ring.
    const sfx = Lf.sfx.length ? Lf.sfx.map(([name, x, arg]) => [name, panAt(K, x), arg]) : null;
    Lf.sfx.length = 0;
    // A firefly went into the jar: the page keeps the count for next time.
    if (Lf.play.dirty) {
      Lf.play.dirty = false;
      send({ type: 'jar', n: Lf.play.jar.n });
    }
    // How long the frame took to draw, which the page paces the frames by.
    send({ type: 'frame', hover: shown, sfx, ms: performance.now() - t0 });
  }

  // A click sends a ring of light through the scene. Over the cloud sea it also startles a koi, unless it was on a sheep
  // grazing there. Knocking on the arch
  // opens it onto the desk, or shuts it again. A click on the door in the sky throws it open and tells the page, which
  // lets the other time of day out through it. A click rings a lantern it lands on, catches a firefly, and on the far
  // mountains comes back as an echo. Held, it may brew a storm.
  function down({ x, y }) {
    const q = toLayer(D_ISLE, x, y);
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
    if (reduce) return;
    pulses.push({ px: x, py: y, age: 0, r: 0, id: ++pulseId });
    const on = pick(x, y);
    if (q.y > K.HZ - 30 && on !== 'sheep') spawnKoi(Lf, K, q.x);
    press(Lf, q.x, q.y, x, y);
    sweep(Lf, K, q.x, q.y, q.x, q.y);
    if (P.night) catchAt(Lf, K, q.x, q.y);
    // The page rings the click's note itself, from where it landed on the page, so the echo is placed the same way.
    if (on === 'peaks' || on === 'hills') Lf.sfx.push(['echo', x / K.U]);
  }

  // A short press that brewed no storm is a click; at New Year, one on the open sky sends up a firework.
  function up() {
    const pr = release(Lf);
    if (!pr || pr.storm || Lf.t - pr.t > .45 || K.occasion !== 'newyear') return;
    const b = toLayer(D_BACK, pr.px, pr.py);
    if (b.y > K.HZ - 80) return;
    if (launch(Lf.season, K, b.x, b.y)) Lf.sfx.push(['launch', b.x]);
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
        return send({ type: 'hover', hover: shown });
      case 'down':
        return down(m);
      case 'drag': {
        const q = toLayer(D_ISLE, m.x, m.y);
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
      case 'flash':
        Lf.treeFlash = 1;
        return;
      case 'snap':
        return snap();
    }
  };
}
