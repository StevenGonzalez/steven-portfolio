// The world dreaming. Asleep for a couple of minutes, it dreams of what the visitor looked at on this visit: a soft
// round picture of each thing, taken from the world as it looked when the visitor hovered it, drifts one after
// another across the high sky behind the island, faint as a memory. Anything stirring wakes the world, and the dreams
// fade away.

import { clamp, dab, sprite } from "./core";

// How long the world has to sleep before it dreams, in seconds of its own time, which runs slower asleep.
const DREAM = 70;

export function makeDream() {
  return { asleep: 0, next: 0, i: 0, ghosts: [] };
}

/** `memories` are the pictures, in the order the visitor found the things in them. */
export function updateDream(Lf, K, memories, dt) {
  const D = Lf.dream,
    rnd = Math.random,
    ss = Math.max(K.s, 0.7);
  D.asleep = Lf.doze >= 1 ? D.asleep + dt : 0;
  const on = D.asleep > DREAM && memories.length > 0;
  for (const g of D.ghosts) {
    g.x += g.vx * dt;
    g.ph += dt * 0.5;
    g.a = on ? Math.min(1, g.a + dt / 5) : Math.max(0, g.a - dt / 0.8);
  }
  D.ghosts = D.ghosts.filter((g) => g.a > 0 && g.x > -K.EX - g.r);
  if (!on) {
    D.next = 0;
    return;
  }
  if ((D.next -= dt) > 0) return;
  D.next = 10 + rnd() * 6;
  const r = (70 + rnd() * 25) * ss;
  D.ghosts.push({
    img: memories[D.i++ % memories.length],
    x: K.WU + K.EX + r,
    y: 70 + rnd() * 150,
    vx: -(16 + rnd() * 6) * ss,
    r,
    ph: rnd() * 6,
    a: 0,
  });
}

// The dreams, in the high sky's units, on the back layer: each picture with a faint glow about it, bobbing gently as
// it drifts.
export function drawDream(c, Lf, K, P) {
  const D = Lf.dream;
  if (!D.ghosts.length) return;
  const gs = sprite(P.light);
  for (const g of D.ghosts) {
    const y = g.y + Math.sin(g.ph) * 14,
      a = g.a * clamp((g.x + K.EX + g.r) / (g.r * 2), 0, 1);
    c.globalCompositeOperation = "lighter";
    dab(c, gs, g.x, y, g.r * 1.5, 0.18 * a);
    c.globalCompositeOperation = "source-over";
    c.globalAlpha = 0.55 * a;
    c.drawImage(g.img, g.x - g.r, y - g.r, g.r * 2, g.r * 2);
    c.globalAlpha = 1;
  }
}
