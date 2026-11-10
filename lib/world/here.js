// Where the visitor is and when: degrees north and east, and a time in milliseconds. Kept to the nearest few miles.
// `local` is whether the place is the visitor's, from the cookie, rather than a guess. Apart from sky.js so that the
// page, which only needs this, doesn't download the star catalogue the workers draw from.

import { clamp } from "./core";

/** @typedef {{lat: number, lon: number, t: number, local: boolean}} Here */
/** @returns {Here} */
export function skyHere() {
  const t = Date.now(),
    m = typeof document === "undefined" ? null : /(?:^|; )here=(-?[\d.]+)(?:,|%2C)(-?[\d.]+)/.exec(document.cookie);
  const lat = m ? clamp(Number(m[1]), -89, 89) : 40,
    lon = m ? clamp(Number(m[2]), -180, 180) : -new Date(t).getTimezoneOffset() / 4;
  return { lat: Number.isFinite(lat) ? lat : 40, lon: Number.isFinite(lon) ? lon : 0, t, local: !!m };
}
