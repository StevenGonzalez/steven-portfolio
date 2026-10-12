"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";

type Nav = EventTarget & { currentEntry: { index: number }; entries(): { url: string | null }[] };

const names: Record<string, string> = { "/": "Home", "/insights": "Writing", "/projects": "Case studies" };

const nav = () => (globalThis as { navigation?: Nav }).navigation;

function subscribe(onChange: () => void) {
  nav()?.addEventListener("currententrychange", onChange);
  return () => nav()?.removeEventListener("currententrychange", onChange);
}

/** How many steps back the last page of this site is, and its name, as "steps name". Jumps within this page add
 *  entries too, so any with the same path are skipped. */
function previous() {
  const n = nav();
  if (!n) return null;
  const entries = n.entries();
  for (let i = n.currentEntry.index - 1; i >= 0; i--) {
    const url = entries[i].url;
    if (!url) return null;
    const path = new URL(url).pathname;
    if (path !== location.pathname) return `${n.currentEntry.index - i} ${names[path] ?? "Back"}`;
  }
  return null;
}

/** The link above an article or case study. When the reader came from another page of this site, it goes back there,
 *  to the spot they left, and is named after it. Otherwise it goes to the list the page belongs to. The previous page
 *  comes from the Navigation API, which only lists entries from this site; browsers without it keep the plain link. */
export default function BackCrumb({ href, label }: { href: string; label: string }) {
  const back = useSyncExternalStore(subscribe, previous, () => null);
  const [steps, name] = back ? [Number(back.slice(0, back.indexOf(" "))), back.slice(back.indexOf(" ") + 1)] : [0, label];

  return (
    <Link
      className="crumb"
      href={href}
      onClick={(e) => {
        if (!steps) return;
        e.preventDefault();
        history.go(-steps);
      }}
    >
      ← {name}
    </Link>
  );
}
