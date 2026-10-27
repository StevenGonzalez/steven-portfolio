import { NextResponse } from "next/server";

// How stormy the Earth's magnetic field is right now, for the world's northern lights (lib/world/aurora.js): the
// planetary K index, from 0 to 9, as NOAA's Space Weather Prediction Center estimates it each minute. It is the same
// for everyone, so nothing about the visitor is sent; the page works out whether the lights would reach it. Answers are
// cached for ten minutes.
const FEED = "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json";

export async function GET() {
  try {
    const res = await fetch(FEED, { signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (!res.ok) throw new Error(`NOAA answered ${res.status}`);
    const rows = await res.json(),
      kp = Number(rows?.at?.(-1)?.estimated_kp);
    if (!(kp >= 0 && kp <= 9)) throw new Error("NOAA sent no K index");
    return NextResponse.json(
      { kp: Math.round(kp * 10) / 10 },
      { headers: { "Cache-Control": "public, s-maxage=600, stale-while-revalidate=1200" } },
    );
  } catch {
    // No lights, as far as the world knows, and asked again in a minute.
    return NextResponse.json(null, { status: 502, headers: { "Cache-Control": "public, s-maxage=60" } });
  }
}
