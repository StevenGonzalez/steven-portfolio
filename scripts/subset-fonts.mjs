// Cuts the site's fonts down to the characters it shows and the weights it uses, which halves what a first visit
// downloads. The full files are Google Fonts' Latin set, read from git history, so a character can be added later:
// add it to KEPT and run this. It needs fonttools and brotli (pip install fonttools brotli). validate-content fails
// when site text uses a character that KEPT leaves out, because the browser would quietly draw it in another font.
//
//   node scripts/subset-fonts.mjs

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Printable ASCII and every other character the site's text uses. É and Ö are é and ö under text-transform. */
export const KEPT = new Set([
  ...Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)),
  ..." ©²³·¹ÉÖéö–—‘’“”•…⁴⁵⁶←→",
]);

// The last commit with the full files.
const FULL = "6424dfb";
// The weights next/font declares in app/layout.tsx. A static font has no range to limit.
const FONTS = [
  ["cormorant-garamond", "wght=500:600"],
  ["cormorant-garamond-italic", "wght=500:600"],
  ["schibsted-grotesk", "wght=400:600"],
  ["ibm-plex-mono-400"],
  ["ibm-plex-mono-500"],
];
// tnum is here for font-variant-numeric: tabular-nums.
const FEATURES = "kern,liga,calt,tnum,ccmp,locl,mark,mkmk";

function subset() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const work = mkdtempSync(path.join(tmpdir(), "fonts-"));
  const unicodes = [...KEPT].map((c) => c.codePointAt(0).toString(16)).join(",");
  for (const [name, limit] of FONTS) {
    const file = `app/fonts/${name}.woff2`;
    let source = path.join(work, `${name}.woff2`);
    writeFileSync(source, execFileSync("git", ["show", `${FULL}:${file}`], { cwd: root, maxBuffer: 1 << 24 }));
    if (limit) {
      const limited = path.join(work, `${name}.limited.woff2`);
      execFileSync("fonttools", ["varLib.instancer", source, limit, "-q", "-o", limited]);
      source = limited;
    }
    execFileSync("pyftsubset", [
      source,
      `--unicodes=${unicodes}`,
      `--layout-features=${FEATURES}`,
      "--flavor=woff2",
      `--output-file=${path.join(root, file)}`,
    ]);
  }
  rmSync(work, { recursive: true });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) subset();
