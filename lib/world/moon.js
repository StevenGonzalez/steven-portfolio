// The moon keeps to the real one. Its phase comes from the date alone, counted in synodic months from a known new
// moon, so it needs no network and every visitor sees the same moon on the same night. Around full moon the cloud sea
// rises up the island's sides (scene.js) and the whales sing (life.js); around new moon the stars are brighter, and
// the visitor's stars are easier to catch and join up (stars.js). The moon is drawn as it is lit, a crescent or more
// with the lit side on the right while it waxes and on the left while it wanes, as it looks from the north.

import { TAU, clamp, rgba } from "./core";

// The mean length of a lunar month in days, and a new moon to count from: 6 January 2000, 18:14 UTC.
const MONTH = 29.530588853,
  NEW = Date.UTC(2000, 0, 6, 18, 14);

const ramp = (a, b, x) => {
  const u = clamp((x - a) / (b - a), 0, 1);
  return u * u * (3 - 2 * u);
};

// How far through its month the moon is, 0 at new and 0.5 at full, and how much of its face is lit. `full` and `dark`
// run from 0 to 1 over the last few nights before full or new moon and back down after, peaking a night or so either
// side of it.
export function buildMoon(K) {
  const age = ((((Date.now() - NEW) / 864e5 / MONTH) % 1) + 1) % 1,
    lit = (1 - Math.cos(TAU * age)) / 2;
  K.moon = { age, lit, full: ramp(0.85, 0.98, lit), dark: ramp(0.15, 0.02, lit) };
}

// The lit part of the moon's face, a disc of radius `r` at `x`, `y`: half the disc, out to the terminator, an ellipse
// as wide as the cosine of the moon's age. Mirrored once it is past full.
export function litPath(x, y, r, age) {
  const k = Math.cos(TAU * age),
    p = new Path2D(),
    s = age < 0.5 ? 1 : -1;
  p.moveTo(x, y - r);
  p.ellipse(x, y, r, r, 0, -Math.PI / 2, Math.PI / 2, s < 0);
  p.ellipse(x, y, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, k > 0 === s > 0);
  p.closePath();
  return p;
}

// The dark part of the face, faintly lit by the earth, so the moon's whole round still shows against the stars.
export function earthshine(c, x, y, r, sky) {
  c.fillStyle = rgba(sky.map((v) => v + (226 - v) * 0.1));
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
}
