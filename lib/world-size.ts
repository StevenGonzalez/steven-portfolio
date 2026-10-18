import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const dir = path.join(process.cwd(), "lib", "world");

/** What some of the world's files cost to send: their source, gzipped, measured when the page is built. */
function gzippedKb(names: string[]) {
  const source = names.map((name) => readFileSync(path.join(dir, name)));
  return Math.round(gzipSync(Buffer.concat(source)).length / 1024);
}

/** What the world costs to send. The home page and the write-up both quote it, so they can never disagree. */
export function worldKb() {
  return gzippedKb(readdirSync(dir).filter((name) => name.endsWith(".js")));
}

/** What the world's sound costs to send, which the page fetches only once sound is turned on. */
export function soundKb() {
  return gzippedKb(["sound.js"]);
}
