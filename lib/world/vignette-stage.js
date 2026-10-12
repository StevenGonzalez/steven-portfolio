// The page's side of a project scene: puts a canvas in the box, hands it to a worker where it can, and tells the player
// the box's size, the theme and whether it is on screen. Returns a teardown. A canvas once handed to a worker can't be
// handed again, so each mount makes its own.

import { playScene } from './vignette';
import { subscribeToTheme } from '../theme';

export function mountScene(box, slug) {
  const cv = box.appendChild(document.createElement('canvas')), root = document.documentElement, lightMq = matchMedia('(prefers-color-scheme: light)');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const night = () => !(root.dataset.theme ? root.dataset.theme === 'light' : lightMq.matches);
  let worker = null, post;
  if (typeof OffscreenCanvas !== 'undefined' && 'transferControlToOffscreen' in HTMLCanvasElement.prototype) {
    try {
      worker = new Worker(new URL('./vignette.worker.js', import.meta.url), { type: 'module' });
      const canvas = cv.transferControlToOffscreen();
      worker.postMessage({ canvas, slug, reduce }, [canvas]);
      post = m => worker.postMessage(m);
    } catch {
      worker?.terminate();
      worker = null;
    }
  }
  post ||= playScene(cv, slug, reduce);

  let width = 0, dark = night();
  const ro = new ResizeObserver(([e]) => {
    const { width: w, height: h } = e.contentRect;
    if (!w || !h || Math.abs(w - width) < 1) return;
    width = w;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    post({ type: 'size', w: Math.round(w * dpr), h: Math.round(h * dpr), night: dark });
  });
  ro.observe(box);
  const io = new IntersectionObserver(([e]) => post({ type: 'on', on: e.isIntersecting }));
  io.observe(box);
  const retheme = () => {
    if (night() === dark) return;
    dark = night();
    post({ type: 'theme', night: dark });
  };
  const unsubscribe = subscribeToTheme(retheme);
  lightMq.addEventListener('change', retheme);
  return () => {
    ro.disconnect();
    io.disconnect();
    unsubscribe();
    lightMq.removeEventListener('change', retheme);
    post({ type: 'on', on: false });
    worker?.terminate();
    cv.remove();
  };
}
