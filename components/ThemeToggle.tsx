"use client";

import { useEffect, useSyncExternalStore } from "react";
import {
  applyTheme,
  readStoredChoice,
  setTheme,
  subscribeToTheme,
  type ThemeChoice,
} from "../lib/theme";

const ICONS: Record<ThemeChoice, React.ReactNode> = {
  light: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  system: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M9 20h6M12 16v4" />
    </>
  ),
  dark: <path d="M20 13.5A8.5 8.5 0 1 1 10.5 4a6.7 6.7 0 0 0 9.5 9.5Z" />,
};

const LABELS: Record<ThemeChoice, string> = {
  light: "light",
  system: "system",
  dark: "dark",
};

const ORDER: ThemeChoice[] = ["system", "light", "dark"];

// The server cannot know the stored choice, so it renders the default. React
// re-renders with the real value straight after hydration, which swaps the icon
// rather than the theme: the page itself was already correct, set by the
// bootstrap script before the first paint.
const serverChoice = (): ThemeChoice => "system";

export default function ThemeToggle() {
  const choice = useSyncExternalStore(subscribeToTheme, readStoredChoice, serverChoice);

  // While following the system, the OS flipping does not change the attribute
  // (the stylesheet handles that on its own), but the browser chrome colour
  // still has to be told.
  useEffect(() => {
    if (choice !== "system") return;

    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [choice]);

  const next = ORDER[(ORDER.indexOf(choice) + 1) % ORDER.length];

  return (
    <button
      type="button"
      aria-label={`Theme: ${LABELS[choice]}. Switch to ${LABELS[next]}.`}
      title={`Theme: ${LABELS[choice]}`}
      className="focus-accent inline-flex items-center justify-center rounded-full border border-zinc-200/80 bg-white/70 p-1.5 text-zinc-700 transition hover:border-accent/35 hover:text-accent dark:border-zinc-800/80 dark:bg-black/30 dark:text-zinc-300"
      onClick={() => setTheme(next)}
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {ICONS[choice]}
      </svg>
    </button>
  );
}
