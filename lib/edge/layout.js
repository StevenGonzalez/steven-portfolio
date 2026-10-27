// Where things are at the edge of the world, shared by the painters, the player and the page. Scene units, as in the
// home page's world: the scene is 1000 units tall and K.WU wide.

import { TAU, clamp, seeded } from "../world/core";

// How far the canvases overhang the scene, in CSS pixels, so parallax never shows an edge.
export const PAD = 72;

// How far each layer moves for parallax, back to front: the sky and void, the galaxy, the world, what moves in front of
// it, the rock, and the plants right in front of the viewer.
export const DEPTH = { space: 0.15, galaxy: 0.3, world: 0.5, fx: 0.5, rock: 1, front: 1.3 };

// The cloud sea's far horizon, the lip it pours over, and the bottom of the world's crust.
export const SEA = 300,
  LIP = 400,
  CRUST = 520;

// Where the sun goes down at dusk, behind the horizon, and where the moon hangs at night.
export const sunAt = (K) => [K.WU * 0.64, SEA - 4];
export const moonAt = (K) => [K.WU * 0.8, 140];

// The lip from left to right: it bows a little toward the viewer in the middle.
export const lipAt = (K, x) => LIP + 24 * Math.sin((x / K.WU) * Math.PI);

// How thick the falls are along the edge, from 0 where they part and the rock shows, to 1. A few waves summed, so it
// wanders smoothly and comes out the same every time.
export const fallsAt = (() => {
  const rnd = seeded(5),
    waves = [0.006, 0.013, 0.029, 0.06].map((f) => [f * (0.8 + rnd() * 0.4), rnd() * TAU]);
  return (x) => {
    const w = waves.reduce((s, [f, p], i) => s + Math.sin(x * f + p) / (i + 1), 0) / 1.6,
      t = clamp((0.55 + 0.6 * w - 0.25) / 0.3, 0, 1);
    return t * t * (3 - 2 * t);
  };
})();

// The galaxy lies face up far below, `S` units across, its middle at `y` under the middle of the scene, seen so low
// across that it looks `TILT` as deep as it is wide. It turns once every PERIOD, by the clock rather than from when the
// page opened, so a star left in it is where it was left, turned as far as the time since.
export const GALAXY = { S: 3200, y: 960, TILT: 0.3, PERIOD: 15 * 60 * 1000 };
export const spinAt = (ms) => ((ms % GALAXY.PERIOD) / GALAXY.PERIOD) * TAU;

// The rock the viewer stands on, its lighthouse lamp and the end of its pier, drawn smaller on a narrow screen and kept
// to the bottom left corner. `at` takes a point drawn on the rock to the scene. `box` is the part of the scene the rock
// covers, overhang included, which is all its canvas needs to be.
export function rockPlace(K) {
  const s = clamp(K.WU / 1500, 0.55, 1),
    at = (x, y) => [x * s, 1000 + (y - 1000) * s];
  return {
    s,
    at,
    lamp: at(160, 498),
    pier: at(676, 686),
    box: { x: -K.PAD, y: 1000 - 560 * s, w: 720 * s + K.PAD, h: 560 * s + K.PAD },
  };
}
