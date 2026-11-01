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

// The candle burns down while it is lit, by the seconds it has been lit in this browser, kept across visits. Burnt to
// a stub, it is swapped for a fresh one at the next visit.
const BURN_KEY = "candle",
  BURN_FOR = 30 * 60,
  BURN_TICK = 15;
const burnListeners = new Set<() => void>();
function litSeconds() {
  try {
    return Number(localStorage.getItem(BURN_KEY)) || 0;
  } catch {
    return 0;
  }
}
function setLitSeconds(n: number) {
  try {
    localStorage.setItem(BURN_KEY, String(n));
  } catch {
    // Storage can be blocked; the candle just does not burn.
  }
  for (const l of burnListeners) l();
}
const readBurn = () => Math.min(1, litSeconds() / BURN_FOR);
function subscribeBurn(l: () => void) {
  burnListeners.add(l);
  return () => burnListeners.delete(l);
}

/** The switch is a candle: lit while the page is dark, and blown out, with a wisp of smoke, when it turns light. While
 *  the theme follows the system, a small half-filled circle sits beside it. Hovered while lit, it draws a moth, which
 *  circles the flame and flutters off when the pointer leaves or the flame goes out. Left lit, it slowly burns down. */
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
  const [moth, setMoth] = useState<"in" | "off" | null>(null);
  if (moth === "in" && !lit) setMoth("off");

  const burn = useSyncExternalStore(subscribeBurn, readBurn, () => 0);
  useEffect(() => {
    if (litSeconds() >= BURN_FOR) setLitSeconds(0);
  }, []);
  useEffect(() => {
    if (!lit) return;
    const id = setInterval(() => {
      if (!document.hidden) setLitSeconds(Math.min(BURN_FOR, litSeconds() + BURN_TICK));
    }, BURN_TICK * 1000);
    return () => clearInterval(id);
  }, [lit]);
  // The top of the candle comes down from 11 to 17 as it burns, and the wick and flame with it. Wax runs down its sides
  // as it goes.
  const top = 11 + Math.round(burn * 60) / 10,
    drop = top - 11;

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
      onPointerEnter={(e) => {
        if (lit && e.pointerType !== "touch") setMoth("in");
      }}
      onPointerLeave={() => {
        if (moth === "in") setMoth("off");
      }}
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
        <rect x="9.5" y={top} width="5" height={21 - top} rx="0.8" />
        <path d={`M12 ${top}v-2`} />
        {burn > 0.15 && <path className="drip" d={`M14.6 ${top + 0.4}c.9.5 1 2 .3 2.8`} />}
        {burn > 0.45 && <path className="drip" d={`M9.4 ${top + 0.4}c-.9.6-1 2.4-.3 3.4`} />}
        {burn > 0.75 && <path className="drip" d={`M14.6 ${top + 1.6}c.8.4.9 1.4.3 2`} />}
        <g transform={drop ? `translate(0 ${drop})` : undefined}>
          {lit && <path className="flame" d="M12 2.6c1.7 2 2.5 3.5 2.5 4.6a2.5 2.5 0 0 1-5 0c0-1.1.8-2.6 2.5-4.6Z" />}
          {smoke > 0 && <path key={smoke} className="smoke" d="M12 8.5c-1.3-1.2 1.3-2.4 0-3.6s1.3-2.4 0-3.6" />}
        </g>
        {choice === "system" && (
          <>
            <circle cx="19.5" cy="5" r="2.5" strokeWidth="1.4" />
            <path className="half" d="M19.5 2.5a2.5 2.5 0 0 1 0 5Z" />
          </>
        )}
      </svg>
      {moth && (
        <span
          className={`moth ${moth}`}
          aria-hidden
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget && moth === "off") setMoth(null);
          }}
        >
          <span>
            <span />
          </span>
        </span>
      )}
    </button>
  );
}
