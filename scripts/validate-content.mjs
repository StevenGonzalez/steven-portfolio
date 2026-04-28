import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const insightsDir = path.join(rootDir, "app", "insights");

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

function assertStringArray(value, label) {
  if (!Array.isArray(value) || value.length === 0 || value.some((entry) => typeof entry !== "string" || entry.trim().length === 0)) {
    throw new Error(`${label} must be a non-empty string array.`);
  }
}

function validateProjects(projects) {
  assertUniqueSlugs(projects, "project");

  for (const project of projects) {
    assertRequiredString(project.slug, `Project ${project.title ?? "<unknown>"} slug`);
    assertRequiredString(project.title, `Project ${project.slug} title`);
    assertRequiredString(project.summary, `Project ${project.slug} summary`);
    assertRequiredString(project.image, `Project ${project.slug} image`);
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
    assertRequiredString(insight.date, `Insight ${insight.slug} date`);
    assertRequiredString(insight.category, `Insight ${insight.slug} category`);
    assertRequiredString(insight.readTime, `Insight ${insight.slug} readTime`);
    assertStringArray(insight.tags, `Insight ${insight.slug} tags`);
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

async function getInsightMdxSlugs() {
  const entries = await readdir(insightsDir, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

async function loadContentModule(relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  const source = await readFile(absolutePath, "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: absolutePath,
  });

  const compiledModule = { exports: {} };
  const evaluateModule = new Function("exports", "module", transpiled.outputText);

  evaluateModule(compiledModule.exports, compiledModule);

  return compiledModule.exports;
}

async function main() {
  const [{ projects }, { insights }, mdxSlugs] = await Promise.all([
    loadContentModule("data/projects.ts"),
    loadContentModule("data/insights.ts"),
    getInsightMdxSlugs(),
  ]);

  validateProjects(projects);
  validateInsights(insights, mdxSlugs);

  process.stdout.write(`Validated ${projects.length} projects and ${insights.length} insights.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});