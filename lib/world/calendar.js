// The visitor's calendar, which the page reads as well as the world: the season and occasion a date falls in, how far
// the maple has turned by then, and the maple's fallen leaves, which the page draws pressed in the field guide. Kept
// apart from season.js, which makes the seasons happen, so the page can read them without loading the engine.

import { clamp } from "./core";

// The colours a fallen leaf can be. A pressed leaf is kept by its index here, so a new colour goes on the end.
export const LEAVES = [
  [206, 52, 38],
  [232, 108, 44],
  [176, 36, 40],
  [240, 168, 62],
];

// A maple leaf, one unit from its middle to the tip of its top lobe, stalk down: three big lobes and two small ones,
// each with a tooth or two.
const HALF = [
  [0, -1],
  [0.1, -0.8],
  [0.24, -0.84],
  [0.18, -0.5],
  [0.52, -0.62],
  [0.62, -0.78],
  [0.66, -0.56],
  [0.96, -0.5],
  [0.7, -0.3],
  [0.78, -0.16],
  [0.44, -0.04],
  [0.62, 0.3],
  [0.5, 0.32],
  [0.52, 0.48],
  [0.2, 0.26],
  [0, 0.4],
];
// As an SVG path, which the page draws pressed leaves with too.
export const LEAF_D = `M${[
  ...HALF,
  ...HALF.slice(1, -1)
    .reverse()
    .map(([x, y]) => [-x, y]),
].join("L")}Z`;
let leafPath = null;
export const mapleLeaf = () => (leafPath ||= new Path2D(LEAF_D));

/** The season for a date, in the northern hemisphere: winter is December to February. */
export function seasonOf(date) {
  const m = date.getMonth();
  return m === 11 || m < 2 ? "winter" : m < 5 ? "spring" : m < 8 ? "summer" : "autumn";
}

/** How far through autumn the maple has turned, from 0 to 1, for a date: a few leaves at the start of September, and
 * every one of them red and gold by late October. */
export function turnOf(date) {
  const y = date.getFullYear(),
    from = new Date(y, 8, 1),
    full = new Date(y, 9, 25);
  return clamp(0.15 + (0.85 * (date.getTime() - from.getTime())) / (full.getTime() - from.getTime()), 0.15, 1);
}

/** The occasion the world dresses up for on a date, if any: Halloween for the week up to it, and New Year's Eve and Day. */
export function occasionOf(date) {
  const m = date.getMonth(),
    d = date.getDate();
  if (m === 9 && d >= 24) return "halloween";
  if ((m === 11 && d === 31) || (m === 0 && d === 1)) return "newyear";
  return null;
}

/** Which way geese are migrating on a date, in the northern hemisphere: south (1) from mid-September to the end of
 * November, north (-1) through March and April, and neither (0) the rest of the year. */
export function migrationOf(date) {
  const m = date.getMonth();
  if ((m === 8 && date.getDate() >= 15) || m === 9 || m === 10) return 1;
  return m === 2 || m === 3 ? -1 : 0;
}

// The year's big meteor showers, from the International Meteor Organization's calendar: their name, the constellation
// their meteors seem to fly out of, the first and last days they are about and the night they peak, as [month, day],
// where that point in the sky is, as right ascension and declination in degrees, and how many an hour they bring at
// best under a perfect sky.
/** @type {[string, string, [number, number], [number, number], [number, number], number, number, number][]} */
export const SHOWERS = [
  ["Quadrantids", "Boötes", [11, 28], [0, 3], [0, 12], 230, 49, 80],
  ["Lyrids", "Lyra", [3, 14], [3, 22], [3, 30], 271, 34, 18],
  ["Eta Aquariids", "Aquarius", [3, 19], [4, 6], [4, 28], 338, -1, 50],
  ["Perseids", "Perseus", [6, 17], [7, 12], [7, 24], 48, 58, 100],
  ["Orionids", "Orion", [9, 2], [9, 21], [10, 7], 95, 16, 20],
  ["Leonids", "Leo", [10, 6], [10, 17], [10, 30], 152, 22, 15],
  ["Geminids", "Gemini", [11, 4], [11, 14], [11, 20], 112, 33, 150],
  ["Ursids", "Ursa Minor", [11, 17], [11, 22], [11, 26], 217, 76, 10],
];

/** The meteor shower on at a date, if any, and how strong it is, from 0 to 1: rising from its first day to its peak and
 * falling away to its last, and weaker for a shower that is weaker at best, though not by as much, so even a small one
 * shows. Where two overlap, the stronger. `named` is a shower to have at its best instead, whatever the date, as a
 * lower-case name with no spaces, as ?shower= asks for it.
 * @param {Date} date
 * @param {string | null} [named] */
export function showerOf(date, named = null) {
  const day = 864e5,
    t = date.getTime();
  let best = null;
  for (const [name, from, start, peak, end, ra, dec, rate] of SHOWERS) {
    if (named) {
      if (name.toLowerCase().replace(/ /g, "") === named) return { name, from, ra, dec, k: 1 };
      continue;
    }
    // The shower's dates nearest to this one, which for one over New Year may fall in the year before or after.
    const at = ([m, d], dy) => new Date(date.getFullYear() + dy, m, d).getTime();
    for (const dy of [-1, 0, 1]) {
      const p = at(peak, dy),
        a = at(start, start[0] > peak[0] ? dy - 1 : dy),
        b = at(end, end[0] < peak[0] ? dy + 1 : dy) + day;
      if (t < a || t >= b) continue;
      const k = clamp(t < p ? (t - a) / (p - a) : 1 - (t - p - day) / (b - p - day), 0, 1) ** 2 * Math.sqrt(rate / 150);
      if (k > (best?.k ?? 0)) best = { name, from, ra, dec, k };
    }
  }
  return best;
}
