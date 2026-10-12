// The world keeps the visitor's calendar: leaves come off the lantern tree in autumn, blossom blows off it in spring,
// and snow falls in winter. Summer is the world as it always is.

import { PAL, TAU, clamp, dab, mixc, rgba, sprite } from './core';

const LEAVES = [[214, 110, 52], [232, 160, 64], [178, 72, 48], [240, 196, 90]];
const PETALS = [[255, 190, 206], [255, 222, 230], [246, 168, 190]];

/** The season for a date, in the northern hemisphere: winter is December to February. */
export function seasonOf(date) {
  const m = date.getMonth();
  return m === 11 || m < 2 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'autumn';
}

// How each season recolours the leaves, over the theme's own: turned leaves in autumn, blossom in spring and frost in
// winter. At night the leaves' glow changes colour instead.
const TINTS = {
  autumn: { dusk: { leafMid: [124, 92, 46], leafLit: [255, 184, 96] }, night: { leafMid: [40, 40, 40], leafLit: [236, 168, 100] } },
  spring: { dusk: { leafMid: [70, 118, 84], leafLit: [255, 214, 222] }, night: { leafLit: [236, 164, 214] } },
  winter: { dusk: { leafMid: [70, 98, 98], leafLit: [240, 244, 240] }, night: { leafLit: [200, 232, 255] } },
};

/** The theme's palette, recoloured for the season. */
export function palette(night, season) {
  const P = night ? PAL.night : PAL.dusk;
  return { ...P, ...TINTS[season]?.[night ? 'night' : 'dusk'] };
}

// Something that falls from the tree's crown: a leaf or a petal. Spread through its fall at the start, so the first
// frame already looks like it has been going a while.
function fromTree(K, rnd, spread) {
  const T = K.tree, a = rnd() * TAU, r = Math.sqrt(rnd()) * T.r * .75;
  return {
    x: T.cx + Math.cos(a) * r, y: T.cy + Math.sin(a) * r * .6 + (spread ? rnd() * (K.HZ - T.cy) : 0),
    vy: 18 + rnd() * 16, sway: 14 + rnd() * 22, ph: rnd() * TAU, spin: 2 + rnd() * 3, size: (4 + rnd() * 3) * K.s, col: rnd(),
  };
}

function flake(K, rnd, spread) {
  return {
    x: -K.EX + rnd() * (K.WU + K.EX * 2), y: spread ? -K.EX + rnd() * (1000 + K.EX * 2) : -K.EX - rnd() * 60,
    vy: 22 + rnd() * 30, sway: 6 + rnd() * 14, ph: rnd() * TAU, size: 2.5 + rnd() * rnd() * 6,
  };
}

export function makeSeason(K, name) {
  const rnd = Math.random, S = { name, bits: [] };
  if (name === 'autumn') for (let i = 0; i < 26; i++) S.bits.push(fromTree(K, rnd, true));
  if (name === 'spring') for (let i = 0; i < 36; i++) S.bits.push(fromTree(K, rnd, true));
  if (name === 'winter') for (let i = 0; i < (K.phone ? 90 : 180); i++) S.bits.push(flake(K, rnd, true));
  return S;
}

export function updateSeason(S, K, dt) {
  const rnd = Math.random;
  S.bits.forEach((b, i) => {
    b.ph += dt * (S.name === 'winter' ? .8 : 1.6);
    b.y += b.vy * dt;
    b.x += Math.cos(b.ph) * b.sway * dt + (S.name === 'winter' ? 0 : 9 * dt);
    if (S.name === 'winter' ? b.y > 1000 + K.EX : b.y > K.HZ + 60) S.bits[i] = S.name === 'winter' ? flake(K, rnd, false) : fromTree(K, rnd, false);
  });
}

// Leaves and petals, drawn on the island layer. Each one turns over as it falls, so it narrows and widens.
export function drawSeasonIsle(c, S, K, P) {
  if (S.name !== 'autumn' && S.name !== 'spring') return;
  const cols = S.name === 'autumn' ? LEAVES : PETALS;
  for (const b of S.bits) {
    const col = cols[Math.floor(b.col * cols.length)], fade = clamp((K.HZ + 60 - b.y) / 120, 0, 1);
    c.fillStyle = rgba(P.night ? mixc(col, P.rock, .45) : col, .9 * fade);
    c.beginPath();
    c.ellipse(b.x, b.y, b.size, b.size * (.25 + .75 * Math.abs(Math.sin(b.ph * b.spin * .5))), b.ph, 0, TAU);
    c.fill();
  }
}

// Snow, drawn on the front layer over everything else.
export function drawSeasonFront(c, S, K, P) {
  if (S.name !== 'winter') return;
  const s = sprite([255, 255, 255]), a = P.night ? .75 : .95;
  c.fillStyle = rgba([255, 255, 255], a * .9);
  for (const b of S.bits) {
    dab(c, s, b.x, b.y, b.size * 1.6, a * .6);
    c.fillRect(b.x - b.size * .3, b.y - b.size * .3, b.size * .6, b.size * .6);
  }
}
