import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

/** What the world costs to send: its own source, gzipped, measured when the page is built. The home page and the
 *  write-up both quote it, so they can never disagree. */
export function worldKb() {
  const dir = path.join(process.cwd(), "lib", "world");
  const source = readdirSync(dir)
    .filter((name) => name.endsWith(".js"))
    .map((name) => readFileSync(path.join(dir, name)));
  return Math.round(gzipSync(Buffer.concat(source)).length / 1024);
}
