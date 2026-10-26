import { NextResponse, type NextRequest } from "next/server";

// The weather where the visitor is, for the world to follow (lib/world/weather.js). The page sends the rough place the
// proxy left in its cookie, and this asks Open-Meteo for the weather there now, so the visitor's address never leaves
// this site. Answers are cached for a quarter of an hour, and shared by everyone in the same few miles.

// What each WMO weather code looks like in the world, and how heavy it is, from 0 to 1. Anything not here is fine.
const SKY: Record<number, [string, number]> = {
  45: ["fog", 0.7],
  48: ["fog", 0.8],
  51: ["rain", 0.2],
  53: ["rain", 0.3],
  55: ["rain", 0.4],
  56: ["rain", 0.3],
  57: ["rain", 0.4],
  61: ["rain", 0.4],
  63: ["rain", 0.7],
  65: ["rain", 1],
  66: ["rain", 0.5],
  67: ["rain", 0.8],
  71: ["snow", 0.4],
  73: ["snow", 0.7],
  75: ["snow", 1],
  77: ["snow", 0.3],
  80: ["rain", 0.4],
  81: ["rain", 0.7],
  82: ["rain", 1],
  85: ["snow", 0.5],
  86: ["snow", 0.9],
  95: ["storm", 0.8],
  96: ["storm", 1],
  99: ["storm", 1],
};
// A fine day this windy, in km/h, is a windy one.
const WINDY = 30;

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams,
    lat = Number(q.get("lat")),
    lon = Number(q.get("lon"));
  if (!q.has("lat") || !q.has("lon") || !(Math.abs(lat) <= 90) || !(Math.abs(lon) <= 180))
    return NextResponse.json(null, { status: 400 });
  const url =
    "https://api.open-meteo.com/v1/forecast?current=weather_code,wind_speed_10m" +
    `&latitude=${lat.toFixed(1)}&longitude=${lon.toFixed(1)}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000), cache: "no-store" });
    if (!res.ok) throw new Error(`Open-Meteo answered ${res.status}`);
    const { current } = await res.json();
    const wind = Number(current?.wind_speed_10m) || 0,
      [kind, level] = SKY[current?.weather_code] ?? (wind >= WINDY ? ["wind", 1] : [null, 0]);
    return NextResponse.json(
      { kind, level, wind: Math.round(wind) },
      { headers: { "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800" } },
    );
  } catch {
    // Fine weather, as far as the world knows, and asked again in a minute.
    return NextResponse.json(null, { status: 502, headers: { "Cache-Control": "public, s-maxage=60" } });
  }
}
