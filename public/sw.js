// The site's service worker, so the site still opens with no connection. Every page fetched while online is kept, along
// with the scripts, styles, fonts and pictures it used, and the page hands over what it loaded before this worker took
// charge, so the very first visit is kept too. Pages come from the network whenever it answers, so a new deploy shows
// at once; offline, the kept copy is served instead, and a page never visited gets a short note pointing home.
// Next's build files are named by their contents and never change, so those come from the cache first.

const CACHE = "site-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
      await self.clients.claim();
    })(),
  );
});

// Only this site's own files are kept, and never its API, Vercel's scripts, or the data Next fetches between pages,
// which belongs to one build and is useless with another's pages.
function keepable(url, req) {
  return (
    url.origin === location.origin &&
    !url.pathname.startsWith("/api/") &&
    !url.pathname.startsWith("/_vercel/") &&
    !url.searchParams.has("_rsc") &&
    !req?.headers.has("RSC")
  );
}

// What the page loaded before this worker was in charge of it.
self.addEventListener("message", (e) => {
  if (e.data?.type !== "keep") return;
  e.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      await Promise.all(
        e.data.urls
          .filter((u) => keepable(new URL(u)))
          .map(async (u) => {
            if (await cache.match(u)) return;
            const res = await fetch(u).catch(() => null);
            if (fresh(res)) await cache.put(u, res);
          }),
      );
    })(),
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request,
    url = new URL(req.url);
  if (req.method !== "GET" || !keepable(url, req)) return;
  e.respondWith(url.pathname.startsWith("/_next/static/") ? cacheFirst(req) : networkFirst(req));
});

// Only a whole, direct answer is kept: a part of a file can't stand in for all of it, and a browser refuses a page
// that came by a redirect when it is served back for the address asked for.
const fresh = (res) => res?.status === 200 && !res.redirected;

async function cacheFirst(req) {
  const cache = await caches.open(CACHE),
    hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (fresh(res)) cache.put(req, res.clone());
  return res;
}

async function networkFirst(req) {
  const cache = await caches.open(CACHE);
  try {
    const res = await fetch(req);
    if (fresh(res)) cache.put(req, res.clone());
    return res;
  } catch (err) {
    // A page asked for with ?weather=rain or the like is the same page.
    const hit = await cache.match(req, { ignoreSearch: req.mode === "navigate" });
    if (hit) return hit;
    if (req.mode !== "navigate") throw err;
    return new Response(OFFLINE, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }
}

const OFFLINE = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offline · Steven Gonzalez</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0f1622;color:#e8e2d4;font:17px/1.6 system-ui,sans-serif;padding:16px;box-sizing:border-box}main{max-width:32rem}a{color:#e8c27a}</style>
<main><h1>You’re offline</h1><p>This page wasn’t saved on this device yet, so it can’t open without a connection. The pages you’ve already visited still work, and so does the island on the <a href="/">home page</a>.</p></main></html>`;
