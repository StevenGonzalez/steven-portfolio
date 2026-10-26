"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

type Nav = EventTarget & { currentEntry: { index: number }; entries(): { url: string | null }[] };

const names: Record<string, string> = { "/": "Home", "/insights": "Writing", "/projects": "Case studies" };

const nav = () => (globalThis as { navigation?: Nav }).navigation;

// Next pushes the next page's history entry while React is still putting that page in, and the browser reports the
// change at once, while this page's link is still listening. React must not be told of a change then, so it is told
// straight after.
function subscribe(onChange: () => void) {
  const later = () => queueMicrotask(onChange);
  nav()?.addEventListener("currententrychange", later);
  return () => nav()?.removeEventListener("currententrychange", later);
}

let back: { steps: number; url: string } | null = null;

/** The last page of this site before this one, and how many steps back it is. Jumps within this page add entries too,
 *  so any with the same path are skipped. The same object comes back until either changes, as useSyncExternalStore
 *  needs. */
function previous() {
  const n = nav();
  if (!n) return null;
  const entries = n.entries();
  for (let i = n.currentEntry.index - 1; i >= 0; i--) {
    const url = entries[i].url;
    if (!url) return null;
    if (new URL(url).pathname === location.pathname) continue;
    const steps = n.currentEntry.index - i;
    if (back?.steps !== steps || back.url !== url) back = { steps, url };
    return back;
  }
  return null;
}

/** The link above an article or case study. When the reader came from another page of this site, it goes back there,
 *  to the spot they left, and is named after it. Otherwise it goes to the list the page belongs to. The previous page
 *  comes from the Navigation API, which only lists entries from this site; browsers without it keep the plain link. A
 *  click that asks for a new tab or window opens the page the link names there, and leaves this one as it is. */
export default function BackCrumb({ href, label }: { href: string; label: string }) {
  const back = useSyncExternalStore(subscribe, previous, () => null);

  return (
    <Link
      className="crumb"
      href={back ? back.url : href}
      onClick={(e) => {
        if (!back || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        goBack(back.steps);
      }}
    >
      ← {back ? (names[new URL(back.url).pathname] ?? "Back") : label}
    </Link>
  );
}

const named = () => document.querySelectorAll<HTMLElement>("[data-vt]");

/** Goes `steps` back in history. React animates the page change of a link, but it applies a step through history at
 *  once, so the browser can put the scroll back; going back here runs the same transition itself. Whatever carries a
 *  data-vt name on this page and on the one it returns to (a case study's heading and scene, its card) is named for the
 *  transition, and only while it runs, so nothing else ever sees two elements of one name. */
function goBack(steps: number) {
  const go = () => history.go(-steps);
  const here = [...named()];
  if (!here.length || !document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches)
    return go();

  for (const el of here) el.style.viewTransitionName = el.dataset.vt!;
  const root = document.documentElement;
  const arrive = () => {
    root.style.scrollBehavior = "";
    for (const el of named())
      if (here.some((old) => old.dataset.vt === el.dataset.vt)) el.style.viewTransitionName = el.dataset.vt!;
  };
  const transition = document.startViewTransition(() =>
    new Promise<void>((done) => {
      // The page scrolls smoothly, so the browser would glide back to the reader's place only after the page it
      // returns to is pictured, and the card would be pictured where it was before. Put back at once, it is in place.
      root.style.scrollBehavior = "auto";
      addEventListener("popstate", () => setTimeout(done), { once: true });
      go();
    }).then(arrive),
  );
  transition.finished.finally(() => {
    for (const el of named()) el.style.viewTransitionName = "";
  });
}
