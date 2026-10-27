// A little sky boat tied up off the end of the island, rocking on its rope. Clicked, it casts off, puts up its sail and
// goes off toward the lighthouse at the edge of the world, and the page follows it there. A world held still for
// reduced motion lets the page go straight away.

import { TAU, dab, lerp, mixc, rgba, sprite } from "./core";
import { D_ISLE } from "./layers";
import { ease } from "./story";
import { LAMP } from "./whimsy";

// How long it takes to sail out of sight, in seconds. The page waits this long before it follows.
export const SAIL = 2.6;

const HULL = [96, 64, 46],
  SAILS = [238, 228, 206];

// Off the island's end, where its rope is tied to a stake in the turf. On a phone the end is off the screen, so it hangs
// under the edge left of the waterfall instead, its rope tied to the rock above. It is drawn a little larger than the
// island around it on a small one, so it can be seen and tapped.
export function makeBoat(K) {
  const { s, isle } = K,
    k = K.phone ? 1.1 : Math.max(s, 0.75) * 1.25,
    tip = isle.x0 + isle.w;
  if (!K.phone) {
    const px = tip - 10 * s;
    return { k, x: tip + 36 * k, y: isle.topAt(px) + 14 * k, tie: [px, isle.topAt(px) - 7 * s], stake: true, t0: -1 };
  }
  const x = K.falls[1].x - 46 * k,
    px = x - 8 * k;
  return { k, x, y: isle.underAt(x) + 26 * k, tie: [px, isle.underAt(px) - 2], stake: false, t0: -1 };
}

// Casts off. It sails from the next frame on.
export function castOff(Lf) {
  if (Lf.boat.t0 < 0) Lf.boat.t0 = Lf.t;
}

// The boat itself at (x, y), `z` times its size, tipped by `rot`, with its sail up by `up` from 0 to 1.
function hull(c, x, y, z, rot, up, P) {
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  c.scale(z, z);
  const wood = P.night ? mixc(HULL, [36, 34, 52], 0.6) : HULL,
    cloth = P.night ? mixc(SAILS, [70, 76, 104], 0.55) : SAILS;
  // The mast, and the sail: furled along the boom, or filled and leaning into the wind.
  c.strokeStyle = rgba(mixc(wood, [0, 0, 0], 0.3));
  c.lineWidth = 1.4;
  c.beginPath();
  c.moveTo(-2, -3);
  c.lineTo(-2, -30);
  c.stroke();
  c.fillStyle = rgba(cloth);
  c.beginPath();
  if (up > 0) {
    const h = 26 * up,
      b = 6 * up;
    c.moveTo(-1, -4);
    c.lineTo(-1, -4 - h);
    c.quadraticCurveTo(10 + b, -4 - h * 0.45, 14, -5);
    c.closePath();
  } else c.ellipse(4, -6, 8, 2.2, 0, 0, TAU);
  c.fill();
  // The hull, a deep curved boat, lit along its gunwale.
  c.fillStyle = rgba(wood);
  c.beginPath();
  c.moveTo(-20, -6);
  c.quadraticCurveTo(-16, 6, 0, 6);
  c.quadraticCurveTo(16, 6, 21, -7);
  c.closePath();
  c.fill();
  c.strokeStyle = rgba(mixc(wood, P.night ? [150, 150, 190] : [240, 200, 150], 0.45));
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(-20, -6);
  c.lineTo(21, -7);
  c.stroke();
  // A lantern on the stern, lit after dark.
  c.fillStyle = rgba(LAMP, P.night ? 1 : 0.8);
  c.fillRect(-19, -12, 3, 4);
  if (P.night) {
    c.globalCompositeOperation = "lighter";
    dab(c, sprite(LAMP), -17.5, -10, 12, 0.35);
  }
  c.restore();
}

export function drawBoat(c, Lf, K, P, t) {
  const B = Lf.boat,
    { k } = B;
  const go = B.t0 < 0 ? 0 : (Lf.t - B.t0) / SAIL;
  if (go >= 1) return;
  // Moored, it rocks on the rope, and hovering shows where it can be clicked.
  if (go === 0) {
    const bob = Math.sin(t * 1.3) * 1.5 * k,
      rot = Math.sin(t * 0.9) * 0.04,
      bow = [B.x - 19 * k, B.y - 6 * k + bob];
    if (B.stake) {
      c.fillStyle = rgba(P.night ? [30, 28, 40] : [70, 50, 38]);
      c.fillRect(B.tie[0] - 1.2 * k, B.tie[1], 2.4 * k, 9 * k);
    }
    c.strokeStyle = rgba(P.night ? [120, 120, 150] : [150, 120, 90], 0.9);
    c.lineWidth = 0.8 * k;
    c.beginPath();
    c.moveTo(B.tie[0], B.tie[1] + 1);
    c.quadraticCurveTo((B.tie[0] + bow[0]) / 2, Math.max(B.tie[1], bow[1]) + 8 * k, bow[0], bow[1]);
    c.stroke();
    hull(c, B.x, B.y + bob, k, rot, 0, P);
    Lf.hits.push(["boat", B.x, B.y - 10 * k, 26 * k, D_ISLE]);
    return;
  }
  // Casting off: the sail goes up in the first fifth, then it heads out and up, away into the haze, growing smaller.
  const up = Math.min(1, go * 5),
    q = ease(Math.max(0, (go - 0.15) / 0.85)),
    toX = K.phone ? K.WU + 60 : K.WU * 0.97,
    toY = K.phone ? B.y - 160 : K.HZ - 60,
    z = lerp(k, k * 0.12, q);
  c.save();
  c.globalAlpha = 1 - Math.max(0, (go - 0.75) / 0.25);
  hull(c, lerp(B.x, toX, q), lerp(B.y, toY, q) + Math.sin(go * TAU) * 3 * k, z, -0.08 * up, up, P);
  c.restore();
}
