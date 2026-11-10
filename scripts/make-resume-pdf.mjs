// Prints the /resume page to public/resume.pdf with Chrome, and records which version of the page it came from, so
// yarn validate:content can fail when the page has changed and the PDF has not.
//
//   yarn build && yarn make:resume

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { findChrome, startSite } from "./site-server.mjs";
import { rootDir } from "./world-harness.mjs";

const origin = await startSite();
const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: process.env.CI ? ["--no-sandbox"] : [],
});
const page = await browser.newPage();
await page.goto(`${origin}/resume`, { waitUntil: "networkidle0" });
await page.evaluate(() => document.fonts.ready);
await page.pdf({ path: path.join(rootDir, "public/resume.pdf"), format: "Letter", preferCSSPageSize: true });
await browser.close();

const source = await readFile(path.join(rootDir, "app/resume/page.tsx"), "utf8");
const hash = createHash("sha256").update(source.replaceAll("\r\n", "\n")).digest("hex");
await writeFile(path.join(rootDir, "data/resume-pdf.sha256"), `${hash}\n`);
console.log("Wrote public/resume.pdf.");
process.exit(0);
