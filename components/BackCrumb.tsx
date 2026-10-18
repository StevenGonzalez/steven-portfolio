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
        history.go(-back.steps);
      }}
    >
      ← {back ? (names[new URL(back.url).pathname] ?? "Back") : label}
    </Link>
  );
}
