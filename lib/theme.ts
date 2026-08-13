export type ThemeChoice = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

const THEME_COLOR: Record<"light" | "dark", string> = {
  light: "#ffffff",
  dark: "#0a0a0a",
};

/** The theme-color tag is created and owned here rather than rendered from the
 *  viewport export. React deletes the metadata nodes it owns on every client
 *  navigation, so a tag React rendered cannot also be edited from outside the
 *  tree: detaching one leaves React deleting a node whose parent is already
 *  null, which throws during the commit and breaks navigation entirely. The
 *  cost of owning it here is that the tag is absent with JavaScript disabled,
 *  which loses the browser chrome tint and nothing else. */
const THEME_COLOR_META_ID = "theme-color";

/** Runs before first paint, inlined into the document. The attribute is only
 *  needed for an explicit choice, since with no attribute the stylesheet
 *  already follows the OS; the theme-color tag has to be written either way so
 *  the browser chrome is right on the first frame. */
export const themeBootstrapScript = `(function(){try{var d=document,s=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)}),e=s==="light"||s==="dark";if(e){d.documentElement.setAttribute("data-theme",s)}var k=e?s==="dark":matchMedia("(prefers-color-scheme: dark)").matches,m=d.createElement("meta");m.id=${JSON.stringify(
  THEME_COLOR_META_ID,
)};m.name="theme-color";m.content=k?${JSON.stringify(THEME_COLOR.dark)}:${JSON.stringify(
  THEME_COLOR.light,
)};d.head.appendChild(m)}catch(x){}})()`;

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
