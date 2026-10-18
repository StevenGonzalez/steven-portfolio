// The page's side of a project scene: puts a canvas in the box, hands it to a worker where it can, and tells the player
// the box's size, the theme and whether it is on screen. Returns a teardown. A canvas once handed to a worker can't be
// handed again, so each mount makes its own, and so does falling back to this thread if the worker fails.

import { onPixelRatio } from './screen';
import { playScene } from './vignette';
import { subscribeToTheme } from '../theme';

/**
 * Mounts the scene for a project in `box`.
 * @param {HTMLElement} box
 * @param {string} slug The project's slug, which picks its scene.
 * @returns {() => void} The teardown.
 */
export function mountScene(box, slug) {
  const root = document.documentElement, lightMq = matchMedia('(prefers-color-scheme: light)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const night = () => !(root.dataset.theme ? root.dataset.theme === 'light' : lightMq.matches);
  let cv = null, worker = null, post = null, gone = false;
  // The last size the player was told, and whether the box is on screen, for a player started over on this thread to be
  // told again.
  let sized = null, on = false;
  function start(off) {
    cv?.remove();
    cv = box.appendChild(document.createElement('canvas'));
    if (off && typeof OffscreenCanvas !== 'undefined' && 'transferControlToOffscreen' in HTMLCanvasElement.prototype) {
      try {
        const canvas = cv.transferControlToOffscreen();
        const w = new Worker(new URL('./vignette.worker.js', import.meta.url), { type: 'module' });
        w.onerror = e => {
          e.preventDefault();
          w.terminate();
          if (worker !== w || gone) return;
          start(false);
          if (sized) post({ ...sized, night: dark });
          play();
        };
        w.postMessage({ canvas, slug, reduce }, [canvas]);
        worker = w;
        post = m => w.postMessage(m);
        return;
      } catch {
        return start(false);
      }
    }
    worker = null;
    post = playScene(cv, slug, reduce);
  }

  // The player is told the box's size in the canvas's pixels when its width changes, or when it moves to a screen with
  // a different pixel ratio.
  let width = 0, height = 0, ratio = 0, dark = night();
  function size(w, h) {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    if (!w || !h || (Math.abs(w - width) < 1 && dpr === ratio)) return;
    width = w;
    height = h;
    ratio = dpr;
    sized = { type: 'size', w: Math.round(w * dpr), h: Math.round(h * dpr) };
    post({ ...sized, night: dark });
  }
  start(true);
  const ro = new ResizeObserver(([e]) => size(e.contentRect.width, e.contentRect.height));
  ro.observe(box);
  const life = new AbortController();
  onPixelRatio(() => size(width, height), life.signal);
  // The scene plays only while its box is on screen and the page is in view.
  const play = () => post({ type: 'on', on: on && !document.hidden });
  const io = new IntersectionObserver(entries => {
    on = entries.at(-1).isIntersecting;
    play();
  });
  io.observe(box);
  document.addEventListener('visibilitychange', play, { signal: life.signal });
  const retheme = () => {
    if (night() === dark) return;
    dark = night();
    post({ type: 'theme', night: dark });
  };
  const unsubscribe = subscribeToTheme(retheme);
  lightMq.addEventListener('change', retheme);
  return () => {
    gone = true;
    life.abort();
    ro.disconnect();
    io.disconnect();
    unsubscribe();
    lightMq.removeEventListener('change', retheme);
    post({ type: 'on', on: false });
    worker?.terminate();
    cv.remove();
  };
}
