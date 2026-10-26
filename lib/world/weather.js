// The weather where the visitor is. The page asks the site for it (app/api/weather), which asks Open-Meteo about the
// rough place the visitor's request came from, and the world follows along: rain falls right across it, opening the
// shy bells where it lands on the turf and a flower now and then; snow falls, and a winter with none falling where the
// visitor is has only the snow lying; fog fills the valleys behind the island and thickens the mists; a thunderstorm
// lights up the sky beyond the far hills now and then and rumbles a few seconds later; and a windy day sends gusts
// across more often and harder. Fine weather looks as the world always does.

import { blit, clamp, dab, rgba, sprite } from "./core";
import { mistSprite } from "./life";
import { water } from "./play";
import { drawFlakes, flake } from "./season";
import { gust } from "./wind";

/** What the site says the weather is: rain, snow, fog, a thunderstorm, wind or fine (null), how heavy, from 0 to 1,
 *  and the wind's speed in km/h.
 *  @typedef {{kind: "rain" | "snow" | "fog" | "storm" | "wind" | null, level: number, wind: number}} Weather */

/** @param {Weather} w */
export function makeWeather(Lf, K, w) {
  const rnd = Math.random,
    level = clamp(w.level, 0, 1),
    wet = w.kind === "rain" || w.kind === "storm",
    heavy = 0.4 + 0.6 * level,
    banks = w.kind === "fog" ? (K.phone ? 4 : 7) : 0;
  if (Lf.season.name === "winter" && w.kind !== "snow") {
    Lf.season.bits = [];
    Lf.season.settle = 1;
  }
  if (w.kind === "fog") for (const m of Lf.mists) m.a = Math.min(1, m.a * (1 + 0.5 * level));
  return {
    kind: w.kind,
    // How windy it is, from 0 to 1, for the gusts. A thunderstorm is always a bit windy.
    windy: Math.max(clamp((w.wind - 15) / 30, 0, 1), w.kind === "storm" ? 0.5 : 0),
    // How loud the rain is, from 0 to 1.
    rain: wet ? 0.25 + 0.5 * level : 0,
    drops: Array.from({ length: wet ? Math.round((K.phone ? 120 : 260) * heavy) : 0 }, () => drop(K, rnd, true)),
    flakes: Array.from({ length: w.kind === "snow" ? Math.round((K.phone ? 90 : 180) * heavy) : 0 }, () =>
      flake(K, rnd, true),
    ),
    // Fog banks drifting along the valleys behind the island.
    banks: Array.from({ length: banks }, (_, i) => ({
      x: K.WU * ((i + rnd() * 0.6) / banks),
      y: K.HZ - 330 + (i % 3) * 90 + rnd() * 50,
      w: (K.phone ? 620 : 980) * (0.8 + rnd() * 0.5),
      sp: (3 + rnd() * 4) * (i % 2 ? 1 : -1),
      a: (0.75 + rnd() * 0.25) * (0.5 + 0.5 * level),
    })),
    level,
    wet: 0,
    sentAt: -9,
    // When the storm next lights up the sky, how bright that is, where, and when its thunder comes.
    next: 4 + rnd() * 6,
    flash: 0,
    fx: 0,
    rumble: -1,
  };
}

// A raindrop somewhere across the sky, or just above it unless `spread`.
function drop(K, rnd, spread) {
  return {
    x: -K.EX + rnd() * (K.WU + K.EX * 2),
    y: spread ? -K.EX + rnd() * (1000 + K.EX * 2) : -K.EX - rnd() * 80,
    v: 560 + rnd() * 200,
  };
}

export function updateWeather(Lf, K, dt) {
  const R = Lf.weather;
  if (!R) return;
  const rnd = Math.random,
    I = K.isle;
  for (let i = 0; i < R.drops.length; i++) {
    const d = R.drops[i];
    d.y += d.v * dt;
    d.x += (-0.08 * d.v + 160 * gust(Lf.wind, K, d.x)) * dt;
    if (d.y > 1000 + K.EX) R.drops[i] = drop(K, rnd, false);
  }
  for (let i = 0; i < R.flakes.length; i++) {
    const b = R.flakes[i],
      g = gust(Lf.wind, K, b.x);
    b.ph += dt * 0.8;
    b.y += b.vy * (1 - 0.5 * Math.abs(g)) * dt;
    b.x += Math.cos(b.ph) * b.sway * dt + 45 * g * dt;
    if (b.y > 1000 + K.EX) R.flakes[i] = flake(K, rnd, false);
  }
  for (const m of R.banks) {
    m.x += m.sp * dt;
    if (m.x > K.WU + K.EX + m.w / 2) m.x = -K.EX - m.w / 2;
    if (m.x < -K.EX - m.w / 2) m.x = K.WU + K.EX + m.w / 2;
  }
  // A few drops a second land somewhere along the turf.
  if (R.rain)
    for (R.wet += R.level * 6 * dt; R.wet >= 1; R.wet--) {
      const x = I.x0 + rnd() * K.iw;
      water(Lf, K, x, I.topAt(x));
    }
  // The rain is heard the way a storm's is, told once a second, unless a storm the visitor brewed is telling it.
  if (R.rain && !Lf.play.storm && Lf.t - R.sentAt > 1) {
    R.sentAt = Lf.t;
    Lf.sfx.push(["rain", K.WU / 2, R.rain]);
  }
  if (R.kind === "storm" && !Lf.doze && (R.next -= dt) < 0) {
    R.next = 12 + rnd() * 16;
    R.flash = 1;
    R.fx = K.WU * (0.15 + rnd() * 0.7);
    R.rumble = 1.5 + rnd() * 2.5;
  }
  R.flash = Math.max(0, R.flash - dt * 2.5);
  if (R.rumble > 0 && (R.rumble -= dt) <= 0) Lf.sfx.push(["thunder", R.fx, true]);
}

// The lightning beyond the far hills, in the high sky's units, on the back layer.
export function drawWeatherBack(c, Lf, K) {
  const R = Lf.weather;
  if (!R?.flash) return;
  const ss = Math.max(K.s, 0.7);
  c.globalCompositeOperation = "lighter";
  dab(c, sprite([214, 222, 255]), R.fx, K.HZ - 220, 520 * ss, 0.45 * R.flash * R.flash);
  c.globalCompositeOperation = "source-over";
}

// The fog banks, on the back layer over the far hills and the ridge.
export function drawFog(c, Lf, K, P) {
  const R = Lf.weather;
  if (!R?.banks.length) return;
  const ms = mistSprite(P);
  for (const m of R.banks) blit(c, ms, m.x - m.w / 2, m.y - m.w * 0.14, m.w, m.w * 0.28, m, m.a);
}

// The rain and snow, over everything else on the front layer, and the weather itself, named anywhere in the open sky.
export function drawWeather(c, Lf, K, P) {
  const R = Lf.weather;
  if (!R?.kind) return;
  const ss = Math.max(K.s, 0.7);
  // Each drop a short upright streak: filled rectangles cost a fraction of what stroking as many lines does.
  c.fillStyle = rgba(P.night ? [190, 220, 240] : [78, 98, 122], (P.night ? 0.42 : 0.55) * (0.7 + 0.3 * R.level));
  for (const d of R.drops) c.fillRect(d.x, d.y - 20 * ss, 1.2 * ss, 20 * ss);
  if (R.flakes.length) drawFlakes(c, R.flakes, P);
  for (let x = 0; x <= K.WU; x += 260) Lf.hits.push(["weather", x, 130, 170, 0]);
}
