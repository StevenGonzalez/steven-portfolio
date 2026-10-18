// Paints static layers off the main thread, so the first paint never blocks the page and a theme switch only has to
// copy finished bitmaps. It runs the same painting code as the renderer.

import { PAD } from "./core";
import { layout, setLight } from "./scene";
import { PAINTERS } from "./painters";
import { palette } from "./season";

// Laid out just as the renderer lays the world out, and again only when that would change.
let K, laid;
self.onmessage = ({ data: { id, W, H, grown, night, season, turn, occasion, layers } }) => {
  const key = `${W}x${H}x${grown}x${occasion}`;
  if (laid !== key) {
    K = layout(W, H, grown, occasion);
    laid = key;
  }
  const P = palette(night, season, turn);
  setLight(K, night);
  const bitmaps = layers.map(({ name, r, top, w, h }) => {
    const cv = new OffscreenCanvas(w, h),
      c = /** @type {OffscreenCanvasRenderingContext2D} */ (cv.getContext("2d"));
    c.setTransform(r * K.U, 0, 0, r * K.U, r * PAD, r * (PAD - top));
    PAINTERS[name](c, K, P);
    return cv.transferToImageBitmap();
  });
  self.postMessage({ id, night, bitmaps }, bitmaps);
};
