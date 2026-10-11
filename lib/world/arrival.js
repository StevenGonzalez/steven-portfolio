// The arrival. On first load the world opens with only its places and its weather, and the travellers turn up one at a
// time over the first minute, each from wherever it would normally come from. Without this every creature is already
// on screen at once. A resize rebuilds the world without it, so nothing leaves and comes back.

// Every time below is in seconds after the world first moves.
export function stagger(Lf, K) {
  const { WU, EX, HZ } = K, D = Lf.depth, S = Lf.wh, t = Lf.t;
  const [grove, , near] = Lf.whales;

  // Swimmers wait just past the right edge and set off on cue.
  Object.assign(grove, { x: WU + EX + grove.L * .2, wait: 2 });
  Lf.flockIn = t + 5;
  // The leviathan and the balloon turn round when their wait ends, so they are pointed away to come in from the right.
  Object.assign(D.lev, { dir: 1, wait: 8 });
  Object.assign(S.bal, { dir: 1, wait: 12 });
  Object.assign(near, { x: WU + EX + near.L * .2, wait: 17 });
  Object.assign(Lf.mantas, { x: WU + EX + Lf.mantas.S * 2, wait: 22 });

  // Risers come up from below one by one: jellies out of the cloud sea, lanterns from under the haze they fade in at,
  // and bubbles from below the bottom of the screen.
  Lf.jellies.forEach((j, i) => Object.assign(j, { y: HZ + 40, wait: 3 + i * 3.5 }));
  D.lanterns.forEach((l, i) => (l.y = 720 - l.vy * (2 + i * 2.5)));
  S.bubbles.forEach((b, i) => (b.y = 1000 + EX + 30 + b.vy * (4 + i * 4)));
  Lf.critters.fish.forEach((f, i) => (f.wait = 9 + i * 4));

  // The one-off events hold back until the world has filled in.
  Lf.koiWait = 13;
  D.meteor.wait = 15;
  S.door.next = t + 16;
  Lf.call.next = t + 26;
  // The ship's crossings are a clock on t; this puts its first one about 45 seconds in.
  D.ship = 240 - ((t + 45) % 240);
  Lf.serpent.wait = 55;
}
