// The real night sky over the visitor. The stars come from the Yale Bright Star Catalogue (starcat.js), placed for the
// visitor's rough place and the time the world was laid out, so the stars on the page are the stars over their roof,
// up there behind the daylight as much as in the dark. The place is the city the request came from, which the server
// leaves in a cookie (proxy.ts), or failing that a guess from the clock's time zone. The view looks south, or north
// south of the equator, with the horizon just behind the far hills, and is drawn as a fish-eye lens would, so the
// constellations keep their shapes right across a wide screen.

import { STARS, digit } from "./starcat";
import { clamp } from "./core";

const RAD = Math.PI / 180,
  N = STARS.length / 5;

// Where the visitor is and when: degrees north and east, and a time in milliseconds. Kept to the nearest few miles.
/** @typedef {{lat: number, lon: number, t: number}} Here */
/** @returns {Here} */
export function skyHere() {
  const t = Date.now(),
    m = typeof document === "undefined" ? null : /(?:^|; )here=(-?[\d.]+)(?:,|%2C)(-?[\d.]+)/.exec(document.cookie);
  const lat = m ? clamp(Number(m[1]), -89, 89) : 40,
    lon = m ? clamp(Number(m[2]), -180, 180) : -new Date(t).getTimezoneOffset() / 4;
  return { lat: Number.isFinite(lat) ? lat : 40, lon: Number.isFinite(lon) ? lon : 0, t };
}

// The stars above the horizon, as [x, y, magnitude, altitude in radians, index in STARS], in world units. `yh` is where
// the horizon is drawn.
export function buildSky(K, here) {
  const { WU, phone } = K,
    yh = K.HZ - 40,
    // Half the width of the view, in degrees, and where its middle hangs, as a share of the way down to the horizon.
    R = WU / (4 * Math.tan((phone ? 40 : 75) * RAD * 0.5)),
    yc = yh * (phone ? 0.45 : 0.55),
    altc = 2 * Math.atan((yh - yc) / (2 * R));
  const lat = here.lat * RAD,
    sl = Math.sin(lat),
    cl = Math.cos(lat);
  // Local sidereal time: how far round the sky has turned, from the days since noon on 1 January 2000.
  const d = here.t / 864e5 - 10957.5,
    lst = (280.46061837 + 360.98564736629 * d + here.lon) * RAD;
  // Facing south (north below the equator): f is straight ahead, r to the right, u up the page; east, north, up.
  const s = here.lat < 0 ? -1 : 1,
    f = [0, -s * Math.cos(altc), Math.sin(altc)],
    r = [-s, 0, 0],
    u = [0, s * Math.sin(altc), Math.cos(altc)];
  const pts = [];
  for (let i = 0; i < N; i++) {
    const ra = (digit(STARS, i * 5) * 90 + digit(STARS, i * 5 + 1)) / 20,
      dec = (digit(STARS, i * 5 + 2) * 90 + digit(STARS, i * 5 + 3)) / 20 - 90,
      mag = digit(STARS, i * 5 + 4) / 10 - 1.5;
    const h = lst - ra * RAD,
      sd = Math.sin(dec * RAD),
      cd = Math.cos(dec * RAD);
    const v = [-cd * Math.sin(h), sd * cl - cd * Math.cos(h) * sl, sd * sl + cd * Math.cos(h) * cl];
    if (v[2] <= 0) continue;
    const dot = (a) => a[0] * v[0] + a[1] * v[1] + a[2] * v[2],
      k = (2 * R) / (1 + dot(f));
    pts.push([WU / 2 + k * dot(r), yc - k * dot(u), mag, Math.asin(v[2]), i]);
  }
  K.sky = { ...here, yh, pts };
}
