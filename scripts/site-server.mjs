// What the scripts that load the built site in a browser share: finding Chrome, and serving the build in .next.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { rootDir } from "./world-harness.mjs";

/** Chrome or Chromium: the CHROME environment variable, or the first one on the PATH. Exits if there is none. */
export function findChrome() {
  const chrome =
    process.env.CHROME ||
    ["google-chrome-stable", "google-chrome", "chromium", "chromium-browser"]
      .flatMap((name) => (process.env.PATH ?? "").split(path.delimiter).map((dir) => path.join(dir, name)))
      .find((file) => existsSync(file));
  if (!chrome) {
    console.error("Chrome not found: set CHROME to its path.");
    process.exit(2);
  }
  return chrome;
}

/** Serves the production build on a free port until the process exits, and returns its origin. Exits if there is no
 *  build, or if the site does not start. */
export async function startSite() {
  if (!existsSync(path.join(rootDir, ".next/BUILD_ID"))) {
    console.error("No production build: run yarn build first.");
    process.exit(2);
  }
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
  process.on("exit", () => server.kill());
  for (let tries = 0; ; tries++) {
    try {
      if ((await fetch(origin)).ok) return origin;
    } catch {
      // Not listening yet.
    }
    if (tries > 240) {
      console.error(`The site did not start at ${origin}.`);
      process.exit(2);
    }
    await new Promise((done) => setTimeout(done, 250));
  }
}
