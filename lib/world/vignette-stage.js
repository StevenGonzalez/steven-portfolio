// The page's side of a project scene: puts a canvas in the box, hands it to a worker where it can, and tells the player
// the box's size, the theme and whether it is on screen. Returns a teardown. A canvas once handed to a worker can't be
// handed again, so each mount makes its own, and so does falling back to this thread if the worker fails.

import { playScene } from './vignette';
import { subscribeToTheme } from '../theme';

export function mountScene(box, slug) {
  const root = document.documentElement, lightMq = matchMedia('(prefers-color-scheme: light)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const night = () => !(root.dataset.theme ? root.dataset.theme === 'light' : lightMq.matches);
  let cv = null, worker = null, post = null, gone = false;
  // The last size and visibility the player was told, for a player started over on this thread to be told again.
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
          post({ type: 'on', on });
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

  let width = 0, dark = night();
  start(true);
  const ro = new ResizeObserver(([e]) => {
    const { width: w, height: h } = e.contentRect;
    if (!w || !h || Math.abs(w - width) < 1) return;
    width = w;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    sized = { type: 'size', w: Math.round(w * dpr), h: Math.round(h * dpr) };
    post({ ...sized, night: dark });
  });
  ro.observe(box);
  const io = new IntersectionObserver(([e]) => {
    on = e.isIntersecting;
    post({ type: 'on', on });
  });
  io.observe(box);
  const retheme = () => {
    if (night() === dark) return;
    dark = night();
    post({ type: 'theme', night: dark });
  };
  const unsubscribe = subscribeToTheme(retheme);
  lightMq.addEventListener('change', retheme);
  return () => {
    gone = true;
    ro.disconnect();
    io.disconnect();
    unsubscribe();
    lightMq.removeEventListener('change', retheme);
    post({ type: 'on', on: false });
    worker?.terminate();
    cv.remove();
  };
}
