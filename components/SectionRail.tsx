"use client";

import { useMemo } from "react";
import { useScrollSpy } from "@/hooks/useScrollSpy";

type SectionItem = {
  id: string;
  label: string;
};

export default function SectionRail({ items }: { items: SectionItem[] }) {
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const activeId = useScrollSpy(ids);

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
    history.replaceState(null, "", `#${id}`);
  };

  const handleBackToTop = () => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    if (items[0]?.id) {
      history.replaceState(null, "", "#");
    }
  };

  if (!items.length) return null;

  return (
    <nav aria-label="On this page" className="text-sm">
      <div className="mb-3 text-xs font-medium tracking-wide text-zinc-500 dark:text-zinc-400">
        On this page
      </div>
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive = item.id === activeId;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => handleLinkClick(e, item.id)}
                className={`group relative block rounded-md px-3 py-1.5 transition focus-accent ${
                  isActive
                    ? "text-accent"
                    : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full transition ${
                    isActive
                      ? "bg-accent opacity-100"
                      : "bg-zinc-200 opacity-0 group-hover:opacity-70 dark:bg-zinc-800"
                  }`}
                />
                <span className="pl-2">{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 border-t border-zinc-200 pt-3 dark:border-zinc-800">
        <button
          type="button"
          onClick={handleBackToTop}
          className="rounded-md px-3 py-1.5 text-left text-zinc-600 transition hover:text-zinc-900 focus-accent dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Back to top
        </button>
      </div>
    </nav>
  );
}
