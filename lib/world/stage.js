// Wires the world to the page: canvases, parallax, theme, the animation loop, field-guide labels and pulses.
// mountWorld takes the hero's elements and returns a function that tears everything down again, so the world can come
// and go with client-side navigation.

import { PAD, PAL, TAU, clamp, dab, sprite } from './core';
import { layout, setLight, paintGate } from './scene';
import { GUIDE, GUIDE_ORDER, D_BACK, D_ISLE, D_FRONT, makeLife, updateLife, drawIsle, drawFront, drawBack, spawnKoi } from './life';
import { D_FAR, makeDepth, updateDepth, drawFar, drawHigh, drawNearLife } from './depth';
import { woodBand } from './land';
import { makeWhimsy, updateWhimsy, drawSwing, drawBubbles, drawStar } from './whimsy';
import { makeCall, updateCall, drawCall } from './story';
import { makeCritters, updateCritters, drawCritters } from './critters';
import { makeSeam } from './seam';
import { stagger } from './arrival';
import { PAINTERS } from './painters';
import { setThemeStage, subscribeToTheme } from '../theme';

const PULSE_LIFE = 1.8;

export function mountWorld(el) {
  const root = document.documentElement, { hero, scene: sceneEl, tag } = el;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const lightMq = matchMedia('(prefers-color-scheme: light)');
  // Every listener goes through this signal, so teardown is one abort.
  const life = new AbortController(), { signal } = life, observers = [], timers = new Set();
  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      fn();
    }, ms);
    timers.add(id);
    return id;
  };

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
  }

  // Back to front. Static layers are painted once; animated layers are redrawn every frame. A layer that only paints a
  // band of the scene (top and bottom in scene units) gets a canvas just that tall, so there is less to composite.
  const LAYERS = [
    { d: 0, res: .6, paint: 'sky' },
    { d: D_FAR, res: .5, paint: 'far' },
    { d: D_BACK, res: .5, paint: 'ridge', band: K => woodBand(K.land.ridge) },
    { d: D_BACK, res: .8, draw: drawFarAndBack, half: true },
    { d: .3, res: .5, paint: 'mid', band: K => [K.HZ - 280, 1000 + K.EX] },
    { d: .4, res: .5, paint: 'flanks', band: K => woodBand(...K.land.flanks) },
    { d: D_ISLE, res: 1, paint: 'island' },
    { d: D_ISLE, res: 1, draw: (...a) => { drawIsle(...a); drawCritters(...a); drawSwing(...a); drawCall(...a); } },
    { d: .65, res: .45, paint: 'front' },
    { d: D_FRONT, res: 1, draw: (...a) => { drawFront(...a); drawNearLife(...a); drawBubbles(...a); drawSparks(...a); } },
    { d: 1, res: .3, paint: 'fg' },
  ];
  for (const l of LAYERS) {
    l.cv = document.createElement('canvas');
    l.c = l.cv.getContext('2d');
    sceneEl.appendChild(l.cv);
  }

  // One seam where the world spills into the page, and one where the page settles back into cloud at the bottom.
  const seams = [makeSeam(el.seamTop, 140), makeSeam(el.seamLow, 70, true)];
  const seamsOn = () => seams.some(s => s.on);
  const drawSeams = (dt, t, all) => {
    for (const s of seams) if (all || s.on) s.draw(dt, P, t);
  };

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

  let lastMove = 0, touchTimer = 0, K, P, Lf, W = 0, H = 0, mx = 0, my = 0, tmx = 0, tmy = 0, pointer = null, pulses = [], pulseId = 0, raf = 0, last = 0, visible = true, shown = null;

  // Nearer layers slide further with the pointer, and lag less behind the page as it scrolls.
  function offset(d) {
    return [-mx * d * 28, -my * d * 14 + Math.min(scrollY, H) * (1 - d) * .3];
  }
  function toLayer(d, px, py) {
    const [ox, oy] = offset(d);
    return { x: (px - ox) / K.U, y: (py - oy) / K.U };
  }
  const ptr = d => (pointer ? toLayer(d, pointer.x, pointer.y) : null);

  const isLight = () => (root.dataset.theme ? root.dataset.theme === 'light' : lightMq.matches);

  // The theme not on screen is painted ahead of time in the worker. `spare` resolves to its bitmaps, or to null when
  // they were superseded or the worker is unavailable; then a switch paints in place instead.
  const waiting = new Map();
  let painter = null, job = 0, spareId = 0, spare = null, gen = 0, held = null;
  try {
    painter = new Worker(new URL('./paint.worker.js', import.meta.url), { type: 'module' });
    painter.onmessage = ({ data }) => {
      const done = waiting.get(data.id);
      waiting.delete(data.id);
      if (done) return done(data);
      for (const b of data.bitmaps) b.close();
    };
    painter.onerror = e => {
      e.preventDefault();
      painter = null;
      for (const done of waiting.values()) done(null);
      waiting.clear();
    };
  } catch {
    painter = null;
  }
  function request(night) {
    if (!painter || !K) return Promise.resolve(null);
    const id = ++job, layers = LAYERS.filter(l => l.paint).map(l => ({ name: l.paint, r: l.r, top: l.top, w: l.cv.width, h: l.cv.height }));
    painter.postMessage({ id, W, H, night, layers });
    return new Promise(done => waiting.set(id, done));
  }
  function prepare() {
    const old = waiting.get(spareId);
    if (old) {
      waiting.delete(spareId);
      old(null);
    }
    spare = request(!P.night);
    spareId = job;
  }
  // Bitmaps painted before a resize no longer fit, and are left for a paint in place.
  const fits = (d, night) => !!d && d.night === night && d.bitmaps[0].width === LAYERS[0].cv.width && d.bitmaps[0].height === LAYERS[0].cv.height;
  const release = d => {
    if (d) for (const b of d.bitmaps) b.close();
  };

  // On first load the worker paints the world while the arrival still covers it, so loading never blocks the page.
  function rebuild(first) {
    W = hero.clientWidth;
    H = hero.clientHeight;
    if (!W || !H) return;
    K = layout(W, H);
    Lf = makeLife(K);
    Lf.depth = makeDepth(K);
    Lf.call = makeCall(K);
    Lf.wh = makeWhimsy(K);
    Lf.critters = makeCritters(K);
    renderGuide();
    const dpr = devicePixelRatio || 1;
    for (const l of LAYERS) {
      l.r = l.res * Math.min(dpr, l.draw ? 1.25 : 1.75);
      const [y0, y1] = l.band ? l.band(K) : [-K.EX, 1000 + K.EX], bottom = Math.min(H + PAD * 2, Math.ceil(y1 * K.U + PAD));
      l.top = Math.max(0, Math.floor(y0 * K.U + PAD));
      l.cv.width = Math.round((W + PAD * 2) * l.r);
      l.cv.height = Math.round((bottom - l.top) * l.r);
      l.cv.style.width = W + PAD * 2 + 'px';
      l.cv.style.height = bottom - l.top + 'px';
      l.cv.style.top = l.top - PAD + 'px';
    }
    if (first && painter) {
      const g = gen;
      theme();
      request(P.night).then(d => {
        if (signal.aborted) return release(d);
        if (g === gen) paint(fits(d, P.night) ? d.bitmaps : null);
        else release(d);
        awake();
      });
    } else paint();
    prepare();
    for (const s of seams) s.resize();
    drawSeams(0, 0, true);
    // Let the flock form before the first frame is shown.
    for (let i = 0; i < 90; i++) {
      updateLife(Lf, K, 1 / 30, () => null, [], toLayer);
      updateDepth(Lf, K, 1 / 30, () => null, []);
    }
    // A world held still for reduced motion shows everyone at once instead.
    if (first && !reduce) stagger(Lf, K);
    render(0);
  }

  function theme() {
    P = isLight() ? PAL.dusk : PAL.night;
    setLight(K, P.night);
    paintGate(K, P, K.U * Math.min(devicePixelRatio || 1, 1.25));
  }

  // Paints the static layers for the current theme, or copies them from bitmaps the worker already painted.
  // Any paint supersedes a first paint still on its way from the worker.
  function paint(pre) {
    gen++;
    theme();
    let i = 0;
    for (const l of LAYERS) {
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
    mx += (tmx - mx) * Math.min(1, dt * 3);
    my += (tmy - my) * Math.min(1, dt * 3);
    for (const l of LAYERS) {
      const [ox, oy] = offset(l.d);
      l.cv.style.transform = `translate3d(${ox.toFixed(1)}px,${oy.toFixed(1)}px,0)`;
    }
    for (const p of pulses) {
      p.age += dt;
      p.r = p.age * 560;
    }
    pulses = pulses.filter(p => p.age < PULSE_LIFE);
    updateSparks(dt);
    Lf.still = pointer ? (performance.now() - lastMove) / 1000 : 0;
    Lf.hover = shown;
    updateLife(Lf, K, dt, ptr, pulses, toLayer);
    updateDepth(Lf, K, dt, ptr, pulses);
    updateWhimsy(Lf, K, dt, ptr, pulses);
    updateCritters(Lf, K, dt, ptr);
    updateCall(Lf, K, dt, toLayer);
    const rings = pulses.map(p => ({ ...toLayer(D_FRONT, p.px, p.py), r: p.r, age: p.age, life: PULSE_LIFE }));
    Lf.hits.length = 0;
    for (const l of LAYERS) {
      if (!l.draw) continue;
      // A skipped layer keeps last frame's pixels, so it keeps last frame's hover targets too.
      if (l.half && Lf.lite && frameNo & 1 && l.hits) {
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

  // Field-guide label for the smallest thing under the pointer. A solid thing hides whatever is behind it, however small.
  function label() {
    let best = null, br = Infinity;
    if (pointer) {
      const under = Lf.hits.filter(([, x, y, r, d]) => {
        const [ox, oy] = offset(d);
        return Math.hypot(x * K.U + ox - pointer.x, y * K.U + oy - pointer.y) < r * K.U;
      });
      const wall = Math.max(-1, ...under.filter(h => h[5]).map(h => h[4]));
      for (const [k, , , r, d] of under) {
        if (d >= wall && r < br) {
          best = k;
          br = r;
        }
      }
    }
    if (best !== shown) {
      shown = best;
      if (best) {
        const [latin, common, line] = GUIDE[best], fresh = record(best);
        if (fresh) burst(pointer.x, pointer.y);
        tag.innerHTML = `<i>${latin}</i><b>${common}</b><span>${line}</span>` + (fresh ? `<em>New field guide entry · ${foundCount()}/${guideOrder().length}</em>` : '');
      }
      tag.classList.toggle('on', !!best);
    }
    if (best) {
      const tw = tag.offsetWidth, th = tag.offsetHeight;
      const x = clamp(pointer.x + 18, 8, W - tw - 8), y = pointer.y + 22 + th > H - 8 ? pointer.y - th - 14 : pointer.y + 22;
      tag.style.transform = `translate(${x}px,${y}px)`;
    }
  }

  // When frames run long for a while, drop the costliest decoration and redraw the slow far layer at half rate.
  // It stays on once set: flipping in and out would show more than either mode does. One-off hitches are ignored.
  let frameAvg = 1 / 60, lite = false, frameNo = 0, drawMs = 0;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const raw = (now - last) / 1000 || 0, dt = Math.min(.05, raw);
    last = now;
    if (raw < .05) frameAvg += (raw - frameAvg) * .03;
    if (frameAvg > 1 / 54) lite = true;
    Lf.lite = lite;
    frameNo++;
    drawSeams(dt, now / 1000);
    if (!visible) return;
    const t0 = performance.now();
    render(dt);
    drawMs += (performance.now() - t0 - drawMs) * (drawMs ? .05 : 1);
  }
  function sync() {
    const want = (visible || seamsOn()) && !document.hidden && !reduce && !!K && !signal.aborted;
    if (want && !raf) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    } else if (!want && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  function localPoint(e) {
    const b = hero.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  }
  hero.addEventListener('pointermove', e => {
    pointer = localPoint(e);
    lastMove = performance.now();
    if (reduce) return label();
    tmx = (pointer.x / W) * 2 - 1;
    tmy = (pointer.y / H) * 2 - 1;
  }, { signal });
  hero.addEventListener('pointerleave', () => {
    pointer = null;
    tmx = tmy = 0;
    if (reduce) label();
  }, { signal });
  // A click sends a ring of light through the scene. Over the cloud sea it also startles a koi.
  hero.addEventListener('pointerdown', e => {
    if (!K || e.target.closest('a, button, [data-guide]')) return;
    const p = localPoint(e);
    // Touch has no hover, so a tap also names whatever is under the finger for a moment.
    if (e.pointerType !== 'mouse') {
      pointer = p;
      lastMove = performance.now();
      label();
      clearTimeout(touchTimer);
      timers.delete(touchTimer);
      touchTimer = later(() => {
        pointer = null;
        label();
      }, 2600);
    }
    if (reduce) return;
    pulses.push({ px: p.x, py: p.y, age: 0, r: 0, id: ++pulseId });
    const q = toLayer(D_ISLE, p.x, p.y);
    if (q.y > K.HZ - 30) spawnKoi(Lf, K, q.x);
  }, { signal });

  // Field guide: every creature and place the visitor has hovered, kept in this browser only.
  const { guideBtn, guide: guideEl, guideList, guideCount, guideFoot } = el;
  let found = new Set();
  try {
    found = new Set((JSON.parse(localStorage.getItem('field-guide')) || []).filter(k => GUIDE[k]));
  } catch {}
  // A phone shows fewer landmarks, so its guide lists only what it can show.
  const guideOrder = () => (K && K.phone ? GUIDE_ORDER.filter(g => !g[2]) : GUIDE_ORDER);
  const foundCount = () => guideOrder().filter(([k]) => found.has(k)).length;
  function renderGuide() {
    const order = guideOrder(), n = foundCount();
    guideCount.textContent = `${n} / ${order.length}`;
    guideList.innerHTML = order.map(([k, hint], i) => {
      const n = String(i + 1).padStart(2, '0');
      return found.has(k)
        ? `<li class="got"><span class="n">${n}</span><span><i>${GUIDE[k][0]}</i><b>${GUIDE[k][1]}</b></span></li>`
        : `<li><span class="n">${n}</span><span><b>Unrecorded</b><small>${hint}</small></span></li>`;
    }).join('');
    const done = n === order.length;
    guideFoot.textContent = done ? `All ${n} found. That is everything out here, as far as anyone knows. Thanks for looking so closely.` : 'Hover anything in the scene to record it.';
    guideBtn.classList.toggle('done', done);
  }
  function record(k) {
    if (found.has(k)) return false;
    found.add(k);
    try {
      localStorage.setItem('field-guide', JSON.stringify([...found]));
    } catch {}
    renderGuide();
    guideBtn.classList.remove('new');
    void guideBtn.offsetWidth;
    guideBtn.classList.add('new');
    // Finishing the guide calls the serpent up straight away.
    if (foundCount() === guideOrder().length && Lf.serpent.tau < 0) Lf.serpent.wait = 1;
    return true;
  }
  function openGuide(open) {
    guideEl.hidden = !open;
    guideBtn.setAttribute('aria-expanded', String(open));
  }
  guideBtn.addEventListener('click', () => openGuide(guideEl.hidden), { signal });
  document.addEventListener('pointerdown', e => {
    if (!guideEl.hidden && !e.target.closest('[data-guide]')) openGuide(false);
  }, { signal });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !guideEl.hidden) {
      openGuide(false);
      guideBtn.focus();
    }
  }, { signal });
  renderGuide();

  function retheme(pre) {
    if (!K) return;
    paint(pre);
    prepare();
    render(0);
    drawSeams(0, last / 1000, true);
  }
  // A theme switch waits for the worker's bitmaps of the other theme, then swaps them in when the theme changes. The
  // world keeps moving while it waits, so the wait never freezes. With the world out of view, the switch spreads from
  // the control instead of from the sun or moon.
  const unstage = setThemeStage({
    prepare: async () => {
      const ready = spare && (await spare);
      release(held);
      held = ready;
    },
    origin: () => {
      if (!K) return null;
      const [ox, oy] = offset(0), b = hero.getBoundingClientRect(), x = b.left + K.L.x * K.U + ox, y = b.top + K.L.y * K.U + oy;
      return y > 0 && y < innerHeight ? { x, y } : null;
    },
  });
  function onTheme() {
    const ready = held;
    held = null;
    if (!K || P.night === !isLight()) return release(ready);
    const ok = fits(ready, !isLight());
    if (!ok) release(ready);
    retheme(ok ? ready.bitmaps : null);
  }
  const unsubscribe = subscribeToTheme(onTheme);
  lightMq.addEventListener('change', () => {
    if (!root.dataset.theme) onTheme();
  }, { signal });

  const heroIo = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    sync();
  });
  heroIo.observe(hero);
  const seamIo = new IntersectionObserver(entries => {
    for (const e of entries) seams.find(s => s.cv === e.target).on = e.isIntersecting;
    sync();
  });
  for (const s of seams) seamIo.observe(s.cv);
  document.addEventListener('visibilitychange', sync, { signal });
  // The page's wanderlights shy away from the pointer too.
  addEventListener('pointermove', e => {
    for (const s of seams) {
      if (!s.on) continue;
      const b = s.cv.getBoundingClientRect();
      s.point(e.clientX - b.left, e.clientY - b.top);
    }
  }, { passive: true, signal });
  document.addEventListener('pointerleave', () => {
    for (const s of seams) s.point(null);
  }, { signal });
  let resizeTimer = 0;
  const resizeObs = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    timers.delete(resizeTimer);
    resizeTimer = later(() => {
      if (hero.clientWidth === W && hero.clientHeight === H) return;
      rebuild();
      sync();
    }, 120);
  });
  resizeObs.observe(hero);
  observers.push(heroIo, seamIo, resizeObs);

  // Arrival: the dark parts from the lantern tree, which flares as it wakes the world. It waits for the first paint.
  const wakeEl = el.wake;
  let woken = false;
  function awake() {
    if (woken) return;
    woken = true;
    if (reduce || !K) return (wakeEl.hidden = true);
    const [ox, oy] = offset(D_ISLE);
    wakeEl.style.setProperty('--wx', `${K.tree.cx * K.U + ox}px`);
    wakeEl.style.setProperty('--wy', `${K.tree.cy * K.U + oy}px`);
    wakeEl.addEventListener('animationend', () => (wakeEl.hidden = true), { signal });
    wakeEl.classList.add('go');
    later(() => (Lf.treeFlash = 1), 250);
  }
  rebuild(true);
  sync();
  if (!painter || !K) awake();

  // The colophon reports what drawing the world actually cost on this device.
  const { frameMs, frameMsNote } = el;
  if (frameMs) {
    if (reduce) {
      frameMs.textContent = '0';
      frameMsNote.textContent = 'Your system asks for reduced motion, so the world is painted once and holds still. Nothing is drawn per frame.';
    } else {
      const msIo = new IntersectionObserver(([e]) => {
        if (e.isIntersecting && drawMs) frameMs.textContent = drawMs.toFixed(1);
      });
      msIo.observe(frameMs);
      observers.push(msIo);
    }
  }

  return () => {
    life.abort();
    for (const o of observers) o.disconnect();
    for (const id of timers) clearTimeout(id);
    cancelAnimationFrame(raf);
    raf = 0;
    unstage();
    unsubscribe();
    for (const done of waiting.values()) done(null);
    waiting.clear();
    release(held);
    held = null;
    if (spare) spare.then(release);
    if (painter) painter.terminate();
    for (const l of LAYERS) l.cv.remove();
  };
}
