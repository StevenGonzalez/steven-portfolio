// Shared helpers for the painted world: seeded randomness, colour, soft brushes and the two lighting palettes.
// Scene units: the hero is 1000 units tall and K.WU units wide. Every canvas overhangs the hero by PAD pixels so parallax never shows an edge.

export const PAD = 72;
export const TAU = Math.PI * 2;
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
// Where a scene x sits across the world, from -1 at the left edge to 1 at the right: the stereo pan for its sounds.
export const panAt = (K, x) => (x / K.WU) * 2 - 1;

// A scratch canvas for sprites and caches. The same painting code runs in the page and in the paint worker, which has
// no document, so there it gets an OffscreenCanvas instead.
export const makeCanvas = () => (typeof document === 'undefined' ? new OffscreenCanvas(1, 1) : document.createElement('canvas'));

export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// A copy of `list` in a random order, every order as likely as any other. Sorting by a random comparison is not: it
// favours some orders, and how many random numbers it takes depends on the browser's sort, so a seeded world would
// play out differently from one browser to the next.
export function shuffle(list, rnd = Math.random) {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export const mixc = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
export const rgba = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;

// Dusk is the light theme: golden hour with the sun behind the tree. Night is the dark theme: moonlight and bioluminescence.
export const PAL = {
  dusk: {
    night: false,
    sky: [[0, [18, 44, 58]], [.3, [40, 88, 100]], [.52, [112, 146, 134]], [.7, [222, 184, 128]], [.84, [252, 220, 162]], [1, [246, 206, 152]]],
    light: [255, 234, 186], bloom: [255, 190, 116], haze: [236, 204, 158],
    cloudDark: [92, 118, 122], cloudLit: [255, 226, 182],
    rock: [40, 48, 54], rockLit: [204, 150, 104], stone: [112, 108, 98],
    rim: [255, 216, 150], leafDark: [16, 44, 46], leafMid: [44, 98, 82], leafLit: [255, 226, 156],
    glow: [255, 214, 140], bio: [255, 206, 136], water: [232, 242, 234],
    fg: [8, 17, 20], body: [46, 74, 86], belly: [222, 202, 170],
    koi: [[255, 128, 60], [255, 238, 214]], jelly: [[255, 206, 150], [255, 236, 214], [255, 176, 150]],
  },
  night: {
    night: true,
    sky: [[0, [4, 8, 20]], [.3, [9, 22, 44]], [.55, [16, 46, 68]], [.72, [28, 80, 92]], [.83, [54, 116, 116]], [1, [22, 56, 68]]],
    light: [210, 236, 240], bloom: [80, 160, 184], haze: [52, 104, 118],
    cloudDark: [16, 30, 44], cloudLit: [112, 168, 184],
    rock: [12, 18, 26], rockLit: [62, 102, 120], stone: [44, 56, 64],
    rim: [164, 228, 238], leafDark: [5, 18, 24], leafMid: [14, 50, 58], leafLit: [92, 212, 194],
    glow: [120, 240, 218], bio: [120, 240, 218], water: [150, 214, 222],
    fg: [2, 7, 11], body: [24, 44, 60], belly: [90, 134, 144],
    koi: [[120, 222, 212], [232, 255, 250]], jelly: [[110, 236, 214], [176, 150, 255], [255, 150, 206]],
  },
};

// A soft round dab with a roughly gaussian falloff: the basic brush for clouds, mist and light.
export function puff(c, x, y, r, col, a) {
  if (r <= 0 || a <= 0) return;
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(.45, rgba(col, a * .5));
  g.addColorStop(1, rgba(col, 0));
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
}

// Glow sprites, made once per colour, so animated layers never build a gradient per dab. Each is a small pre-rendered
// image, for drawing stretched to any shape, and the same glow as a gradient on a unit circle (`glow`), which dab uses.
// They are kept by the colour as drawn, whole numbers, so colours that differ only in their fractions share one.
const spriteCache = new Map();
export function sprite(col) {
  const key = rgba(col);
  let s = spriteCache.get(key);
  if (!s) {
    s = makeCanvas();
    s.width = s.height = 64;
    const c = s.getContext('2d');
    puff(c, 32, 32, 32, col, 1);
    s.glow = c.createRadialGradient(0, 0, 0, 0, 0, 1);
    s.glow.addColorStop(0, rgba(col, 1));
    s.glow.addColorStop(.45, rgba(col, .5));
    s.glow.addColorStop(1, rgba(col, 0));
    spriteCache.set(key, s);
  }
  return s;
}
// Under 'lighter', a glow sprite is drawn as its gradient scaled to the dab, not as the image stretched. Firefox draws
// canvases on the CPU on Linux, where a stretched image under 'lighter' costs two to five times what the gradient
// does, and much of the world's light is drawn that way. Otherwise the stretched image is as fast or faster.
// A dab that keeps its size from frame to frame can pass `hold`, which keeps its gradient drawn at that size, to be
// copied at whole pixels: about a third of the cost again, the most for the biggest. A glow is round, so this holds
// on a rotated canvas too.
export function dab(c, s, x, y, r, a, hold) {
  if (hold && s.glow) {
    const m = c.getTransform(), R = Math.max(1, Math.round(r * Math.hypot(m.a, m.b))), b = (hold.stamp ||= { cv: makeCanvas() }), cv = b.cv;
    if (b.s !== s || b.R !== R) {
      b.s = s;
      b.R = R;
      cv.width = cv.height = R * 2;
      const g = cv.getContext('2d');
      g.setTransform(R, 0, 0, R, R, R);
      g.fillStyle = s.glow;
      g.fillRect(-1, -1, 2, 2);
    }
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.globalAlpha = clamp(a, 0, 1);
    c.drawImage(cv, Math.round(m.a * x + m.c * y + m.e) - R, Math.round(m.b * x + m.d * y + m.f) - R);
    c.setTransform(m);
  } else if (s.glow && c.globalCompositeOperation === 'lighter') {
    c.save();
    c.globalAlpha = clamp(a, 0, 1);
    c.fillStyle = s.glow;
    c.transform(r, 0, 0, r, x, y);
    c.fillRect(-1, -1, 2, 2);
    c.restore();
  } else {
    c.globalAlpha = clamp(a, 0, 1);
    c.drawImage(s, x - r, y - r, r * 2, r * 2);
  }
  c.globalAlpha = 1;
}

// Draws `img` stretched to w by h at x, y, as a straight copy at whole pixels. Firefox on Linux draws canvases on the
// CPU, where resampling a big image that is stretched, or sits between pixels, costs five or six times a straight
// copy. So the image is stretched once, into a canvas kept on `hold.blit` (one per thing drawn), and stretched again
// only when its size on the canvas, or the image itself, changes; a painter that repaints an image in place bumps its
// `ver`. For big, soft, slow things, where landing on whole pixels cannot be seen. The canvas must only be scaled
// and moved, not rotated.
export function blit(c, img, x, y, w, h, hold) {
  const m = c.getTransform(), cw = Math.max(1, Math.round(w * m.a)), ch = Math.max(1, Math.round(h * m.d));
  const b = (hold.blit ||= { cv: makeCanvas() }), s = b.cv;
  if (b.img !== img || b.ver !== img.ver || s.width !== cw || s.height !== ch) {
    b.img = img;
    b.ver = img.ver;
    s.width = cw;
    s.height = ch;
    s.getContext('2d').drawImage(img, 0, 0, cw, ch);
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.drawImage(s, Math.round(m.a * x + m.e), Math.round(m.d * y + m.f));
  c.setTransform(m);
}

// An ellipse as its own subpath, so many can share one Path2D without connecting lines.
export function ell(p, x, y, rx, ry, rot) {
  p.moveTo(x + rx * Math.cos(rot), y + rx * Math.sin(rot));
  p.ellipse(x, y, rx, ry, rot, 0, TAU);
}

// A path through points, smoothed with midpoint quadratics.
export function smoothPath(pts, closed = true, p = new Path2D()) {
  const n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  if (closed) {
    const m = mid(pts[n - 1], pts[0]);
    p.moveTo(m[0], m[1]);
    for (let i = 0; i < n; i++) {
      const b = mid(pts[i], pts[(i + 1) % n]);
      p.quadraticCurveTo(pts[i][0], pts[i][1], b[0], b[1]);
    }
    p.closePath();
  } else {
    p.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < n - 1; i++) {
      const b = mid(pts[i], pts[i + 1]);
      p.quadraticCurveTo(pts[i][0], pts[i][1], b[0], b[1]);
    }
    p.lineTo(pts[n - 1][0], pts[n - 1][1]);
  }
  return p;
}

// A filled outline that tapers from w0 to w1 along a quadratic curve, with a round cap at the end so limbs join cleanly.
export function taper(x0, y0, cx, cy, x1, y1, w0, w1, p = new Path2D()) {
  const L = [], R = [], n = 8;
  for (let i = 0; i <= n; i++) {
    const t = i / n, m = 1 - t;
    const x = m * m * x0 + 2 * m * t * cx + t * t * x1, y = m * m * y0 + 2 * m * t * cy + t * t * y1;
    const dx = 2 * m * (cx - x0) + 2 * t * (x1 - cx), dy = 2 * m * (cy - y0) + 2 * t * (y1 - cy), d = Math.hypot(dx, dy) || 1;
    const hw = lerp(w0, w1, t) / 2;
    L.push([x - (dy / d) * hw, y + (dx / d) * hw]);
    R.push([x + (dy / d) * hw, y - (dx / d) * hw]);
  }
  // Keep the outline clockwise on screen, the same way ellipses wind, so overlapping pieces union under nonzero fill.
  const ring = L.concat(R.reverse());
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    area += a[0] * b[1] - b[0] * a[1];
  }
  if (area < 0) ring.reverse();
  p.moveTo(ring[0][0], ring[0][1]);
  for (let i = 1; i < ring.length; i++) p.lineTo(ring[i][0], ring[i][1]);
  p.closePath();
  if (w1 > 0) ell(p, x1, y1, w1 / 2, w1 / 2, 0);
  return p;
}

// Light along the edges of a shape that face the light: draw the shape, cut away a copy shifted away from the light,
// tint what remains and add it on top. dx, dy point away from the light, in scene units.
let rimCanvas;
export function rimLight(c, draw, dx, dy, col, a, blur = 0) {
  const cv = c.canvas;
  rimCanvas ||= makeCanvas();
  if (rimCanvas.width !== cv.width || rimCanvas.height !== cv.height) {
    rimCanvas.width = cv.width;
    rimCanvas.height = cv.height;
  }
  const r = rimCanvas.getContext('2d'), m = c.getTransform();
  r.setTransform(1, 0, 0, 1, 0, 0);
  r.globalCompositeOperation = 'source-over';
  r.clearRect(0, 0, cv.width, cv.height);
  r.setTransform(m);
  r.fillStyle = '#fff';
  draw(r);
  r.globalCompositeOperation = 'destination-out';
  r.translate(dx, dy);
  draw(r);
  r.setTransform(1, 0, 0, 1, 0, 0);
  r.globalCompositeOperation = 'source-in';
  r.fillStyle = rgba(col);
  r.fillRect(0, 0, cv.width, cv.height);
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = 'lighter';
  c.globalAlpha = a;
  // A soft rim from four offset copies: a blur filter over the whole canvas costs far more for the same look.
  if (blur) {
    c.globalAlpha = a / 4;
    // Whole-pixel offsets keep each copy a straight blit with no resampling.
    const o = Math.max(1, Math.round(blur * .7));
    for (const [ox, oy] of [[-o, -o], [o, -o], [-o, o], [o, o]]) c.drawImage(rimCanvas, ox, oy);
  } else c.drawImage(rimCanvas, 0, 0);
  c.restore();
}

// Fine noise over painted layers, so gradients don't band and surfaces read as brushwork.
let grainTile;
export function grain(c, a, op = 'source-atop') {
  if (!grainTile) {
    grainTile = makeCanvas();
    grainTile.width = grainTile.height = 128;
    const g = grainTile.getContext('2d'), d = g.createImageData(128, 128), rnd = seeded(99);
    for (let i = 0; i < d.data.length; i += 4) {
      const v = rnd() * 255;
      d.data[i] = d.data[i + 1] = d.data[i + 2] = v;
      d.data[i + 3] = 255;
    }
    g.putImageData(d, 0, 0);
  }
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalCompositeOperation = op;
  c.globalAlpha = a;
  c.fillStyle = c.createPattern(grainTile, 'repeat');
  c.fillRect(0, 0, c.canvas.width, c.canvas.height);
  c.restore();
}

export function skyAt(P, y) {
  const v = clamp(y / 1000, 0, 1), st = P.sky;
  for (let i = 1; i < st.length; i++) {
    if (v <= st[i][0]) return mixc(st[i - 1][1], st[i][1], (v - st[i - 1][0]) / (st[i][0] - st[i - 1][0]));
  }
  return st[st.length - 1][1];
}

// Unit vector pointing from the light toward a point, scaled to len.
export function awayFrom(K, x, y, len) {
  const dx = x - K.L.x, dy = y - K.L.y, d = Math.hypot(dx, dy) || 1;
  return [(dx / d) * len, (dy / d) * len];
}
