// Checks that a change to the world's sound code makes exactly the sound it made before. It renders the sound from a
// git revision and from the working tree through the same script, offline in headless Firefox, in each of the four
// keys, and compares them a second at a time. Nothing is played aloud. A change meant only to tidy the code should
// pass; one meant to change the sound fails, at the first second that differs and what was playing then.
//
//   yarn check:sound                 compare the working tree with HEAD
//   yarn check:sound --base main     compare it with another revision
//   yarn check:sound --a work        run the working tree on both sides, to show the script itself gives the same
//                                    sound every run
//
// It also fails if the working tree's sound has a sample that is not a number, which a speaker plays as silence or a
// click, or peaks above full scale.

import { readFileSync } from "node:fs";
import path from "node:path";
import { launchFirefox, option, rootDir, runInPage, serveWorld } from "./world-harness.mjs";

const base = option("--base", "HEAD");
const A = option("--a", "base");
const B = option("--b", "work");

const KEYS = [
  { name: "dusk", night: false, occasion: null },
  { name: "night", night: true, occasion: null },
  { name: "dusk, Halloween", night: false, occasion: "halloween" },
  { name: "night, Halloween", night: true, occasion: "halloween" },
];
// Every sound the working tree's sound code can play, in the order it lists them.
const source = readFileSync(path.join(rootDir, "lib/world/sound.js"), "utf8");
const table = source.slice(
  source.indexOf("const SOUNDS = {"),
  source.indexOf("\n  };", source.indexOf("const SOUNDS = {")),
);
const sounds = [...table.matchAll(/^ {4}(\w+)\(t\b/gm)].map((m) => m[1]);

const page = `<!doctype html><meta charset="utf-8"><script type="module" src="/check.js"></script>`;
const server = await serveWorld(base, {
  "/": ["text/html", page],
  "/check.js": ["text/javascript", readFileSync(path.join(rootDir, "scripts/sound-check.page.js"))],
});
const browser = await launchFirefox();
const tab = await browser.newPage();
const run = (code, key) => runInPage(tab, server.origin, { ...key, code, sounds }, `${code}, ${key.name}`);

let differ = 0;
try {
  const label = (code) => (code === "base" ? base : code === "work" ? "the working tree" : code);
  console.log(`The sound made by ${label(A)} and by ${label(B)}: ${sounds.length} sounds and the song, in each key.\n`);
  for (const key of KEYS) {
    const t0 = Date.now();
    const a = await run(A, key);
    const b = await run(B, key);
    // Both sides play the same script, so they render the same number of seconds.
    const first = a.out.find((x, i) => x.hash !== b.out[i].hash);
    const faults = [
      b.broken && `${b.broken} samples that are not numbers`,
      b.peak > 1 && `a peak of ${b.peak.toFixed(2)}`,
    ].filter(Boolean);
    if (first || faults.length) differ++;
    const db = (20 * Math.log10(b.peak)).toFixed(1);
    const secs = ((Date.now() - t0) / 1000).toFixed(0);
    const status = first ? "DIFFERS" : faults.length ? "BROKEN " : "same   ";
    console.log(`${status}  ${key.name.padEnd(24)} ${b.out.length} s, peak ${db} dB, ${secs} s to check`);
    if (first) console.log(`  first at second ${first.second}, during ${first.playing}`);
    if (faults.length) console.log(`  ${label(B)} has ${faults.join(" and ")}`);
  }
} finally {
  await browser.close();
  server.close();
}
if (differ) {
  console.log(`\n${differ} key${differ > 1 ? "s" : ""} sounded different, or broken.`);
  process.exit(1);
}
