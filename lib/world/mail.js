// A letter from the winged trader. On a day the visitor comes back with a letter owed to them, the trader comes over
// the island a little after the world wakes and drops one, and it flutters down to lean against the arch to nowhere,
// where hovering reads it. The page keeps the letters and knows which one this is; this only brings it and shows where
// it is.

import { TAU, dab, lerp, mixc, rgba, sprite } from "./core";
import { D_ISLE } from "./layers";
import { SHIP_PER, shipAt, shipU } from "./depth";
import { ease } from "./story";
import { LAMP } from "./whimsy";
import { gust } from "./wind";

// How long after it is sent for the trader is over the arch, and how long its letter takes to flutter down, in seconds.
const COME = 40,
  FALL = 6;
const PAPER = [240, 232, 214],
  SEAL = [184, 70, 56];

// `st` is "due" while the trader has yet to bring the letter, "falling" on its way down, "lying" once it leans against
// the arch, and null on a day with no letter. It leans on the outside of the arch's right pillar, at `x` on the turf.
// On a phone it is drawn larger than the island around it, so it can be seen and tapped.
export function makeMail(K, st) {
  const k = K.phone ? 1 : Math.max(K.s, 0.7),
    x = K.arch.x2 + K.arch.pw / 2 + 7 * k;
  return { st, k, x, y: K.isle.topAt(x), from: { x: 0, y: 0 }, f: 0, landed: false };
}

// Sends for the trader: its next crossing comes over the arch `COME` seconds from now.
export function bringMail(Lf, K) {
  const over = shipU(K, Lf.mail.x) * (SHIP_PER / 1.6);
  Lf.depth.ship = (((over - Lf.t - COME) % SHIP_PER) + SHIP_PER) % SHIP_PER;
}

// Once the trader is over the arch, the letter drops from under its keel. `fromSky` says where a place in the high sky
// stands on the island's layer, so the letter starts from just where the trader is seen. Landing, it tells the page.
export function updateMail(Lf, K, dt, fromSky) {
  const M = Lf.mail;
  if (M.st === "due") {
    const at = shipAt(Lf, K, Lf.t);
    if (!at || at.x > M.x) return;
    M.from = fromSky(at.x, at.y + (K.phone ? 14 : 22) * K.s);
    M.st = "falling";
  } else if (M.st === "falling" && (M.f += dt / FALL) >= 1) {
    M.st = "lying";
    M.landed = true;
    Lf.sfx.push(["pressed", M.x]);
  }
}

export function drawMail(c, Lf, K, P, t) {
  const M = Lf.mail;
  if (M.st !== "falling" && M.st !== "lying") return;
  const { k } = M,
    w = 15 * k,
    h = 10 * k;
  let x, y, rot;
  if (M.st === "falling") {
    // It swings from side to side like a leaf, less as it nears the ground, and comes to rest against the pillar.
    const sw = Math.sin(M.f * TAU * 2.5) * (1 - M.f);
    x = lerp(M.from.x, M.x, ease(M.f)) + sw * 24 * k;
    y = lerp(M.from.y, M.y - h * 0.45, M.f);
    rot = sw * 0.8 - 0.3 * ease(M.f);
  } else {
    // Its free corner lifts a little in a gust.
    x = M.x;
    y = M.y - h * 0.45;
    rot = -0.3 + Math.abs(gust(Lf.wind, K, M.x)) * 0.06 * Math.sin(t * 13);
  }
  c.save();
  c.translate(x, y);
  c.rotate(rot);
  if (P.night) {
    c.globalCompositeOperation = "lighter";
    dab(c, sprite(LAMP), 0, 0, w * 1.4, 0.22);
    c.globalCompositeOperation = "source-over";
  }
  c.fillStyle = rgba(P.night ? mixc(PAPER, [52, 60, 84], 0.5) : PAPER);
  c.fillRect(-w / 2, -h / 2, w, h);
  // The flap, and its seal.
  c.strokeStyle = rgba(P.night ? [92, 92, 104] : [176, 162, 140]);
  c.lineWidth = 0.8 * k;
  c.beginPath();
  c.moveTo(-w / 2, -h / 2);
  c.lineTo(0, h * 0.12);
  c.lineTo(w / 2, -h / 2);
  c.stroke();
  c.fillStyle = rgba(P.night ? mixc(SEAL, [40, 40, 60], 0.4) : SEAL);
  c.beginPath();
  c.arc(0, h * 0.12, 1.7 * k, 0, TAU);
  c.fill();
  c.restore();
  // Its reach is little more than the envelope, smaller than the bells hiding in the grass beside it, so pointing at it
  // names the letter.
  if (M.st === "lying") Lf.hits.push(["mail", x, y, 10 * k, D_ISLE]);
}
