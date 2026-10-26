// Lost and found. Each week something small falls off the winged trader's ship and lies in the grass somewhere along
// the island's lip, catching the light now and then so it can be spotted. A click picks it up for the trader to take
// home, and the page shows the owner's thank-you. The page knows which thing it is this week, and whether it has been
// found already; this only lays it in the grass.

import { TAU, dab, rgba, sprite } from "./core";
import { D_ISLE } from "./layers";
import { LAMP } from "./whimsy";

// Where along the island's lip the thing can lie, as a share of its width, clear of the tree's trunk and the arch.
const SPOTS = [0.27, 0.44, 0.7, 0.84];
const BRASS = [200, 164, 84],
  DARK = [58, 48, 44];

/** `kind` is what is lying there, as `LOST` names it, and `week` picks where, passing over any spot too near one of
 *  the places in `taken`, such as the campfire or the visitor's own tree. A null `kind` leaves nothing.
 *  @param {number[]} taken */
export function makeLost(K, kind, week = 0, taken = []) {
  if (!kind) return { kind: null };
  const k = (K.phone ? 1 : Math.max(K.s, 0.7)) * 1.7,
    at = (i) => K.isle.x0 + K.iw * SPOTS[(week + i) % SPOTS.length],
    i = SPOTS.findIndex((_, i) => taken.every((x) => Math.abs(at(i) - x) > K.iw * 0.07)),
    x = at(Math.max(i, 0));
  return { kind, k, x, y: K.isle.topAt(x) - 2 * k };
}

/** Picks the thing up, for the page to thank the visitor for. */
export function pickLost(Lf) {
  Lf.lost.kind = null;
}

// The thing, lying a little tilted in the grass. Every few seconds the light catches it in a small cross of a glint,
// and at night it keeps a faint glow about it, so it can be found in the dark.
export function drawLost(c, Lf, K, P, t) {
  const L = Lf.lost;
  if (!L.kind) return;
  const { k, x, y } = L,
    glint = Math.max(0, Math.sin(t * 1.3 + x) - 0.93) / 0.07;
  c.save();
  c.translate(x, y);
  c.rotate(-0.25);
  if (P.night) {
    c.globalCompositeOperation = "lighter";
    dab(c, sprite(LAMP), 0, 0, 14 * k, 0.16);
    c.globalCompositeOperation = "source-over";
  }
  c.lineWidth = 1.2 * k;
  c.lineCap = "round";
  const shade = (col) => rgba(P.night ? col.map((v) => v * 0.55 + 20) : col);
  // A soft shadow seats it in the grass.
  c.fillStyle = "rgba(20,16,14,0.22)";
  c.beginPath();
  c.ellipse(0, 2.6 * k, 5.5 * k, 1.4 * k, 0, 0, TAU);
  c.fill();
  THINGS[L.kind](c, k, shade);
  c.restore();
  if (glint > 0) {
    c.globalCompositeOperation = "lighter";
    const g = sprite([255, 246, 220]);
    dab(c, g, x + 2 * k, y - 3 * k, 6 * k, 0.8 * glint);
    c.fillStyle = rgba([255, 250, 235], 0.9 * glint);
    c.fillRect(x + 2 * k - 7 * k * glint, y - 3.4 * k, 14 * k * glint, 0.8 * k);
    c.fillRect(x + 1.6 * k, y - 3 * k - 7 * k * glint, 0.8 * k, 14 * k * glint);
    c.globalCompositeOperation = "source-over";
  }
  // Its reach is little more than the thing, so pointing at it names it rather than the grass and bells about it.
  Lf.hits.push(["lost", x, y - 2 * k, 6.5 * k, D_ISLE]);
}

// Each thing, drawn about its middle, a few units across.
const THINGS = {
  key(c, k, shade) {
    c.strokeStyle = shade(BRASS);
    c.beginPath();
    c.arc(-4 * k, 0, 2.2 * k, 0, TAU);
    c.moveTo(-1.8 * k, 0);
    c.lineTo(5 * k, 0);
    c.moveTo(3 * k, 0);
    c.lineTo(3 * k, 1.8 * k);
    c.moveTo(4.6 * k, 0);
    c.lineTo(4.6 * k, 1.4 * k);
    c.stroke();
  },
  cup(c, k, shade) {
    c.fillStyle = shade([238, 232, 222]);
    c.beginPath();
    c.moveTo(-3.6 * k, -3 * k);
    c.lineTo(3.6 * k, -3 * k);
    c.lineTo(2.4 * k, 2 * k);
    c.lineTo(-2.4 * k, 2 * k);
    c.fill();
    c.strokeStyle = shade([238, 232, 222]);
    c.beginPath();
    c.arc(4 * k, -0.8 * k, 1.5 * k, -1.2, 1.6);
    c.stroke();
    c.fillStyle = shade([92, 136, 196]);
    c.fillRect(-3.1 * k, -1.6 * k, 6.2 * k, 1 * k);
  },
  marble(c, k, shade) {
    c.fillStyle = shade([78, 128, 210]);
    c.beginPath();
    c.arc(0, 0, 2.6 * k, 0, TAU);
    c.fill();
    c.fillStyle = shade([236, 244, 255]);
    c.beginPath();
    c.arc(-0.9 * k, -0.9 * k, 0.8 * k, 0, TAU);
    c.fill();
  },
  compass(c, k, shade) {
    c.fillStyle = shade([240, 234, 220]);
    c.strokeStyle = shade(BRASS);
    c.beginPath();
    c.arc(0, 0, 3.4 * k, 0, TAU);
    c.fill();
    c.stroke();
    c.strokeStyle = shade([186, 64, 52]);
    c.beginPath();
    c.moveTo(-1.6 * k, 1.6 * k);
    c.lineTo(1.6 * k, -1.6 * k);
    c.stroke();
  },
  bell(c, k, shade) {
    c.fillStyle = shade(BRASS);
    c.beginPath();
    c.moveTo(-3.4 * k, 2 * k);
    c.quadraticCurveTo(-2.6 * k, -3.4 * k, 0, -3.4 * k);
    c.quadraticCurveTo(2.6 * k, -3.4 * k, 3.4 * k, 2 * k);
    c.closePath();
    c.fill();
    c.strokeStyle = shade(DARK);
    c.lineWidth = 0.6 * k;
    c.stroke();
    c.fillStyle = shade(DARK);
    c.beginPath();
    c.arc(0, 2.4 * k, 1 * k, 0, TAU);
    c.fill();
  },
  button(c, k, shade) {
    c.fillStyle = shade([226, 214, 190]);
    c.strokeStyle = shade(DARK);
    c.lineWidth = 0.6 * k;
    c.beginPath();
    c.arc(0, 0, 2.8 * k, 0, TAU);
    c.fill();
    c.stroke();
    c.fillStyle = shade(DARK);
    for (const [dx, dy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ])
      c.fillRect((dx * 0.8 - 0.35) * k, (dy * 0.8 - 0.35) * k, 0.7 * k, 0.7 * k);
  },
  glasses(c, k, shade) {
    c.strokeStyle = shade(DARK);
    c.lineWidth = 0.9 * k;
    c.beginPath();
    c.arc(-2.6 * k, 0, 2 * k, 0, TAU);
    c.moveTo(4.6 * k, 0);
    c.arc(2.6 * k, 0, 2 * k, 0, TAU);
    c.moveTo(-0.6 * k, -0.4 * k);
    c.quadraticCurveTo(0, -1.2 * k, 0.6 * k, -0.4 * k);
    c.stroke();
  },
  feather(c, k, shade) {
    c.fillStyle = shade([236, 232, 222]);
    c.beginPath();
    c.moveTo(-6 * k, 1.2 * k);
    c.quadraticCurveTo(-1 * k, -3.4 * k, 5 * k, -1 * k);
    c.quadraticCurveTo(0, 1.6 * k, -6 * k, 1.2 * k);
    c.fill();
    c.strokeStyle = shade([150, 140, 128]);
    c.lineWidth = 0.5 * k;
    c.beginPath();
    c.moveTo(-7 * k, 1.6 * k);
    c.lineTo(4.6 * k, -0.9 * k);
    c.stroke();
  },
};
