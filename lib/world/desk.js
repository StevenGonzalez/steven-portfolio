// Behind the arch to nowhere. Knock on it and the opening parts onto a desk late at night, with this world on the
// monitor: the desk it was made at. Knock again, or leave it a while, and it is just an arch.

import { clamp, dab, ell, rgba, sprite } from './core';
import { D_ISLE } from './layers';

const OPEN_FOR = 45;
const WARM = [255, 196, 128], COOL = [150, 196, 255];

export const makeDesk = () => ({ on: false, o: 0, left: 0, view: null });

// Whether a point on the island layer is on the arch: its pillars, its span or the opening between them.
export function onArch(K, x, y) {
  const { x1, x2, pw, my, rr } = K.arch;
  return x > x1 - pw && x < x2 + pw && y > my - rr && y < K.isle.topAt(x) + 4 * K.s;
}

export function knock(Lf) {
  const D = Lf.desk;
  D.on = !D.on;
  D.left = OPEN_FOR;
}

export function updateDesk(Lf, dt) {
  const D = Lf.desk;
  if (D.on && (D.left -= dt) <= 0) D.on = false;
  D.o = clamp(D.o + dt * (D.on ? .8 : -1.2), 0, 1);
}

// The opening between the pillars and under the span, with the floor following the turf. `e` narrows it to a slit
// around the middle while it parts.
function opening(K, e) {
  const { s, isle } = K, { x1, x2, pw, mx, my, rr } = K.arch, rin = rr - 11 * s;
  const L = x1 + pw / 2, R = x2 - pw / 2, cap = pw * .7, p = new Path2D();
  p.moveTo(L, isle.topAt(L));
  for (let i = 1; i <= 6; i++) p.lineTo(L + (R - L) * i / 6, isle.topAt(L + (R - L) * i / 6));
  p.lineTo(R, my + 5 * s);
  p.lineTo(x2 - cap, my + 5 * s);
  p.lineTo(x2 - cap, my);
  p.arc(mx, my, rin, 0, Math.PI, true);
  p.lineTo(x1 + cap, my);
  p.lineTo(x1 + cap, my + 5 * s);
  p.lineTo(L, my + 5 * s);
  p.closePath();
  const half = rin * e, slit = new Path2D();
  slit.rect(mx - half, my - rin - 5 * s, half * 2, isle.topAt(mx) - my + rin + 20 * s);
  return [p, slit];
}

export function drawDesk(c, Lf, K, P, t) {
  const D = Lf.desk;
  if (D.o <= 0) return;
  const { s } = K, { mx, my, rr } = K.arch, fl = K.isle.topAt(mx), e = D.o * D.o * (3 - 2 * D.o);
  const [hole, slit] = opening(K, e);
  c.save();
  c.clip(hole);
  c.clip(slit);
  c.translate(mx, fl);
  c.scale(s, s);
  const lamp = clamp((D.o - .4) / .6, 0, 1) * (1 - .06 * Math.sin(t * 13) * Math.sin(t * 3.1));

  // Wall, warmed around the lamp.
  const wall = c.createRadialGradient(-12, -56, 0, -12, -56, 95);
  wall.addColorStop(0, rgba([84, 64, 52]));
  wall.addColorStop(.45, rgba([36, 34, 52]));
  wall.addColorStop(1, rgba([14, 16, 30]));
  c.fillStyle = wall;
  c.fillRect(-40, -150, 80, 160);

  // A window onto a starry night, high on the wall.
  c.fillStyle = rgba([10, 16, 36]);
  c.fillRect(-9, -123, 18, 22);
  for (const [x, y] of [[-6, -119], [-2, -113], [4, -120], [6, -108], [-5, -105]]) dab(c, sprite([230, 236, 255]), x, y, 1.1, .9);
  c.fillStyle = rgba([238, 232, 210]);
  c.beginPath();
  c.arc(3, -114, 3, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = rgba([10, 16, 36]);
  c.beginPath();
  c.arc(4.4, -115, 2.6, 0, Math.PI * 2);
  c.fill();
  c.strokeStyle = rgba([58, 46, 44]);
  c.lineWidth = 1.4;
  c.strokeRect(-9, -123, 18, 22);
  c.beginPath();
  c.moveTo(0, -123);
  c.lineTo(0, -101);
  c.moveTo(-9, -112);
  c.lineTo(9, -112);
  c.stroke();

  // Floor, desk and chair.
  c.fillStyle = rgba([30, 24, 26]);
  c.fillRect(-40, -8, 80, 20);
  c.fillStyle = rgba([58, 40, 32]);
  c.fillRect(-25, -32, 2.4, 26);
  c.fillRect(22.6, -32, 2.4, 26);
  c.fillStyle = rgba([104, 72, 50]);
  c.fillRect(-40, -36, 80, 4);
  c.fillStyle = rgba([150, 110, 76]);
  c.fillRect(-40, -36, 80, .8);

  // The monitor, with this world on it.
  c.fillStyle = rgba([16, 16, 20]);
  c.fillRect(6, -45, 2, 9.5);
  const foot = new Path2D();
  ell(foot, 7, -36, 6, 1.1, 0);
  c.fill(foot);
  c.fillRect(-7.2, -61.2, 28.4, 18.4);
  if (D.view) c.drawImage(D.view, -6, -60, 26, 16);
  c.globalCompositeOperation = 'lighter';
  dab(c, sprite(COOL), 7, -52, 34, .22);
  dab(c, sprite(COOL), 7, -36, 18, .14);

  // The lamp, and the cold coffee in its light.
  dab(c, sprite(WARM), -11, -56, 46, .5 * lamp);
  dab(c, sprite(WARM), -14, -36, 16, .45 * lamp);
  dab(c, sprite(WARM), -11, -57, 4, .95 * lamp);
  c.globalCompositeOperation = 'source-over';
  c.fillStyle = rgba([36, 32, 30]);
  c.strokeStyle = rgba([36, 32, 30]);
  c.lineWidth = 1.3;
  c.beginPath();
  c.moveTo(-21, -36);
  c.lineTo(-23, -53);
  c.lineTo(-14, -60);
  c.stroke();
  const shade = new Path2D();
  shade.moveTo(-17, -62);
  shade.lineTo(-11, -64);
  shade.lineTo(-7, -56.5);
  shade.lineTo(-13, -55);
  shade.closePath();
  ell(shade, -21, -36, 4.5, 1.2, 0);
  c.fill(shade);
  c.fillStyle = rgba([212, 200, 186]);
  c.fillRect(-15, -40.5, 4.2, 4.6);
  c.strokeStyle = rgba([212, 200, 186]);
  c.lineWidth = .9;
  c.beginPath();
  c.arc(-15.4, -38.3, 1.5, Math.PI / 2, Math.PI * 1.5);
  c.stroke();
  c.fillStyle = rgba([58, 38, 28]);
  c.fillRect(-14.6, -40.5, 3.4, .9);

  // A chair, pushed back from the desk.
  c.fillStyle = rgba([24, 20, 24]);
  c.fillRect(0, -20, 15, 2.6);
  c.fillRect(13.4, -46, 2.6, 46);
  c.fillRect(1, -18, 1.8, 18);
  c.restore();

  // Soft shadow where the stone meets the room, and a seam of light while it parts.
  c.save();
  c.clip(hole);
  c.strokeStyle = rgba([0, 0, 0], .45);
  c.lineWidth = 6 * s;
  c.stroke(hole);
  c.restore();
  if (e < 1) {
    c.globalCompositeOperation = 'lighter';
    const half = (rr - 11 * s) * e, mid = (fl + my) / 2;
    for (const x of [mx - half, mx + half]) dab(c, sprite(WARM), x, mid, 60 * s, .35 * (1 - e) + .1);
    c.globalCompositeOperation = 'source-over';
  }
  // Small circles tile the opening, so the room is named anywhere in it ahead of the bells and turf in front.
  if (D.o > .6) for (let y = fl - 8 * s; y > my - 20 * s; y -= 16 * s) for (const dx of [-12, 0, 12]) Lf.hits.push(['desk', mx + dx * s, y, 12 * s, D_ISLE, true]);
}
