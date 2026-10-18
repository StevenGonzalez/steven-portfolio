// The visitor's calendar, which the page reads as well as the world: the season and occasion a date falls in, how far
// the maple has turned by then, and the maple's fallen leaves, which the page draws pressed in the field guide. Kept
// apart from season.js, which makes the seasons happen, so the page can read them without loading the engine.

import { clamp } from './core';

// The colours a fallen leaf can be. A pressed leaf is kept by its index here, so a new colour goes on the end.
export const LEAVES = [[206, 52, 38], [232, 108, 44], [176, 36, 40], [240, 168, 62]];

// A maple leaf, one unit from its middle to the tip of its top lobe, stalk down: three big lobes and two small ones,
// each with a tooth or two.
const HALF = [[0, -1], [.1, -.8], [.24, -.84], [.18, -.5], [.52, -.62], [.62, -.78], [.66, -.56], [.96, -.5], [.7, -.3], [.78, -.16],
  [.44, -.04], [.62, .3], [.5, .32], [.52, .48], [.2, .26], [0, .4]];
// As an SVG path, which the page draws pressed leaves with too.
export const LEAF_D = `M${[...HALF, ...HALF.slice(1, -1).reverse().map(([x, y]) => [-x, y])].join('L')}Z`;
let leafPath = null;
export const mapleLeaf = () => (leafPath ||= new Path2D(LEAF_D));

/** The season for a date, in the northern hemisphere: winter is December to February. */
export function seasonOf(date) {
  const m = date.getMonth();
  return m === 11 || m < 2 ? 'winter' : m < 5 ? 'spring' : m < 8 ? 'summer' : 'autumn';
}

/** How far through autumn the maple has turned, from 0 to 1, for a date: a few leaves at the start of September, and
 * every one of them red and gold by late October. */
export function turnOf(date) {
  const y = date.getFullYear(), from = new Date(y, 8, 1), full = new Date(y, 9, 25);
  return clamp(.15 + (.85 * (date - from)) / (full - from), .15, 1);
}

/** The occasion the world dresses up for on a date, if any: Halloween for the week up to it, and New Year's Eve and Day. */
export function occasionOf(date) {
  const m = date.getMonth(), d = date.getDate();
  if (m === 9 && d >= 24) return 'halloween';
  if ((m === 11 && d === 31) || (m === 0 && d === 1)) return 'newyear';
  return null;
}
