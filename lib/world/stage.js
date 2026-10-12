// Wires the world to the page: canvases, parallax, theme, the animation clock, field-guide labels and pointer input.
// The drawing itself is render.js, which runs in a worker where the browser allows, so this side only has to slide the
// finished layers about and answer the pointer. mountWorld takes the hero's elements and returns a function that tears
// everything down again, so the world can come and go with client-side navigation.

import { PAL, clamp } from './core';
import { GUIDE, GUIDE_ORDER, D_ISLE } from './life';
import { LAYERS, makeRenderer, shift } from './render';
import { makeSeam } from './seam';
import { setThemeStage, subscribeToTheme } from '../theme';

// How long, in ms, the pointer has to stay on something before its label shows.
const LINGER = 160;

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

  // `geo` is where the renderer last laid the world out: the scale, the layers' sizes and a few landmarks the page
  // needs. Nothing is drawn or measured on this side until it arrives.
  let geo = null, P, W = 0, H = 0, mx = 0, my = 0, tmx = 0, tmy = 0, pointer = null, lastMove = 0, touchTimer = 0;
  let raf = 0, last = 0, sent = 0, busy = false, visible = true, shown = null, woken = false, aim = null, aimAt = 0;

  const offset = d => shift(d, mx, my, scrollY, H);
  const isLight = () => (root.dataset.theme ? root.dataset.theme === 'light' : lightMq.matches);
  const palette = () => (isLight() ? PAL.dusk : PAL.night);

  // One canvas per layer. Where the browser can hand canvases to a worker, the renderer runs there and draws into
  // them; otherwise, or if the worker fails to start, it runs on this thread with the same messages. A canvas once
  // handed over cannot be drawn from here, so falling back starts again on fresh canvases. They join the page once the
  // renderer has said where they go, so none ever shows at the wrong size first.
  let cvs = [], worker = null, post = null;
  function start(off) {
    for (const cv of cvs) cv.remove();
    cvs = LAYERS.map(() => document.createElement('canvas'));
    geo = null;
    busy = false;
    if (off && typeof OffscreenCanvas !== 'undefined' && 'transferControlToOffscreen' in HTMLCanvasElement.prototype) {
      try {
        const w = new Worker(new URL('./render.worker.js', import.meta.url), { type: 'module' });
        const handed = cvs.map(cv => cv.transferControlToOffscreen());
        w.onmessage = ({ data }) => receive(data);
        w.onerror = e => {
          e.preventDefault();
          w.terminate();
          if (worker !== w || signal.aborted) return;
          start(false);
          rebuild(!woken);
          sync();
        };
        w.postMessage({ canvases: handed, reduce }, handed);
        worker = w;
        post = (m, transfer = []) => w.postMessage(m, transfer);
        return;
      } catch {
        return start(false);
      }
    }
    worker = null;
    const run = makeRenderer(cvs, reduce, receive);
    post = m => run(m);
  }

  function receive(m) {
    if (m.type === 'layout') return onLayout(m);
    show(m.hover, m.type === 'frame');
    if (m.type === 'frame') busy = false;
  }

  // One seam where the world spills into the page, and one where the page settles back into cloud at the bottom.
  const seams = [makeSeam(el.seamTop, 140), makeSeam(el.seamLow, 70, true)];
  const seamsOn = () => seams.some(s => s.on);
  const drawSeams = (dt, t, all) => {
    for (const s of seams) if (all || s.on) s.draw(dt, P, t);
  };

  // The theme not on screen is painted ahead of time in the paint worker. `spare` resolves to its bitmaps, or to null
  // when they were superseded or the worker is unavailable; then a switch paints in place instead.
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
    if (!painter || !geo) return Promise.resolve(null);
    const id = ++job;
    painter.postMessage({ id, W, H, night, layers: geo.paints });
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
  const fits = (d, night) => !!d && !!geo && d.night === night && d.bitmaps[0].width === geo.paints[0].w && d.bitmaps[0].height === geo.paints[0].h;
  const release = d => {
    if (d) for (const b of d.bitmaps) b.close();
  };

  // Asks the renderer to lay the world out for the hero's size. Any paint in place supersedes a first paint still on its
  // way from the paint worker. On first load the paint worker paints the world while the arrival still covers it.
  function rebuild(first) {
    W = hero.clientWidth;
    H = hero.clientHeight;
    if (!W || !H) return;
    if (!first) gen++;
    P = palette();
    post({ type: 'size', W, H, dpr: devicePixelRatio || 1, night: P.night, first, wait: first && !!painter });
  }

  function onLayout(m) {
    geo = m;
    cvs.forEach((cv, i) => {
      const { w, h, top } = m.css[i];
      cv.style.width = w + 'px';
      cv.style.height = h + 'px';
      cv.style.top = top + 'px';
      if (!cv.isConnected) sceneEl.appendChild(cv);
    });
    place();
    renderGuide();
    if (m.first) {
      if (painter) {
        const g = gen;
        request(P.night).then(d => {
          if (signal.aborted) return release(d);
          if (g !== gen) release(d);
          else if (fits(d, P.night)) post({ type: 'paint', bitmaps: d.bitmaps }, d.bitmaps);
          else {
            release(d);
            post({ type: 'paint', bitmaps: null });
          }
          awake();
        });
      } else awake();
    }
    prepare();
    for (const s of seams) s.resize();
    drawSeams(0, 0, true);
    sync();
  }

  // Slides each layer by its parallax.
  function place() {
    cvs.forEach((cv, i) => {
      const [ox, oy] = offset(LAYERS[i].d);
      cv.style.transform = `translate3d(${ox.toFixed(1)}px,${oy.toFixed(1)}px,0)`;
    });
  }

  // The page's frame clock. It eases the parallax and slides the layers every frame, and hands the renderer its next
  // frame only once it has finished the last, so a slow device drops frames instead of falling behind.
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(.05, (now - last) / 1000 || 0);
    last = now;
    drawSeams(dt, now / 1000);
    if (!visible) return void (sent = now);
    mx += (tmx - mx) * Math.min(1, dt * 3);
    my += (tmy - my) * Math.min(1, dt * 3);
    place();
    if (busy) return;
    busy = true;
    post({ type: 'frame', raw: (now - sent) / 1000, mx, my, scroll: scrollY, pointer, still: pointer ? (now - lastMove) / 1000 : 0 });
    sent = now;
  }
  function sync() {
    const want = (visible || seamsOn()) && !document.hidden && !reduce && !!geo && !signal.aborted;
    if (want && !raf) {
      last = sent = performance.now();
      raf = requestAnimationFrame(frame);
    } else if (!want && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  // Has the renderer name whatever is under the pointer now, without waiting for a frame.
  const look = () => geo && post({ type: 'look', mx, my, scroll: scrollY, pointer });

  // Field-guide label for whatever the renderer found under the pointer. While the world moves, a new label waits until
  // the pointer has stayed on its thing for a moment, so sweeping across the scene on the way to a link names nothing.
  // A tap, or a world held still, names it straight away.
  function show(best, linger) {
    if (linger) {
      const now = performance.now();
      if (best !== aim) {
        aim = best;
        aimAt = now;
      }
      if (best && best !== shown && now - aimAt < LINGER) best = null;
    }
    if (best !== shown) {
      shown = best;
      if (best) {
        const [latin, common, line] = GUIDE[best], fresh = record(best);
        if (fresh && pointer) post({ type: 'burst', x: pointer.x, y: pointer.y });
        tag.innerHTML = `<i>${latin}</i><b>${common}</b><span>${line}</span>` + (fresh ? `<em>New field guide entry · ${tally().replace(/ /g, '')}</em>` : '');
      }
      tag.classList.toggle('on', !!best);
    }
    if (best && pointer) {
      const tw = tag.offsetWidth, th = tag.offsetHeight;
      const x = clamp(pointer.x + 18, 8, W - tw - 8), y = pointer.y + 22 + th > H - 8 ? pointer.y - th - 14 : pointer.y + 22;
      tag.style.transform = `translate(${x}px,${y}px)`;
    }
  }

  function localPoint(e) {
    const b = hero.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  }
  hero.addEventListener('pointermove', e => {
    pointer = localPoint(e);
    lastMove = performance.now();
    if (reduce) return look();
    tmx = (pointer.x / W) * 2 - 1;
    tmy = (pointer.y / H) * 2 - 1;
  }, { signal });
  hero.addEventListener('pointerleave', () => {
    pointer = null;
    tmx = tmy = 0;
    if (reduce) look();
  }, { signal });
  // A click sends a ring of light through the scene, and knocks on the arch if it lands there.
  hero.addEventListener('pointerdown', e => {
    if (!geo || e.target.closest('a, button, [data-guide]')) return;
    const p = localPoint(e);
    // Touch has no hover, so a tap also names whatever is under the finger for a moment.
    if (e.pointerType !== 'mouse') {
      pointer = p;
      lastMove = performance.now();
      look();
      clearTimeout(touchTimer);
      timers.delete(touchTimer);
      touchTimer = later(() => {
        pointer = null;
        look();
      }, 2600);
    }
    post({ type: 'down', x: p.x, y: p.y });
  }, { signal });

  // Field guide: every creature and place the visitor has hovered, kept in this browser only.
  const { guideBtn, guide: guideEl, guideList, guideCount, guideFoot } = el;
  let found = new Set();
  try {
    found = new Set((JSON.parse(localStorage.getItem('field-guide')) || []).filter(k => GUIDE[k]));
  } catch {}
  // A phone shows fewer landmarks, so its guide lists only what it can show.
  const guideOrder = () => (geo && geo.phone ? GUIDE_ORDER.filter(g => !g[2]) : GUIDE_ORDER);
  const foundCount = () => guideOrder().filter(([k]) => found.has(k)).length;
  // The desk behind the arch and the barbell in the stars are not on the list. Finding them puts the count past the total.
  const extras = () => ['desk', 'lifter'].filter(k => found.has(k));
  const tally = () => `${foundCount() + extras().length} / ${guideOrder().length}`;
  function renderGuide() {
    const order = guideOrder(), n = foundCount();
    guideCount.textContent = tally();
    guideList.innerHTML = order.map(([k, hint], i) => {
      const n = String(i + 1).padStart(2, '0');
      return found.has(k)
        ? `<li class="got"><span class="n">${n}</span><span><i>${GUIDE[k][0]}</i><b>${GUIDE[k][1]}</b></span></li>`
        : `<li><span class="n">${n}</span><span><b>Unrecorded</b><small>${hint}</small></span></li>`;
    }).join('') + extras().map((k, i) => `<li class="got extra"><span class="n">${order.length + i + 1}</span><span><i>${GUIDE[k][0]}</i><b>${GUIDE[k][1]}</b><small>Not on the list</small></span></li>`).join('');
    const done = n === order.length, more = extras().length;
    guideFoot.textContent = !done
      ? 'Hover anything in the scene to record it.'
      : more
        ? `All ${n} found, plus ${more === 1 ? 'one that was' : 'two that were'} never on the list. Thanks for looking so closely.`
        : `All ${n} found. That is everything out here, as far as anyone knows. Thanks for looking so closely.`;
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
    if (foundCount() === guideOrder().length) post({ type: 'serpent' });
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

  // A theme switch waits for the paint worker's bitmaps of the other theme, then hands them to the renderer when the
  // theme changes. The world keeps moving while it waits, so the wait never freezes. With the world out of view, the
  // switch spreads from the control instead of from the sun or moon.
  const unstage = setThemeStage({
    prepare: async () => {
      const ready = spare && (await spare);
      release(held);
      held = ready;
    },
    origin: () => {
      if (!geo) return null;
      const [ox, oy] = offset(0), b = hero.getBoundingClientRect(), x = b.left + geo.L[0] * geo.U + ox, y = b.top + geo.L[1] * geo.U + oy;
      return y > 0 && y < innerHeight ? { x, y } : null;
    },
  });
  function onTheme() {
    const ready = held;
    held = null;
    if (!geo || P.night === !isLight()) return release(ready);
    const ok = fits(ready, !isLight());
    if (!ok) release(ready);
    gen++;
    P = palette();
    post({ type: 'theme', night: P.night, bitmaps: ok ? ready.bitmaps : null }, ok ? ready.bitmaps : []);
    prepare();
    drawSeams(0, last / 1000, true);
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
    }, 120);
  });
  resizeObs.observe(hero);
  observers.push(heroIo, seamIo, resizeObs);

  // Arrival: the dark parts from the lantern tree, which flares as it wakes the world. It waits for the first paint.
  const wakeEl = el.wake;
  function awake() {
    if (woken) return;
    woken = true;
    if (reduce || !geo) return (wakeEl.hidden = true);
    const [ox, oy] = offset(D_ISLE);
    wakeEl.style.setProperty('--wx', `${geo.tree[0] * geo.U + ox}px`);
    wakeEl.style.setProperty('--wy', `${geo.tree[1] * geo.U + oy}px`);
    wakeEl.addEventListener('animationend', () => (wakeEl.hidden = true), { signal });
    wakeEl.classList.add('go');
    later(() => post({ type: 'flash' }), 250);
  }
  start(true);
  rebuild(true);
  if (!W || !H) awake();

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
    if (worker) worker.terminate();
    for (const cv of cvs) cv.remove();
  };
}
