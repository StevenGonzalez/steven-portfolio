// Paints static layers off the main thread, so the first paint never blocks the page and a theme switch only has to
// copy finished bitmaps. It runs the same painting code as the page.

import { PAD } from './core';
import { layout, setLight } from './scene';
import { PAINTERS } from './painters';
import { palette } from './season';

let K, size;
self.onmessage = ({ data: { id, W, H, night, season, layers } }) => {
  if (size !== `${W}x${H}`) {
    K = layout(W, H);
    size = `${W}x${H}`;
  }
  const P = palette(night, season);
  setLight(K, night);
  const bitmaps = layers.map(({ name, r, top, w, h }) => {
    const cv = new OffscreenCanvas(w, h), c = cv.getContext('2d');
    c.setTransform(r * K.U, 0, 0, r * K.U, r * PAD, r * (PAD - top));
    PAINTERS[name](c, K, P);
    return cv.transferToImageBitmap();
  });
  self.postMessage({ id, night, bitmaps }, bitmaps);
};
