// The arrival. On first load the world opens with only its places and its weather, and the travellers turn up one at a
// time over the first minute, each from wherever it would normally come from. Without this every creature is already
// on screen at once. A resize rebuilds the world without it, so nothing leaves and comes back.

// Every time below is in seconds after the world first moves.
export function stagger(Lf, K) {
  const { WU, EX, HZ } = K,
    D = Lf.depth,
    S = Lf.wh,
    t = Lf.t;
  const [grove, mid, near] = Lf.whales;

  // Most travellers come in over the right edge, and they are slow, so ones that set off close together would catch
  // each other up and arrive in a heap there. Each waits until the last is well in: the flock first, then the grove
  // whale and the mantas. Only two of the big ones are out at once (`skyFull`), so the leviathan, the near whale and
  // the far whale queue behind those two and come in as they leave. The leviathan and the balloon turn round when
  // their wait ends, so each is pointed away from the side it comes in from.
  Lf.flockIn = t + 3;
  Object.assign(grove, { x: WU + EX + grove.L * 0.2, wait: 10 });
  Object.assign(Lf.mantas, { x: WU + EX + Lf.mantas.S * 2, wait: 22 });
  Object.assign(S.bal, { dir: 1, wait: 30 });
  Object.assign(D.lev, { dir: -1, wait: 34 });
  Object.assign(near, { x: WU + EX + near.L * 0.2, wait: 42 });
  Object.assign(mid, { x: WU + EX + mid.L * 0.2, wait: 54 });

  // Risers come up from below one by one: jellies out of the cloud sea, lanterns from under the haze they fade in at,
  // and bubbles from below the bottom of the screen.
  Lf.jellies.forEach((j, i) => Object.assign(j, { y: HZ + 40, wait: 3 + i * 3.5 }));
  D.lanterns.forEach((l, i) => (l.y = 720 - l.vy * (2 + i * 2.5)));
  S.bubbles.forEach((b, i) => (b.y = 1000 + EX + 30 + b.vy * (4 + i * 4)));
  Lf.critters.fish.forEach((f, i) => (f.wait = 9 + i * 4));

  // The island's small folk: dandelions sprout, moths come out of the tree to the lanterns, sheep gather into their
  // cloud, and the snails, who were there all along, finally look out of their shells.
  const Cr = Lf.critters;
  Cr.folk.forEach((f, i) => Object.assign(f, { st: "grow", k: 0, wait: 6 + i * 1.3 }));
  Cr.moths.forEach((m, i) => Object.assign(m, { wait: 19 + i * 2.2, x: K.tree.cx, y: K.tree.cy, vx: 0, vy: 0 }));
  Cr.sheep.forEach((o, i) => Object.assign(o, { wait: 29 + i * 1.6, a: 0 }));
  Cr.snails.forEach((n, i) => Object.assign(n, { st: "in", hide: 1, hold: 34 + i * 3 }));

  // The one-off events hold back until the world has filled in.
  Lf.koiWait = 13;
  D.meteor.wait = 15;
  S.door.next = t + 16;
  Lf.call.next = t + 26;
  // The ship's crossings are a clock on t; this puts its first one about 45 seconds in.
  D.ship = 240 - ((t + 45) % 240);
  Lf.serpent.wait = 55;
}
