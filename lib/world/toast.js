// A little campfire on the turf, with somebody's marshmallows beside it. A press and hold on the fire holds one over
// the flame on a stick: it goes golden, then brown, and held too long it catches fire. Letting go eats it, however it
// came out. A world held still for reduced motion toasts one golden at a press.

import { dab, mixc, rgba, sprite } from './core';
import { D_ISLE } from './layers';
import { FIRE, FIRE_CORE } from './depth';
import { campfire } from './band';

// How long a marshmallow has been held over the fire, in seconds, when it is golden, when it starts to brown, and when
// it catches fire.
const GOLDEN = 2.2, BROWN = 3.6, CATCH = 6;
const WHITE = [250, 246, 238], GOLD = [236, 178, 96], BROWNED = [150, 90, 44], BURNT = [44, 32, 28];

// The fire sits right of the tree, between the trunk and the jar; on a phone the kite lies there, so it sits left. A
// visitor's own tree planted there first keeps its spot, and the fire goes to the other side.
export function makeToast(K, tree) {
  const { s, isle, iw } = K, u = (K.phone ? [.36, .6] : [.62, .36]).find(u => !tree || Math.abs(u - tree.u) > .07), x = isle.x0 + iw * u;
  return { x, y: isle.topAt(x) + 1.5 * s, on: false, held: 0, out: 0, q: 0, col: WHITE, crackle: 0 };
}

// Where the fire can be pressed and named, on the island's layer, as [x, y, radius].
export const fireSpot = (Lf, K) => [Lf.toast.x, Lf.toast.y - 9 * K.s, 22 * Math.max(K.s, .7)];

function colour(h) {
  if (h < GOLDEN) return mixc(WHITE, GOLD, h / GOLDEN);
  if (h < BROWN) return GOLD;
  if (h < CATCH) return mixc(GOLD, BROWNED, (h - BROWN) / (CATCH - BROWN));
  return mixc(BROWNED, BURNT, Math.min(1, (h - CATCH) / 2.5));
}

// A press on the fire puts a marshmallow on to toast. Held still, it is golden straight away.
export function toast(Lf, still) {
  const T = Lf.toast;
  Object.assign(T, { on: true, held: still ? GOLDEN + .5 : 0, out: 0, crackle: .2 });
}

// Letting go eats it: 0 for one barely warm, 1 for one nicely toasted, and 2 for one that caught fire or nearly did.
export function eat(Lf, still) {
  const T = Lf.toast;
  if (!T.on) return;
  T.on = false;
  T.q = T.held < 1.2 ? 0 : T.held < CATCH - .6 ? 1 : 2;
  T.col = colour(T.held);
  T.out = still ? 0 : 1;
  Lf.sfx.push(['eat', T.x, T.q]);
}

export function updateToast(Lf, dt) {
  const T = Lf.toast;
  T.out = Math.max(0, T.out - dt / .7);
  if (!T.on) return;
  const was = T.held;
  T.held += dt;
  if (was < CATCH && T.held >= CATCH) Lf.sfx.push(['catch', T.x]);
  // Little pops and spits from the fire while it toasts.
  if ((T.crackle -= dt) < 0) {
    T.crackle = .25 + Math.random() * .5;
    Lf.sfx.push(['sizzle', T.x]);
  }
}

// The fire and everything round it are drawn this much bigger than the island's scale, to be seen at all.
const BIG = 1.6;

// Where the marshmallow is on the end of the stick, and where the stick is held, for the fire T. The hand holding
// it shakes a little.
function stick(T, K, t) {
  const s = K.s * BIG, w = Math.sin(t * 2.3) * .6 * s + Math.sin(t * 5.1) * .25 * s;
  return [T.x + 2 * s, T.y - 10 * s + w, T.x + 32 * s, T.y - 16 * s + w * .3];
}

export function drawToast(c, Lf, K, P, t) {
  const T = Lf.toast, s = K.s * BIG;
  // Somebody's marshmallows, in a little paper bag beside the fire.
  const bx = T.x - 13 * s, by = T.y;
  c.fillStyle = rgba(P.night ? [120, 104, 92] : [214, 198, 172]);
  c.beginPath();
  c.moveTo(bx - 3 * s, by);
  c.lineTo(bx - 2.6 * s, by - 6 * s);
  c.lineTo(bx + 2.6 * s, by - 6.4 * s);
  c.lineTo(bx + 3 * s, by);
  c.fill();
  c.fillStyle = rgba(P.night ? [196, 190, 182] : WHITE);
  c.beginPath();
  c.ellipse(bx - .9 * s, by - 6.6 * s, 1.5 * s, 1.1 * s, 0, 0, Math.PI * 2);
  c.ellipse(bx + 1.2 * s, by - 7 * s, 1.5 * s, 1.1 * s, .3, 0, Math.PI * 2);
  c.fill();
  // A ring of stones round the fire.
  c.fillStyle = rgba(P.night ? [58, 60, 70] : [126, 122, 120]);
  for (const [dx, r] of [[-7.5, 1.9], [-4, 1.6], [4.2, 1.7], [7.6, 2]]) {
    c.beginPath();
    c.ellipse(T.x + dx * s, T.y - .6 * s, r * s, r * .75 * s, 0, 0, Math.PI * 2);
    c.fill();
  }
  const hot = T.on ? 1.15 : 1;
  campfire(c, T.x, T.y - .5 * s, 1.9 * s, hot, t, 0, P, Lf.hover === 'toast' || T.on);
  Lf.hits.push(['toast', ...fireSpot(Lf, K), D_ISLE]);
  if (!T.on && T.out <= 0) return;
  // The stick, and the marshmallow on the end of it while it is being toasted. Eaten, the stick goes away empty.
  const [mx, my, hx, hy] = stick(T, K, t), a = T.on ? 1 : T.out;
  c.strokeStyle = rgba([92, 64, 44], a);
  c.lineWidth = 1.1 * s;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(mx + 1.5 * s, my);
  c.lineTo(hx, hy);
  c.stroke();
  if (!T.on) {
    // A golden one leaves a little twinkle behind, and a burnt one a puff of smoke.
    const u = 1 - T.out;
    if (T.q === 1) {
      c.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 4; i++) dab(c, sprite(FIRE_CORE), mx + Math.cos(i * 1.7) * 6 * s * u, my - 4 * s * u + Math.sin(i * 1.7) * 4 * s * u, 1.4 * s, .8 * T.out);
      c.globalCompositeOperation = 'source-over';
    } else if (T.q === 2) {
      c.fillStyle = rgba([90, 86, 92], .35 * T.out);
      for (let i = 0; i < 3; i++) {
        c.beginPath();
        c.arc(mx + (i - 1) * 2 * s, my - (3 + 8 * u + i * 2) * s, (1.6 + 2 * u) * s, 0, Math.PI * 2);
        c.fill();
      }
    }
    return;
  }
  const col = colour(T.held), w = 2.4 * s, h = 2 * s;
  c.fillStyle = rgba(col);
  c.beginPath();
  c.roundRect(mx - w, my - h, w * 2, h * 2, 1.2 * s);
  c.fill();
  // The toasted side faces the flame, below.
  c.fillStyle = rgba(mixc(col, BURNT, .25), .6);
  c.beginPath();
  c.roundRect(mx - w, my + h * .2, w * 2, h * .8, [0, 0, 1.2 * s, 1.2 * s]);
  c.fill();
  if (T.held >= CATCH) {
    // On fire: a flame of its own on top, flickering.
    const f = .8 + .2 * Math.sin(t * 13) * Math.sin(t * 8.1), fh = 7 * s * f;
    c.globalCompositeOperation = 'lighter';
    dab(c, sprite(FIRE), mx, my - 3 * s, 9 * s, .6);
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = rgba([255, 184, 96], .95);
    c.beginPath();
    c.moveTo(mx - w * .8, my - h * .6);
    c.quadraticCurveTo(mx - w * .6, my - h - fh * .6, mx + Math.sin(t * 6) * s, my - h - fh);
    c.quadraticCurveTo(mx + w * .6, my - h - fh * .6, mx + w * .8, my - h * .6);
    c.fill();
  }
}
