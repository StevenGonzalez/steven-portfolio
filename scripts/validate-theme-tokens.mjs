// The dark theme is declared twice in globals.css, once for a visitor whose OS
// says dark and once for an explicit choice from the toggle. CSS cannot put a
// media query in a selector list, so that duplication is unavoidable, but a
// token added to only one of the two blocks fails silently: the theme keeps
// working for whichever half was edited and quietly falls back to the light
// value for the other. This asserts the two stay identical.

import { readFile } from "node:fs/promises";

const CSS_PATH = new URL("../app/globals.css", import.meta.url);

const MEDIA_SELECTOR = ':root:not([data-theme="light"])';
const ATTRIBUTE_SELECTOR = ':root[data-theme="dark"]';

/** Returns the body of the rule whose selector opens a line, by brace counting.
 *  Anchoring to the line start matters: these same selectors also appear inside
 *  the @custom-variant block, where matching them would silently parse a body
 *  holding no tokens at all and make this whole check pass on nothing. */
function extractBlock(css, selector) {
  const opener = new RegExp(`^[ \\t]*${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[ \\t]*\\{`, "m");
  const found = css.match(opener);
  if (!found) return null;

  const open = css.indexOf("{", found.index);
  if (open === -1) return null;

  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  return null;
}

/** Custom property declarations as a name -> value map, whitespace normalised.
 *  Values never contain a semicolon, so splitting on one is safe here. */
function parseTokens(block) {
  const tokens = new Map();

  for (const statement of block.split(";")) {
    const withoutComments = statement.replace(/\/\*[\s\S]*?\*\//g, "");
    const match = withoutComments.match(/(--[\w-]+)\s*:([\s\S]*)/);
    if (!match) continue;
    tokens.set(match[1], match[2].replace(/\s+/g, " ").trim());
  }

  return tokens;
}

const css = await readFile(CSS_PATH, "utf8");

const blocks = {
  ":root": extractBlock(css, ":root"),
  [MEDIA_SELECTOR]: extractBlock(css, MEDIA_SELECTOR),
  [ATTRIBUTE_SELECTOR]: extractBlock(css, ATTRIBUTE_SELECTOR),
};

const problems = [];

for (const [selector, block] of Object.entries(blocks)) {
  if (block === null) {
    problems.push(`Could not find the "${selector}" block in globals.css.`);
  } else if (parseTokens(block).size === 0) {
    problems.push(`The "${selector}" block parsed to zero tokens, so this check would prove nothing.`);
  }
}

if (problems.length === 0) {
  const light = parseTokens(blocks[":root"]);
  const mediaDark = parseTokens(blocks[MEDIA_SELECTOR]);
  const attributeDark = parseTokens(blocks[ATTRIBUTE_SELECTOR]);

  for (const name of new Set([...mediaDark.keys(), ...attributeDark.keys()])) {
    const inMedia = mediaDark.get(name);
    const inAttribute = attributeDark.get(name);

    if (inMedia === undefined) {
      problems.push(`${name} is set for an explicit dark choice but not when the OS asks for dark.`);
    } else if (inAttribute === undefined) {
      problems.push(`${name} is set when the OS asks for dark but not for an explicit dark choice.`);
    } else if (inMedia !== inAttribute) {
      problems.push(`${name} disagrees between the two dark blocks:\n    OS dark:       ${inMedia}\n    chosen dark:   ${inAttribute}`);
    }

    if (!light.has(name)) {
      problems.push(`${name} is declared for dark but has no light value in :root, so light gets nothing.`);
    }
  }
}

if (problems.length > 0) {
  console.error("Theme token check failed:\n");
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error("");
  process.exit(1);
}

const count = parseTokens(blocks[ATTRIBUTE_SELECTOR]).size;
console.log(`Validated ${count} theme tokens across both dark blocks.`);
