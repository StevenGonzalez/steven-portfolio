import { NextResponse, type NextRequest } from "next/server";

// Leaves the city a visit to the home page came from, to the nearest few miles, in a cookie for the world to read, so
// its night sky is the sky over the visitor (lib/world/sky.js) and its weather theirs (app/api/weather). Vercel works
// the city out from the address, and without it the world guesses from the visitor's time zone and has fine weather.
export function proxy(request: NextRequest) {
  const res = NextResponse.next();
  const lat = Number(request.headers.get("x-vercel-ip-latitude")),
    lon = Number(request.headers.get("x-vercel-ip-longitude"));
  if (!request.headers.has("x-vercel-ip-latitude") || !Number.isFinite(lat) || !Number.isFinite(lon)) return res;
  const here = `${lat.toFixed(1)},${lon.toFixed(1)}`;
  if (request.cookies.get("here")?.value !== here)
    res.cookies.set("here", here, { path: "/", maxAge: 86400, sameSite: "lax" });
  return res;
}

export const config = { matcher: "/" };
