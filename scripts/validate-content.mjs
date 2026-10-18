// Checks the site's content: the projects and articles in data/, and that every article has a page and every page an
// entry. Node strips the types from the data files as it imports them; it warns that it had to work out that they
// are modules, which the yarn script turns off.

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { insights } from "../data/insights.ts";
import { projects } from "../data/projects.ts";
import { slugify } from "../lib/slug.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const insightsDir = path.join(rootDir, "app", "insights");
const publicDir = path.join(rootDir, "public");

function assertUniqueSlugs(items, label) {
  const seen = new Set();

  for (const item of items) {
    if (seen.has(item.slug)) {
      throw new Error(`Duplicate ${label} slug found: ${item.slug}`);
    }
    seen.add(item.slug);
  }
}

function assertRequiredString(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string.`);
  }
}

function assertIsoDate(value, label) {
  const time = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? Date.parse(value) : NaN;
  if (Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== value) {
    throw new Error(`${label} must be a real date written as YYYY-MM-DD.`);
  }
}

function assertStringArray(value, label) {
  if (!Array.isArray(value) || value.length === 0 || value.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) {
    throw new Error(`${label} must be a non-empty string array.`);
  }
}

// The size a WebP file declares in its header, for each of the format's three kinds of file.
function webpSize(file) {
  const kind = file.toString("ascii", 12, 16);
  if (kind === "VP8X") return [1 + file.readUIntLE(24, 3), 1 + file.readUIntLE(27, 3)];
  if (kind === "VP8L") {
    const bits = file.readUInt32LE(21);
    return [1 + (bits & 0x3fff), 1 + ((bits >>> 14) & 0x3fff)];
  }
  if (kind === "VP8 ") return [file.readUInt16LE(26) & 0x3fff, file.readUInt16LE(28) & 0x3fff];
  return null;
}

// The page reserves each screenshot's space from the size written beside it, so that has to be the file's.
async function validateShot(shot, label) {
  assertRequiredString(shot.src, `${label} src`);
  assertRequiredString(shot.alt, `${label} alt`);
  assertRequiredString(shot.caption, `${label} caption`);
  const file = await readFile(path.join(publicDir, shot.src));
  const size = file.toString("ascii", 0, 4) === "RIFF" && file.toString("ascii", 8, 12) === "WEBP" ? webpSize(file) : null;
  if (!size) throw new Error(`${label} ${shot.src} is not a WebP file.`);
  if (size[0] !== shot.width || size[1] !== shot.height) {
    throw new Error(`${label} ${shot.src} is ${size[0]} by ${size[1]}, not ${shot.width} by ${shot.height}.`);
  }
}

function validateProjects(projects) {
  assertUniqueSlugs(projects, "project");

  for (const project of projects) {
    assertRequiredString(project.slug, `Project ${project.title ?? "<unknown>"} slug`);
    assertRequiredString(project.title, `Project ${project.slug} title`);
    assertRequiredString(project.summary, `Project ${project.slug} summary`);
    assertRequiredString(project.scene, `Project ${project.slug} scene`);
    assertRequiredString(project.problem, `Project ${project.slug} problem`);
    assertRequiredString(project.approach, `Project ${project.slug} approach`);
    assertRequiredString(project.architecture, `Project ${project.slug} architecture`);
    assertRequiredString(project.tradeoffs, `Project ${project.slug} tradeoffs`);
    assertRequiredString(project.outcome, `Project ${project.slug} outcome`);
    assertStringArray(project.tags, `Project ${project.slug} tags`);

    if (project.links) {
      for (const link of project.links) {
        assertRequiredString(link.label, `Project ${project.slug} link label`);
        assertRequiredString(link.href, `Project ${project.slug} link href`);
      }
    }
  }
}

function validateInsights(insights, mdxSlugs) {
  assertUniqueSlugs(insights, "insight");

  for (const insight of insights) {
    assertRequiredString(insight.slug, `Insight ${insight.title ?? "<unknown>"} slug`);
    assertRequiredString(insight.title, `Insight ${insight.slug} title`);
    assertRequiredString(insight.summary, `Insight ${insight.slug} summary`);
    assertIsoDate(insight.date, `Insight ${insight.slug} date`);
    assertRequiredString(insight.category, `Insight ${insight.slug} category`);
    assertRequiredString(insight.readTime, `Insight ${insight.slug} readTime`);
    assertStringArray(insight.tags, `Insight ${insight.slug} tags`);
  }

  // The site lists them in this order and leads from each article to the one after it, so it must run newest first.
  for (let i = 1; i < insights.length; i++) {
    if (insights[i].date > insights[i - 1].date) {
      throw new Error(`Insight ${insights[i].slug} is newer than ${insights[i - 1].slug}, which comes before it.`);
    }
  }

  const metadataSlugs = new Set(insights.map((insight) => insight.slug));
  const routeSlugs = new Set(mdxSlugs);

  for (const slug of metadataSlugs) {
    if (!routeSlugs.has(slug)) {
      throw new Error(`Insight metadata exists without MDX route: ${slug}`);
    }
  }

  for (const slug of routeSlugs) {
    if (!metadataSlugs.has(slug)) {
      throw new Error(`Insight MDX route exists without metadata entry: ${slug}`);
    }
  }
}

// Each article's "On this page" list links to its sections by the ids mdx-components.tsx gives their headings. A
// heading reworded without its entry would leave a link that goes nowhere, and two headings with the same words would
// share an id.
async function validateArticleContents(slug) {
  const source = await readFile(path.join(insightsDir, slug, "page.mdx"), "utf8");
  const ids = [...source.matchAll(/^## (.+)$/gm)].map(([, heading]) => slugify(heading.replace(/\]\([^)]*\)/g, "]")));
  const links = [...source.matchAll(/href: "#([^"]+)"/g)].map(([, id]) => id);

  for (const id of ids) {
    if (ids.indexOf(id) !== ids.lastIndexOf(id)) throw new Error(`Insight ${slug} has two headings with the id ${id}.`);
  }
  let at = -1;
  for (const id of links) {
    const next = ids.indexOf(id);
    if (next < 0) throw new Error(`Insight ${slug} lists #${id} on this page, but no heading has that id.`);
    if (next < at) throw new Error(`Insight ${slug} lists #${id} out of the order its headings come in.`);
    at = next;
  }
}

async function getInsightMdxSlugs() {
  const entries = await readdir(insightsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function main() {
  validateProjects(projects);
  await Promise.all(projects.flatMap((project) => (project.shots ?? []).map((shot) => validateShot(shot, `Project ${project.slug} shot`))));
  const mdxSlugs = await getInsightMdxSlugs();
  validateInsights(insights, mdxSlugs);
  await Promise.all(mdxSlugs.map(validateArticleContents));

  process.stdout.write(`Validated ${projects.length} projects and ${insights.length} insights.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});