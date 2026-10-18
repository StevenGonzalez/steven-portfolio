// Times how long the world at the top of the home page takes to draw a frame, in headless Firefox, and compares the
// working tree with a git revision.
//
//   yarn bench:world                  compare the working tree with HEAD
//   yarn bench:world --base main      compare it with another revision
//   yarn bench:world --profile        also show where the working tree's frame time goes
//   yarn bench:world --season winter  run in another season (autumn by default), or an occasion: halloween, newyear
//
// Each scenario runs both versions in alternating rounds and compares the median change. The check fails when the
// working tree is more than --budget milliseconds (default 1) slower per frame in any scenario. Then the new work
// should be made cheaper, or drawn more cheaply in lite mode, which slow devices switch to.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { launchFirefox, numberOption, option, rootDir, runInPage, serveWorld } from "./world-harness.mjs";

const base = option("--base", "HEAD");
const budget = numberOption("--budget", 1);
const rounds = numberOption("--rounds", 3);
const frames = numberOption("--frames", 400);
const profile = process.argv.includes("--profile");
// An occasion falls in a season, as on the site.
const asked = option("--season", "autumn");
const occasions = { halloween: "autumn", newyear: "winter" };
const season = { season: occasions[asked] ?? asked, occasion: occasions[asked] ? asked : null };

// Intel's hybrid CPUs have fast and slow cores, and a thread that moves between them takes up to twice as long per
// frame. Pinning the browser to the fast cores keeps the timings steady enough to compare.
const fastCores = "/sys/devices/cpu_core/cpus";
if (existsSync(fastCores) && !process.env.WORLD_BENCH_PINNED) {
  const run = spawnSync("taskset", ["-c", readFileSync(fastCores, "utf8").trim(), process.execPath, ...process.argv.slice(1)], {
    stdio: "inherit",
    env: { ...process.env, WORLD_BENCH_PINNED: "1" },
  });
  if (!run.error) process.exit(run.status ?? 1);
  console.warn(`Could not pin the browser to the fast cores (${run.error.message}), so the timings may be unsteady.\n`);
}

const SCENARIOS = [
  { name: "desktop, dusk, idle", w: 1440, h: 900, dpr: 1, night: 0, scene: "idle" },
  // A window filling a 1440p monitor: the most pixels a frame has to fill, so it is the scenario profiled.
  { name: "1440p, dusk, clicking", w: 2560, h: 1300, dpr: 1, night: 0, scene: "clicking" },
  { name: "desktop, dusk, clicking", w: 1440, h: 900, dpr: 1, night: 0, scene: "clicking" },
  { name: "desktop, night, clicking", w: 1440, h: 900, dpr: 1, night: 1, scene: "clicking" },
  { name: "phone, night, clicking", w: 390, h: 844, dpr: 3, night: 1, scene: "clicking" },
  { name: "desktop, night, storm", w: 1440, h: 900, dpr: 1, night: 1, scene: "storm" },
];

// The profiled copy wraps every draw and update call, and each animated layer, in the worker's timer. The layers are
// found by the line in render.js that draws them, so the profile says so if that line changes.
const LAYER_DRAW = "l.draw(l.c, Lf, K, P, Lf.t, rings);";
if (profile && !readFileSync(path.join(rootDir, "lib/world/render.js"), "utf8").includes(LAYER_DRAW)) {
  throw new Error(`--profile can no longer find where render.js draws each layer: update LAYER_DRAW to match it.`);
}
const profiled = (source) =>
  source
    .replace(/(?<![\w$])(?<![^.]\.)(?<!function )\b((?:draw|update)[A-Z]\w*)\(/g, "__T('$1', $1)(")
    .replace(LAYER_DRAW, `__T(LAYERS[layers.indexOf(l)].draw + ' layer', l.draw)${LAYER_DRAW.slice("l.draw".length)}`);

// The bench page and its worker, with the world's modules from the revision, the working tree, and the working tree
// profiled.
const page = `<!doctype html><meta charset="utf-8"><script type="module">
const worker = new Worker("/bench.worker.js", { type: "module" });
worker.onmessage = (e) => (window.result = e.data);
worker.postMessage(JSON.parse(new URLSearchParams(location.search).get("run")));
</script>`;
const server = await serveWorld(
  base,
  { "/": ["text/html", page], "/bench.worker.js": ["text/javascript", readFileSync(path.join(rootDir, "scripts/world-bench.worker.js"))] },
  { profiled },
);
// Firefox rounds performance.now() to the millisecond by default, too coarse to time a frame.
const browser = await launchFirefox({ "privacy.reduceTimerPrecision": false });
const tab = await browser.newPage();
const measure = (code, scenario) => runInPage(tab, server.origin, { ...scenario, ...season, code, frames }, `${code}, ${scenario.name}`);

const fmt = (ms) => ms.toFixed(2).padStart(6);
const median = (list) => [...list].sort((a, b) => a - b)[Math.floor(list.length / 2)];
let failed = false;
try {
  console.log(`Frame draw time in headless Firefox, ${base} against the working tree, ${rounds} rounds of ${frames} frames, ${asked}.\n`);
  const runs = SCENARIOS.map(() => ({ base: [], work: [] }));
  for (let round = 0; round < rounds; round++) {
    for (const [i, scenario] of SCENARIOS.entries()) {
      for (const code of round % 2 ? ["work", "base"] : ["base", "work"]) runs[i][code].push(await measure(code, scenario));
    }
  }
  console.log(`${"".padEnd(26)}${"base".padStart(8)}${"work".padStart(8)}  change`);
  for (const [i, scenario] of SCENARIOS.entries()) {
    const { base: b, work: w } = runs[i];
    const change = median(w.map((r, j) => r.mean - b[j].mean));
    const over = change > budget;
    failed ||= over;
    const mb = median(b.map((r) => r.mean));
    const mw = median(w.map((r) => r.mean));
    console.log(`${scenario.name.padEnd(26)}${fmt(mb)}  ${fmt(mw)}  ${change >= 0 ? "+" : ""}${change.toFixed(2)} ms (${((change / mb) * 100).toFixed(0)}%)${over ? "  over budget" : ""}`);
  }
  console.log(`\nMilliseconds per frame, mean. A frame at 60 fps has 16.7 ms for drawing, handing over and compositing.`);

  if (profile) {
    const scenario = SCENARIOS[1];
    const { mean, profile: rows } = await measure("profiled", scenario);
    console.log(`\nWhere the working tree's time goes, ${scenario.name}: ${mean.toFixed(2)} ms per frame with timers on.`);
    const children = (parent) =>
      rows.filter(([k]) => (parent ? k.startsWith(parent + " > ") && k.split(" > ").length === parent.split(" > ").length + 1 : !k.includes(" > ")));
    const show = (parent, depth) => {
      for (const [k, ms] of children(parent).sort((a, b) => b[1] - a[1])) {
        if (ms < 0.05) continue;
        console.log(`${fmt(ms)}  ${"  ".repeat(depth)}${k.split(" > ").pop()}`);
        show(k, depth + 1);
      }
    };
    show("", 0);
  }
} finally {
  await browser.close();
  server.close();
}
if (failed) {
  console.log(`\nOver budget: the working tree is more than ${budget} ms per frame slower than ${base}.`);
  process.exit(1);
}
