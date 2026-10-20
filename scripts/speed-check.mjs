// Loads the site's pages in Lighthouse as a phone would, on a slow 4G connection with a slow CPU, and fails when a
// page's load speed or layout shift is worse than its limit. It checks the measurements rather than the performance
// score, which mixes them all and moves by a few points from run to run. Each page is loaded --runs times (3 by
// default), each time in a fresh browser, and the median of each measurement is checked.
//
//   yarn build && yarn check:speed
//
// It serves the production build in .next with next start, so build first. Needs Chrome or Chromium: set CHROME to
// its path if it is not on the PATH.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import lighthouse from "lighthouse";
import puppeteer from "puppeteer-core";
import { numberOption, rootDir } from "./world-harness.mjs";

const runs = numberOption("--runs", 3);
const PAGES = ["/", "/projects/sky-islands"];
// The limit for each measurement, with how to show it. The paints are in milliseconds. On GitHub's runners the pages
// first paint at 0.76 s and never shift. The largest paint is 2.4, 2.95 or 3.1 s, depending on how much was asked for
// before the first paint, so its room is above the highest. The blocking time is shown but has no limit: Lighthouse
// gets it by timing the page's scripts on the machine it runs on and multiplying by four, so it measures that machine
// as much as the page. Two runs on GitHub of the same pages measured 20 ms and 405 ms, while the paints, which are
// mostly the simulated network, stayed within 20 ms.
const LIMITS = [
  ["first-contentful-paint", "FCP", 1000, (v) => `${(v / 1000).toFixed(2)} s`],
  ["largest-contentful-paint", "LCP", 3500, (v) => `${(v / 1000).toFixed(2)} s`],
  ["total-blocking-time", "TBT", null, (v) => `${Math.round(v)} ms`],
  ["cumulative-layout-shift", "CLS", 0.02, (v) => v.toFixed(3)],
];

if (!existsSync(path.join(rootDir, ".next/BUILD_ID"))) {
  console.error("No production build: run yarn build first.");
  process.exit(2);
}
const chrome =
  process.env.CHROME ||
  ["google-chrome-stable", "google-chrome", "chromium", "chromium-browser"]
    .flatMap((name) => (process.env.PATH ?? "").split(path.delimiter).map((dir) => path.join(dir, name)))
    .find((file) => existsSync(file));
if (!chrome) {
  console.error("Chrome not found: set CHROME to its path.");
  process.exit(2);
}

// A free port for the site.
const port = await new Promise((done) => {
  const probe = net.createServer().listen(0, "127.0.0.1", () => {
    const { port } = /** @type {net.AddressInfo} */ (probe.address());
    probe.close(() => done(port));
  });
});
const origin = `http://127.0.0.1:${port}`;
const server = spawn(path.join(rootDir, "node_modules/.bin/next"), ["start", "-H", "127.0.0.1", "-p", String(port)], {
  cwd: rootDir,
  stdio: "ignore",
});
const stop = () => server.kill();
process.on("exit", stop);
for (let tries = 0; ; tries++) {
  try {
    if ((await fetch(origin)).ok) break;
  } catch {
    // Not listening yet.
  }
  if (tries > 120) {
    console.error(`The site did not start at ${origin}.`);
    process.exit(2);
  }
  await new Promise((done) => setTimeout(done, 250));
}

// One load of `url`, in a browser of its own so nothing is cached from the last. Lighthouse's default settings are a
// mid-range phone on slow 4G with the CPU slowed four times. GitHub's Ubuntu runners don't allow Chrome's sandbox, and
// these are the site's own pages, so it runs without one there.
async function measure(url) {
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: true,
    args: process.env.CI ? ["--no-sandbox"] : [],
  });
  try {
    const page = await browser.newPage();
    const result = await lighthouse(
      url,
      { output: "json", onlyCategories: ["performance"], logLevel: "error" },
      undefined,
      page,
    );
    const lhr = result?.lhr;
    if (!lhr || lhr.runtimeError) throw new Error(`${url}: ${lhr?.runtimeError?.message ?? "no result"}`);
    return LIMITS.map(([id]) => lhr.audits[id].numericValue ?? NaN);
  } finally {
    await browser.close();
  }
}

const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
console.log(
  `Lighthouse on a phone, on slow 4G with a slow CPU, the median of ${runs} load${runs > 1 ? "s" : ""} of each page.\n`,
);
console.log(`${"".padEnd(24)}${LIMITS.map(([, name]) => name.padStart(10)).join("")}`);
console.log(
  `${"limit".padEnd(24)}${LIMITS.map(([, , limit, show]) => (limit === null ? "none" : show(limit)).padStart(10)).join("")}`,
);
let failed = false;
for (const page of PAGES) {
  const loads = [];
  for (let i = 0; i < runs; i++) loads.push(await measure(origin + page));
  const got = LIMITS.map((_, m) => median(loads.map((load) => load[m])));
  const over = LIMITS.filter(([, , limit], m) => limit !== null && !(got[m] <= limit)).map(([, name]) => name);
  failed ||= over.length > 0;
  console.log(
    `${page.padEnd(24)}${LIMITS.map(([, , , show], m) => show(got[m]).padStart(10)).join("")}${over.length ? `  ${over.join(", ")} over` : ""}`,
  );
  // On GitHub the measurements show on the run's page too.
  if (process.env.GITHUB_ACTIONS)
    console.log(
      `::${over.length ? "error" : "notice"} title=Speed of ${page}::${LIMITS.map(([, name, , show], m) => `${name} ${show(got[m])}`).join(", ")}`,
    );
}
if (failed) console.log("\nOver a limit: something made the page load slower or move about as it loads.");
process.exit(failed ? 1 : 0);
