"use client";

import { useEffect, useSyncExternalStore, type ReactNode } from "react";
import {
  applyTheme,
  readStoredChoice,
  subscribeToTheme,
  switchTheme,
  type ThemeChoice,
} from "@/lib/theme";

const ICONS: Record<ThemeChoice, ReactNode> = {
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
      aria-label={`Theme: ${choice}. Switch to ${next}.`}
      title={`Theme: ${choice}`}
      className="theme"
      onClick={(e) => {
        const b = e.currentTarget.getBoundingClientRect();
        switchTheme(next, { x: b.left + b.width / 2, y: b.top + b.height / 2 });
      }}
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
