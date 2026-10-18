// The dark theme is declared twice in globals.css, once for a visitor whose OS
// says dark and once for an explicit choice from the toggle. CSS cannot put a
// media query in a selector list, so that duplication is unavoidable, but a
// token added to only one of the two blocks fails silently: the theme keeps
// working for whichever half was edited and quietly falls back to the light
// value for the other. This asserts the two stay identical.
//
// It also checks the copies of the tokens that live outside the stylesheet, in code that cannot read it: the browser
// chrome's colour in lib/theme.ts and the share cards' night palette in lib/og.tsx.

import { readFile } from "node:fs/promises";

const CSS_PATH = new URL("../app/globals.css", import.meta.url);
const THEME_PATH = new URL("../lib/theme.ts", import.meta.url);
const OG_PATH = new URL("../lib/og.tsx", import.meta.url);

const MEDIA_SELECTOR = ':root:not([data-theme="light"])';
const ATTRIBUTE_SELECTOR = ':root[data-theme="dark"]';

/** Returns the body of the rule whose selector opens a line, by brace counting.
 *  Anchoring to the line start keeps it from matching the selector where a
 *  comment or another rule merely mentions it. */
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

/** The first group `pattern` captures in `source`, or null. */
function find(source, pattern) {
  return source.match(pattern)?.[1] ?? null;
}

/** "#78dccb" as the "120, 220, 203" that lib/og.tsx writes into rgb() and rgba(). */
function channels(hex) {
  return hex && [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(", ");
}

const css = await readFile(CSS_PATH, "utf8");
const themeSource = await readFile(THEME_PATH, "utf8");
const ogSource = await readFile(OG_PATH, "utf8");

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

  const dark = (name) => attributeDark.get(name);
  const checkCopy = (name, value, token, expected) => {
    if (value === null) problems.push(`Could not find ${name}, so it cannot be checked against ${token}.`);
    else if (value !== expected) problems.push(`${name} is ${value}, but ${token} is ${expected}.`);
  };
  checkCopy("THEME_COLOR.light in lib/theme.ts", find(themeSource, /^\s*light: "([^"]*)",$/m), "--bg", light.get("--bg"));
  checkCopy("THEME_COLOR.dark in lib/theme.ts", find(themeSource, /^\s*dark: "([^"]*)",$/m), "dark --bg", dark("--bg"));
  checkCopy("BG in lib/og.tsx", find(ogSource, /^const BG = "([^"]*)";$/m), "dark --bg", channels(dark("--bg")));
  checkCopy("GLOW in lib/og.tsx", find(ogSource, /^const GLOW = "([^"]*)";$/m), "dark --glow", channels(dark("--glow")));
  checkCopy("FG in lib/og.tsx", find(ogSource, /^const FG = "([^"]*)";$/m), "dark --fg", dark("--fg"));
  checkCopy("MUTED in lib/og.tsx", find(ogSource, /^const MUTED = "([^"]*)";$/m), "dark --muted", dark("--muted"));
}

if (problems.length > 0) {
  console.error("Theme token check failed:\n");
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error("");
  process.exit(1);
}

const count = parseTokens(blocks[ATTRIBUTE_SELECTOR]).size;
console.log(`Validated ${count} theme tokens across both dark blocks, and their copies in lib/theme.ts and lib/og.tsx.`);
