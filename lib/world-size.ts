import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { minify_sync } from "terser";

const dir = path.join(process.cwd(), "lib", "world");

/** What some of the world's files cost to send, minified and gzipped, measured when the page is built. */
function gzippedKb(names: string[]) {
  const code = names.map((name) => minify_sync(readFileSync(path.join(dir, name), "utf8"), { module: true }).code);
  return Math.round(gzipSync(code.join("\n")).length / 1024);
}

/** What the world costs to send. The home page and the write-up both quote it, so they can never disagree. */
export function worldKb() {
  return gzippedKb(readdirSync(dir).filter((name) => name.endsWith(".js")));
}

/** What the world's sound costs to send, which the page fetches only once sound is turned on. */
export function soundKb() {
  return gzippedKb(["sound.js"]);
}
