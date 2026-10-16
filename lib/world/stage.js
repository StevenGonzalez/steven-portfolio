// Wires the world to the page: canvases, parallax, theme, the animation clock, field-guide labels and pointer input.
// The drawing itself is render.js, which runs in a worker where the browser allows, so this side only has to slide the
// finished layers about and answer the pointer. mountWorld takes the hero's elements and returns a function that tears
// everything down again, so the world can come and go with client-side navigation.

import { PAL, clamp } from './core';
import { GUIDE, GUIDE_ORDER, D_ISLE } from './life';
import { LAYERS, makeRenderer, shift } from './render';
import { makeSeam } from './seam';
import { occasionOf, seasonOf } from './season';
import { setThemeStage, subscribeToTheme, switchTheme } from '../theme';

// How long, in ms, the pointer has to stay on something before its label shows.
const LINGER = 160;

// Added to the stackhouses' field-guide line on a day a new house went up for a returning visitor.
const NEW_HOUSE = 'There’s a new one on top since you were last here! I think they knew you were coming back.';
// Added to the line for the visitor's own tree on a day it grew, and once it is grown.
const TREE_GREW = 'It grew since you were last here! I watered it like I said.';
const TREE_GROWN = 'It’s all grown up now, and it got its own lantern. Mine never did that.';

// Added to field-guide lines while the world is dressed up for an occasion, and the season each one falls in.
const OCCASIONS = {
  halloween: {
    season: 'autumn',
    tree: 'This week all the lanterns are pumpkins. I think it’s dressed up as a pumpkin patch.',
    lanterns: 'They’re pumpkins this week, and they still ring! The song is spookier though.',
    boids: 'Some of them are bats this week. The starlings are pretending not to notice.',
  },
  newyear: {
    season: 'winter',
    tree: 'It stayed up for New Year’s! Click the sky and it sets off fireworks.',
  },
};

// The fireflies caught in the jar, kept in this browser.
function jarCount() {
  try {
    return Number(localStorage.getItem('world-jar')) || 0;
  } catch {
    return 0;
  }
}

// The stackhouses remember visitors: each day someone comes back, one more house goes up on top, up to three. Only
// the count and the last day are kept, in this browser.
function visits() {
  try {
    const today = new Date().toDateString(), v = JSON.parse(localStorage.getItem('world-visits')) || { days: 0 };
    if (v.last !== today) {
      v.days++;
      v.last = today;
      if (v.days > 1 && v.days <= 4) v.grew = today;
      localStorage.setItem('world-visits', JSON.stringify(v));
    }
    return { days: v.days, grown: Math.min(3, v.days - 1), fresh: v.grew === today };
  } catch {
    return { days: 1, grown: 0, fresh: false };
  }
}

// The visitor's own tree, if they planted one: where along the island, from 0 to 1, and on which day of their
// visits. It grows a stage on each later day they come back, up to four. Kept in this browser.
function ownTree(days) {
  try {
    const today = new Date().toDateString(), v = JSON.parse(localStorage.getItem('world-tree'));
    if (!v || !(v.u >= 0 && v.u <= 1)) return null;
    const age = clamp(days - v.day, 0, 4);
    if (age !== v.seen) {
      if (age > (v.seen ?? age)) v.grewOn = today;
      v.seen = age;
      localStorage.setItem('world-tree', JSON.stringify(v));
    }
    return { u: v.u, age, grew: v.grewOn === today };
  } catch {
    return null;
  }
}

export function mountWorld(el) {
  const root = document.documentElement, { hero, scene: sceneEl, tag } = el;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // The season, and any occasion, follow the visitor's date. ?season=winter and the like show the others, and
  // ?season=halloween or newyear an occasion.
  const asked = new URLSearchParams(location.search).get('season');
  const occasion = Object.hasOwn(OCCASIONS, asked) ? asked : ['spring', 'summer', 'autumn', 'winter'].includes(asked) ? null : occasionOf(new Date());
  const season = occasion ? OCCASIONS[occasion].season : ['spring', 'summer', 'autumn', 'winter'].includes(asked) ? asked : seasonOf(new Date());
  const lightMq = matchMedia('(prefers-color-scheme: light)');
  const { days, grown, fresh: newHouse } = visits();
  let tree = ownTree(days);
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
  let tick = 0, vsync = 1000 / 60, pace = 1, drawn = 0, stir = performance.now(), asleep = false;
  const gaps = new Array(30).fill(1000 / 60), costs = new Array(60).fill(0);
  let sound = null, soundJob = 0, pressed = false, jar = jarCount();

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
    if (m.type === 'snap') return postcard(m.img);
    if (m.type === 'door') return portal(m);
    if (m.type === 'jar') return keepJar(m.n);
    if (m.type === 'plant') return plant(m.u);
    if (m.sfx && sound) for (const [name, pan, arg] of m.sfx) sound.play(name, pan, arg);
    show(m.hover, m.type === 'frame');
    if (m.type === 'frame') {
      busy = false;
      paceTo(m.ms);
      asleep = m.asleep;
      sound?.sleep(asleep);
    }
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
    painter.postMessage({ id, W, H, night, season, occasion, layers: geo.paints });
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
    post({ type: 'size', W, H, dpr: devicePixelRatio || 1, night: P.night, season, occasion, grown, jar, sapling: tree, first, wait: first && !!painter });
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

  // How many screen refreshes each world frame takes. Handing the renderer a frame as soon as it is free lets frames
  // land two refreshes apart, then three, whenever drawing one takes about as long as two refreshes, which reads as
  // stutter, the more so on a fast screen (144 Hz). So the world steps every `pace` refreshes: the fewest that nine
  // in ten recent frames fit into, with half a millisecond to hand the frame over. A rare slow frame only drops itself.
  // The pace speeds up again only once frames fit the faster one with room to spare, so it never flips between the
  // two. The refresh interval is the shortest recent gap between animation frames.
  function paceTo(ms) {
    costs[drawn++ % costs.length] = ms;
    const p90 = costs.slice().sort((a, b) => a - b)[Math.floor(costs.length * .9)] + .5;
    const need = Math.max(1, Math.ceil(p90 / vsync));
    if (need > pace || (need < pace && p90 < (pace - 1) * vsync * .92)) pace = need;
  }
  // The page's frame clock. Each world frame it eases the parallax, slides the layers and hands the renderer its next
  // frame, once it has finished the last, so a slow device drops frames instead of falling behind. While the world
  // sleeps, which is when nothing on the page has stirred for a while, it steps at about 30 frames a second at most.
  function frame(now) {
    raf = requestAnimationFrame(frame);
    const gap = now - tick;
    tick = now;
    if (gap > 3) {
      gaps.copyWithin(0, 1);
      gaps[gaps.length - 1] = gap;
      vsync = Math.min(...gaps);
    }
    const step = asleep ? Math.max(pace, Math.round(1000 / 30 / vsync)) : pace;
    if (now - last < (step - .5) * vsync || (visible && busy)) return;
    const dt = Math.min(.05, (now - last) / 1000 || 0);
    last = now;
    drawSeams(dt, now / 1000);
    if (!visible) return void (sent = now);
    mx += (tmx - mx) * Math.min(1, dt * 3);
    my += (tmy - my) * Math.min(1, dt * 3);
    place();
    busy = true;
    const raw = (now - sent) / 1000;
    sent = now;
    post({ type: 'frame', raw, mx, my, scroll: scrollY, pointer, still: pointer ? (now - lastMove) / 1000 : 0, idle: (now - stir) / 1000 });
  }
  function sync() {
    sound?.active(visible && !document.hidden);
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
        const [latin, common, said] = GUIDE[best], fresh = record(best);
        const extra = best === 'stack' && newHouse ? NEW_HOUSE : best === 'sapling' ? treeNews() : OCCASIONS[occasion]?.[best];
        const line = extra ? `${said} ${extra}` : said;
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
  // Over a link, a button or the open guide the pointer is on the page, not in the world, so nothing behind it gets
  // named or recorded. The layers still follow it.
  hero.addEventListener('pointermove', e => {
    const p = localPoint(e);
    pointer = e.target.closest('a, button, [data-guide]') ? null : p;
    lastMove = performance.now();
    if (pressed) post({ type: 'drag', x: p.x, y: p.y });
    if (reduce) return look();
    tmx = (p.x / W) * 2 - 1;
    tmy = (p.y / H) * 2 - 1;
  }, { signal });
  hero.addEventListener('pointerleave', () => {
    pointer = null;
    tmx = tmy = 0;
    if (reduce) look();
  }, { signal });
  // A click sends a ring of light through the scene, and knocks on the arch if it lands there. A press is followed
  // until it lets go, for sweeping across the lanterns and for holding still to brew a storm. With a mouse, it starts no
  // text selection, so a sweep that strays over the heading doesn't select it.
  hero.addEventListener('pointerdown', e => {
    if (!geo || e.target.closest('a, button, [data-guide]')) return;
    const p = localPoint(e);
    if (e.pointerType === 'mouse') e.preventDefault();
    pressed = true;
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
    sound?.play('chime', (p.x / W) * 2 - 1);
    post({ type: 'down', x: p.x, y: p.y });
  }, { signal });
  for (const type of ['pointerup', 'pointercancel']) {
    addEventListener(type, () => {
      if (!pressed) return;
      pressed = false;
      post({ type: 'up' });
    }, { signal });
  }
  function keepJar(n) {
    jar = n;
    try {
      localStorage.setItem('world-jar', String(n));
    } catch {}
  }
  function plant(u) {
    tree = { u, age: 0, grew: false };
    try {
      localStorage.setItem('world-tree', JSON.stringify({ u, day: days, seen: 0 }));
    } catch {}
  }
  const treeNews = () => (tree?.age === 4 ? TREE_GROWN : tree?.grew ? TREE_GREW : null);

  // Field guide: every creature and place the visitor has hovered, kept in this browser only.
  const { guideBtn, guide: guideEl, guideList, guideCount, guideFoot } = el;
  let found = new Set();
  try {
    found = new Set((JSON.parse(localStorage.getItem('field-guide')) || []).filter(k => GUIDE[k]));
  } catch {}
  // A phone shows fewer landmarks, and a world held still for reduced motion brews no storms, so the guide lists only
  // what can be found.
  const guideOrder = () => GUIDE_ORDER.filter(g => !(geo && geo.phone && g[2]) && !(reduce && g[0] === 'storm'));
  const foundCount = () => guideOrder().filter(([k]) => found.has(k)).length;
  // The desk behind the arch, the barbell in the stars and the visitor's own tree are not on the list. Finding them puts
  // the count past the total.
  const extras = () => ['desk', 'lifter', 'sapling'].filter(k => found.has(k));
  const tally = () => `${foundCount() + extras().length} / ${guideOrder().length}`;
  // The song grows with the guide: how much of it has been found, from 0 to 1.
  const songLevel = () => foundCount() / guideOrder().length;
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
        ? `All ${n} found, plus ${['one that was', 'two that were', 'three that were'][more - 1]} never on the list. Thanks for looking so closely.`
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
    sound?.play('found', pointer ? (pointer.x / W) * 2 - 1 : 0);
    sound?.song(songLevel());
    if (foundCount() === guideOrder().length) post({ type: 'serpent' });
    return true;
  }
  // The guide opens upward, so on a short screen it stops below the site's header instead of running under it.
  function openGuide(open) {
    const top = document.querySelector('.nav')?.getBoundingClientRect().bottom ?? 0;
    guideEl.style.maxHeight = open ? `min(76vh, 620px, ${Math.max(200, guideBtn.getBoundingClientRect().top - top - 20)}px)` : '';
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

  // A postcard of the world as it is right now: the renderer flattens the layers, and postcard.js frames them. Its code
  // loads on the first click, so it costs the page nothing until someone wants one.
  const { postcardBtn } = el;
  postcardBtn.addEventListener('click', () => geo && post({ type: 'snap' }), { signal });
  function postcard(img) {
    const font = e => getComputedStyle(e).fontFamily;
    import('./postcard').then(({ savePostcard }) => savePostcard(img, {
      W, geo, season, night: P.night, tally: tally(), display: font(hero.querySelector('h1')), mono: font(guideBtn),
    }));
  }

  // A theme switch waits for the paint worker's bitmaps of the other theme, then hands them to the renderer when the
  // theme changes. The world keeps moving while it waits, so the wait never freezes. With the world out of view, the
  // switch spreads from the control instead of from the sun or moon, and a click on the door in the sky spreads it from
  // the doorway.
  let doorway = null;
  function portal({ x, y }) {
    const b = hero.getBoundingClientRect();
    doorway = { x: b.left + x, y: b.top + y };
    switchTheme(isLight() ? 'dark' : 'light', doorway).finally(() => (doorway = null));
  }
  const unstage = setThemeStage({
    prepare: async () => {
      const ready = spare && (await spare);
      release(held);
      held = ready;
    },
    origin: () => {
      if (doorway) return doorway;
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
    sound?.night(P.night);
    sound?.play('swell', doorway ? (doorway.x / innerWidth) * 2 - 1 : 0);
    prepare();
    drawSeams(0, last / 1000, true);
  }
  const unsubscribe = subscribeToTheme(onTheme);
  lightMq.addEventListener('change', () => {
    if (!root.dataset.theme) onTheme();
  }, { signal });

  // Sound, off until asked for. The audio context has to start inside the click itself for the browser to let it play,
  // so it is made here and handed to sound.js once that loads.
  const { soundBtn } = el;
  soundBtn.addEventListener('click', () => {
    const on = soundBtn.getAttribute('aria-pressed') !== 'true';
    soundBtn.setAttribute('aria-pressed', String(on));
    const job = ++soundJob;
    sound?.stop();
    sound = null;
    if (!on || typeof AudioContext === 'undefined') return;
    const ac = new AudioContext();
    import('./sound').then(({ makeSound }) => {
      if (job !== soundJob || signal.aborted) return ac.close();
      sound = makeSound(ac, P.night, occasion);
      sound.song(songLevel());
      sound.active(visible && !document.hidden);
    });
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
  // Anything stirring on the page keeps the world awake, or wakes it.
  for (const type of ['pointerdown', 'keydown', 'scroll', 'wheel']) addEventListener(type, () => (stir = performance.now()), { passive: true, signal });
  // The page's wanderlights shy away from the pointer too.
  addEventListener('pointermove', e => {
    stir = performance.now();
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
    soundJob++;
    sound?.stop();
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
