export type ThemeChoice = "system" | "light" | "dark";

const THEME_STORAGE_KEY = "theme";

// Each theme's --bg from app/globals.css, for the browser chrome. validate:theme checks they still match.
const THEME_COLOR: Record<"light" | "dark", string> = {
  light: "#e9ede8",
  dark: "#091318",
};

/** The theme-color tag is created and owned here rather than rendered from the
 *  viewport export. React deletes the metadata nodes it owns on every client
 *  navigation, so a tag React rendered cannot also be edited from outside the
 *  tree: detaching one leaves React deleting a node whose parent is already
 *  null, which throws during the commit and breaks navigation entirely. The
 *  cost of owning it here is that the tag is absent with JavaScript disabled,
 *  which loses the browser chrome tint and nothing else. */
const THEME_COLOR_META_ID = "theme-color";

/** Runs before first paint, inlined into the document as its source, so it can use nothing from outside itself. The
 *  attribute is only needed for an explicit choice, since with no attribute the stylesheet already follows the OS; the
 *  theme-color tag has to be written either way so the browser chrome is right on the first frame. */
function bootstrapTheme(storageKey: string, metaId: string, colors: Record<"light" | "dark", string>) {
  try {
    const stored = localStorage.getItem(storageKey);
    const explicit = stored === "light" || stored === "dark";
    if (explicit) document.documentElement.setAttribute("data-theme", stored);
    const dark = explicit ? stored === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    const meta = document.createElement("meta");
    meta.id = metaId;
    meta.name = "theme-color";
    meta.content = dark ? colors.dark : colors.light;
    document.head.appendChild(meta);
  } catch {
    // Storage can be blocked; the stylesheet then follows the OS, as for a visitor who never chose.
  }
}

export const themeBootstrapScript = `(${bootstrapTheme})(...${JSON.stringify([THEME_STORAGE_KEY, THEME_COLOR_META_ID, THEME_COLOR])})`;

export function readStoredChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

function resolveTheme(choice: ThemeChoice): "light" | "dark" {
  if (choice !== "system") return choice;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** The stored choice is external state that React does not own, so components
 *  read it through useSyncExternalStore rather than mirroring it into their own
 *  state. Only this tab's writes are broadcast: a `storage` event from another
 *  tab would move the control without moving the attribute on this document. */
const listeners = new Set<() => void>();

export function subscribeToTheme(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Something drawn in the theme's colours that needs a moment to get the other theme ready: the world on the home
 *  page, which has a worker paint it ahead of time. A switch waits for it rather than freezing while it repaints, and
 *  the new theme spreads out from the stage's own light when that light is on screen. */
export type ThemeStage = {
  prepare(dark: boolean): Promise<void>;
  origin(): { x: number; y: number } | null;
};

let stage: ThemeStage | null = null;

export function setThemeStage(next: ThemeStage) {
  stage = next;
  return () => {
    if (stage === next) stage = null;
  };
}

function currentTheme(): "light" | "dark" {
  const attribute = document.documentElement.getAttribute("data-theme");
  return attribute === "light" || attribute === "dark" ? attribute : resolveTheme("system");
}

/** Whether the page shows its dark theme: the explicit choice if there is one, otherwise the OS, as the stylesheet
 *  decides. */
export function isDarkTheme() {
  return currentTheme() === "dark";
}

/** Calls `listener` whenever the theme the page shows may have changed: a switch on this page, or the OS flipping
 *  while there is no explicit choice. Returns the unsubscribe. */
export function watchTheme(listener: () => void) {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const onSystem = () => {
    if (!document.documentElement.hasAttribute("data-theme")) listener();
  };
  query.addEventListener("change", onSystem);
  const unsubscribe = subscribeToTheme(listener);
  return () => {
    query.removeEventListener("change", onSystem);
    unsubscribe();
  };
}

let switching = false;

/** Switches theme with the new one growing outward through a soft-edged circle, from the stage's light or from
 *  `from` (the control that asked). A choice that leaves the resolved theme as it was swaps instantly. */
export async function switchTheme(choice: ThemeChoice, from: { x: number; y: number }) {
  if (switching) return;
  const dark = resolveTheme(choice) === "dark";
  if (dark === (currentTheme() === "dark")) return setTheme(choice);

  switching = true;
  try {
    await stage?.prepare(dark);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !document.startViewTransition) return setTheme(choice);

    document.documentElement.classList.add("theming");
    const transition = document.startViewTransition(() => setTheme(choice));
    // The browser skips the transition when the tab is hidden, and then `ready` rejects. The theme still switches; there
    // is just nothing to animate.
    try {
      await transition.ready;
    } catch {
      return;
    }
    const { x, y } = stage?.origin() ?? from;
    const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y)) * 1.5;
    document.documentElement.animate(
      { maskSize: ["0px 0px", `${r * 2}px ${r * 2}px`], maskPosition: [`${x}px ${y}px`, `${x - r}px ${y - r}px`] },
      {
        duration: 1300,
        easing: "cubic-bezier(.45, 0, .2, 1)",
        fill: "forwards",
        pseudoElement: "::view-transition-new(root)",
      },
    );
    await transition.finished;
  } finally {
    document.documentElement.classList.remove("theming");
    switching = false;
  }
}

function setTheme(choice: ThemeChoice) {
  applyTheme(choice);
  for (const listener of listeners) listener();
}

export function applyTheme(choice: ThemeChoice) {
  const root = document.documentElement;

  if (choice === "system") {
    root.removeAttribute("data-theme");
  } else {
    root.setAttribute("data-theme", choice);
  }

  try {
    if (choice === "system") {
      localStorage.removeItem(THEME_STORAGE_KEY);
    } else {
      localStorage.setItem(THEME_STORAGE_KEY, choice);
    }
  } catch {
    // Storage can be blocked (private mode, embedded webviews). The theme still
    // applies for this visit; it just will not survive a reload.
  }

  syncThemeColor(resolveTheme(choice));
}

/** Updates the tag the bootstrap script created. This only ever edits an
 *  attribute on a node React does not know about, so nothing here can disturb
 *  React's view of the document. */
function syncThemeColor(resolved: "light" | "dark") {
  let meta = document.getElementById(THEME_COLOR_META_ID);

  if (!meta) {
    meta = document.createElement("meta");
    meta.id = THEME_COLOR_META_ID;
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }

  meta.setAttribute("content", THEME_COLOR[resolved]);
}
