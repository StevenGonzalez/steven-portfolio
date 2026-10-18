// Checks that a change to the world's code draws exactly what it drew before. It runs the renderer from a git revision
// and from the working tree through the same script, in headless Firefox, and compares every canvas's pixels and
// every message the renderer sends, at checkpoints along the way. A change meant only to tidy the code should pass;
// one meant to change the picture fails, at the first checkpoint and the layers where it shows.
//
//   yarn check:world                 compare the working tree with HEAD
//   yarn check:world --base main     compare it with another revision
//   yarn check:world --only 2        run only the third scenario
//   yarn check:world --a work        run the working tree on both sides, to show the script itself gives the same
//                                    picture every run
//
// Every run steps the world at a fixed 60 fps on a fixed clock, with the same seeded randomness, so two versions of the
// code that do the same thing draw the same frames. A change that only reorders calls to Math.random still fails.
// The main thread's side of the world, its sounds and its overlays, is not covered: check:sound covers the sounds.

import { readFileSync } from "node:fs";
import path from "node:path";
import { launchFirefox, numberOption, option, rootDir, runInPage, serveWorld } from "./world-harness.mjs";

const base = option("--base", "HEAD");
const A = option("--a", "base");
const B = option("--b", "work");
const only = option("--only", null);
const frames = numberOption("--frames", 1500);

const SCENARIOS = [
  {
    name: "desktop day autumn",
    w: 1440,
    h: 900,
    dpr: 1,
    night: 0,
    season: "autumn",
    turn: 0.7,
    occasion: null,
    ask: "calf",
  },
  {
    name: "desktop night autumn",
    w: 1440,
    h: 900,
    dpr: 1,
    night: 1,
    season: "autumn",
    turn: 1,
    occasion: null,
    ask: "hamlet",
  },
  {
    name: "phone night spring",
    w: 390,
    h: 844,
    dpr: 3,
    night: 1,
    season: "spring",
    turn: 0.15,
    occasion: null,
    ask: "lanternship",
  },
  {
    name: "wide day summer",
    w: 1920,
    h: 1000,
    dpr: 1,
    night: 0,
    season: "summer",
    turn: 0.15,
    occasion: null,
    ask: "calf",
  },
  {
    name: "desktop day new year",
    w: 1440,
    h: 900,
    dpr: 1.5,
    night: 0,
    season: "winter",
    turn: 0.15,
    occasion: "newyear",
    ask: "hamlet",
  },
  {
    name: "desktop night halloween",
    w: 1280,
    h: 800,
    dpr: 1,
    night: 1,
    season: "autumn",
    turn: 0.9,
    occasion: "halloween",
    ask: "lanternship",
  },
  {
    name: "phone day winter, reduced",
    w: 390,
    h: 844,
    dpr: 2,
    night: 0,
    season: "winter",
    turn: 0.15,
    occasion: null,
    ask: null,
    reduce: true,
  },
];

const page = `<!doctype html><meta charset="utf-8"><script type="module">
const worker = new Worker("/check.worker.js", { type: "module" });
worker.onmessage = (e) => (window.result = e.data);
worker.postMessage(JSON.parse(new URLSearchParams(location.search).get("run")));
</script>`;
const server = await serveWorld(base, {
  "/": ["text/html", page],
  "/check.worker.js": ["text/javascript", readFileSync(path.join(rootDir, "scripts/world-check.worker.js"))],
});
const browser = await launchFirefox();
const tab = await browser.newPage();
const run = async (code, scenario) =>
  (await runInPage(tab, server.origin, { ...scenario, code, frames }, `${code}, ${scenario.name}`)).out;

let differ = 0;
try {
  console.log(
    `The world drawn by ${A === "base" ? base : A} and by ${B === "base" ? base : B === "work" ? "the working tree" : B}, ${frames} frames.\n`,
  );
  for (const [n, scenario] of SCENARIOS.entries()) {
    if (only !== null && String(n) !== only) continue;
    const t0 = Date.now();
    const a = await run(A, scenario);
    const b = await run(B, scenario);
    let bad = null;
    for (let i = 0; i < Math.max(a.length, b.length) && !bad; i++) {
      const x = a[i];
      const y = b[i];
      if (!x || !y || x.label !== y.label) bad = `checkpoint ${i}, which one side never reached`;
      else {
        const layers = x.layers.flatMap((h, j) => (h !== y.layers[j] ? [j] : []));
        const said =
          x.said !== y.said ? `, and the messages differ\n    ${A}: ${x.saidText}\n    ${B}: ${y.saidText}` : "";
        if (layers.length || said) bad = `${x.label}${layers.length ? `, layers ${layers.join(", ")}` : ""}${said}`;
      }
    }
    if (bad) differ++;
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    console.log(
      `${bad ? "DIFFERS" : "same   "}  ${scenario.name.padEnd(28)} ${a.length} checkpoints, ${secs} s${bad ? `\n  first at ${bad}` : ""}`,
    );
  }
} finally {
  await browser.close();
  server.close();
}
if (differ) {
  console.log(`\n${differ} scenario${differ > 1 ? "s" : ""} drew something different.`);
  process.exit(1);
}
