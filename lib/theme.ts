export type ThemeChoice = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

const THEME_COLOR: Record<"light" | "dark", string> = {
  light: "#ffffff",
  dark: "#0a0a0a",
};

/** Runs before first paint, inlined into the document. Only an explicit choice
 *  needs applying: with no attribute the stylesheet already follows the OS, so
 *  the common path costs nothing and cannot flash. */
export const themeBootstrapScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})()`;

export function readStoredChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return stored === "light" || stored === "dark" ? stored : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(choice: ThemeChoice): "light" | "dark" {
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

export function setTheme(choice: ThemeChoice) {
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

/** The document ships two theme-color tags scoped by media query, which is the
 *  right answer until someone overrides the OS. Once JavaScript is in play,
 *  collapse them to the single resolved colour so the mobile browser chrome
 *  tracks the actual theme rather than the system preference. */
function syncThemeColor(resolved: "light" | "dark") {
  const existing = document.querySelectorAll('meta[name="theme-color"]');
  existing.forEach((tag, index) => {
    if (index > 0) tag.remove();
  });

  let meta = existing[0] ?? null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    document.head.appendChild(meta);
  }

  meta.removeAttribute("media");
  meta.setAttribute("content", THEME_COLOR[resolved]);
}
