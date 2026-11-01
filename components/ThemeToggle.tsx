"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import {
  applyTheme,
  isDarkTheme,
  readStoredChoice,
  subscribeToTheme,
  switchTheme,
  watchTheme,
  type ThemeChoice,
} from "@/lib/theme";

const ORDER: ThemeChoice[] = ["system", "light", "dark"];

// The server cannot know the stored choice, so it renders the default. React
// re-renders with the real value straight after hydration, which swaps the icon
// rather than the theme: the page itself was already correct, set by the
// bootstrap script before the first paint.
const serverChoice = (): ThemeChoice => "system";

/** The switch is a candle: lit while the page is dark, and blown out, with a wisp of smoke, when it turns light. While
 *  the theme follows the system, a small half-filled circle sits beside it. */
export default function ThemeToggle() {
  const choice = useSyncExternalStore(subscribeToTheme, readStoredChoice, serverChoice);
  const lit = useSyncExternalStore(watchTheme, isDarkTheme, () => false);

  // The smoke rises only when the flame goes out, not when the page first loads light. Each puff is a fresh element,
  // so its animation plays from the start.
  const [wasLit, setWasLit] = useState(lit);
  const [smoke, setSmoke] = useState(0);
  if (wasLit !== lit) {
    setWasLit(lit);
    if (wasLit) setSmoke(smoke + 1);
  }

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
      className={lit ? "theme lit" : "theme"}
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
        <path d="M7 21h10" />
        <rect x="9.5" y="11" width="5" height="10" rx="0.8" />
        <path d="M12 11V9" />
        {lit && <path className="flame" d="M12 2.6c1.7 2 2.5 3.5 2.5 4.6a2.5 2.5 0 0 1-5 0c0-1.1.8-2.6 2.5-4.6Z" />}
        {smoke > 0 && <path key={smoke} className="smoke" d="M12 8.5c-1.3-1.2 1.3-2.4 0-3.6s1.3-2.4 0-3.6" />}
        {choice === "system" && (
          <>
            <circle cx="19.5" cy="5" r="2.5" strokeWidth="1.4" />
            <path className="half" d="M19.5 2.5a2.5 2.5 0 0 1 0 5Z" />
          </>
        )}
      </svg>
    </button>
  );
}
