// The world's canvases, back to front, and how far each one sits from the viewer. Kept apart from render.js so the page
// can make the canvases and slide them about without loading the renderer, which mostly runs in a worker.

// Depths shared across the engine, from the sky at 0 to the nearest ferns at 1.
export const D_FAR = 0.1,
  D_BACK = 0.2,
  D_ISLE = 0.5,
  D_FRONT = 0.85;

// Back to front, one canvas each. Static layers, named by `paint`, are painted once; animated layers, named by `draw`,
// are redrawn every frame. A layer with a `glow` is painted once and fades slowly up and down on the page, by the
// class of that name, which costs the renderer nothing.
export const LAYERS = [
  { d: 0, res: 0.6, paint: "sky" },
  { d: D_FAR, res: 0.5, paint: "far" },
  { d: D_BACK, res: 0.5, paint: "ridge" },
  { d: D_BACK, res: 0.8, draw: "back", half: "odd" },
  { d: 0.3, res: 0.5, paint: "mid" },
  { d: 0.4, res: 0.5, paint: "flanks" },
  { d: D_ISLE, res: 1, paint: "island" },
  { d: D_ISLE, res: 0.25, draw: "shade" },
  { d: D_ISLE, res: 1, draw: "isle" },
  { d: 0.65, res: 0.45, paint: "front" },
  { d: 0.65, res: 0.3, paint: "rays", glow: "breathe" },
  { d: 0.65, res: 0.2, paint: "glow", glow: "warm" },
  { d: D_FRONT, res: 1, half: "even", draw: "front" },
  { d: 1, res: 0.3, paint: "fg" },
];

// How far a layer at depth d is shifted on the page: nearer layers slide further with the pointer, and lag less behind
// the page as it scrolls. `mx` and `my` are the eased pointer, -1 to 1 across the hero.
export const shift = (d, mx, my, scroll, H) => [-mx * d * 28, -my * d * 14 + Math.min(scroll, H) * (1 - d) * 0.3];
