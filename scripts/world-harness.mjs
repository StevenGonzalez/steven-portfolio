// What the world's headless scripts share: a local server for the world's modules, from the working tree and from a
// git revision, so two versions of the code run side by side in the same browser, and a muted headless Firefox to run
// them in. Firefox on Linux draws canvases on the CPU, so it is the slowest place the world runs, and the one worth
// guarding.
//
// Needs Firefox: set FIREFOX to its path if it is not on the PATH.

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer-core";

export const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// The value after `name` on the command line, or `fallback`.
export function option(name, fallback) {
  const args = process.argv.slice(2);
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
}

// The positive number after `name` on the command line, or `fallback`. Anything else stops the script, since a
// number that is not one would quietly turn a check off.
export function numberOption(name, fallback) {
  const value = Number(option(name, fallback));
  if (!(value > 0)) {
    console.error(`${name} takes a positive number.`);
    process.exit(2);
  }
  return value;
}

// Serves `pages`, a map from path to [content type, body], /seeded-random.js, and the world's modules: /base/<name>
// from the revision `base`, /work/<name> from the working tree, and /<variant>/<name> from the working tree through
// that variant's transform. The modules import each other without extensions, so those resolve here too. Resolves to
// the origin, and a function that stops the server.
export async function serveWorld(base, pages, variants = {}) {
  pages = { ...pages, "/seeded-random.js": ["text/javascript", readFileSync(path.join(rootDir, "scripts/seeded-random.js"))] };
  // The revision is pinned to its commit before anything runs, so a commit made during a run that names HEAD cannot
  // move the base under the scenarios still to come.
  let commit;
  try {
    commit = execFileSync("git", ["-C", rootDir, "rev-parse", "--verify", `${base}^{commit}`], { encoding: "utf8", stdio: "pipe" }).trim();
  } catch {
    console.error(`${base} is not a revision of this repository.`);
    process.exit(2);
  }
  const moduleSource = (code, name) => {
    const file = `lib/world/${name}.js`;
    if (code === "base") return execFileSync("git", ["-C", rootDir, "show", `${commit}:${file}`], { encoding: "utf8", stdio: "pipe" });
    const source = readFileSync(path.join(rootDir, file), "utf8");
    return code === "work" ? source : variants[code](source);
  };
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://localhost");
    const send = (type, body) => res.writeHead(200, { "content-type": type, "cache-control": "no-store" }).end(body);
    const m = url.pathname.match(/^\/(\w+)\/([\w-]+)(\.js)?$/);
    try {
      if (Object.hasOwn(pages, url.pathname)) return send(...pages[url.pathname]);
      if (m && (m[1] === "base" || m[1] === "work" || Object.hasOwn(variants, m[1]))) return send("text/javascript", moduleSource(m[1], m[2]));
    } catch {
      // A module the revision does not have, or a bad path: a 404, which fails the import with its name.
    }
    res.writeHead(404).end();
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  return { origin: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}

// Headless Firefox with its sound turned all the way down, so nothing it runs is ever heard.
export function launchFirefox(prefs = {}) {
  const firefox =
    process.env.FIREFOX || (process.env.PATH ?? "").split(path.delimiter).map((dir) => path.join(dir, "firefox")).find((file) => existsSync(file));
  if (!firefox) throw new Error("Firefox not found: set FIREFOX to its path.");
  return puppeteer.launch({ browser: "firefox", executablePath: firefox, headless: true, extraPrefsFirefox: { "media.volume_scale": "0.0", ...prefs } });
}

// Loads `origin` in `tab` with `run` in its query string, waits for the page to set window.result, and returns it.
export async function runInPage(tab, origin, run, label) {
  await tab.goto(`${origin}/?run=${encodeURIComponent(JSON.stringify(run))}`);
  await tab.waitForFunction(() => window.result, { timeout: 900000, polling: 200 });
  const result = await tab.evaluate(() => window.result);
  if (result.error) throw new Error(`${label}: ${result.error}`);
  return result;
}
