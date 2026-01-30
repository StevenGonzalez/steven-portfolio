"use client";

import { useEffect, useMemo, useState } from "react";

type SectionItem = {
  id: string;
  label: string;
};

export default function SectionRail({ items }: { items: SectionItem[] }) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");

  const ids = useMemo(() => items.map((item) => item.id), [items]);

  useEffect(() => {
    if (!ids.length) return;

    const updateFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && ids.includes(hash)) setActiveId(hash);
    };
    updateFromHash();
    window.addEventListener("hashchange", updateFromHash);

    const observer = new IntersectionObserver(
      (entries) => {
        const candidates = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => {
            if (b.intersectionRatio !== a.intersectionRatio) return b.intersectionRatio - a.intersectionRatio;
            return a.boundingClientRect.top - b.boundingClientRect.top;
          });

        const nextId = candidates[0]?.target?.id;
        if (nextId) setActiveId(nextId);
      },
      {
        root: null,
        rootMargin: "-35% 0px -55% 0px",
        threshold: [0, 0.1, 0.25, 0.5, 0.75, 1],
      },
    );

    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    for (const el of elements) observer.observe(el);

    return () => {
      window.removeEventListener("hashchange", updateFromHash);
      observer.disconnect();
    };
  }, [ids]);

  return (
    <nav aria-label="On this page" className="text-sm">
      <div className="mb-3 text-xs font-medium tracking-wide text-zinc-500 dark:text-zinc-400">On this page</div>
      <ul className="space-y-1">
        {items.map((item) => {
          const isActive = item.id === activeId;

          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                onClick={(e) => {
                  const el = document.getElementById(item.id);
                  if (!el) return;

                  e.preventDefault();

                  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
                  el.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
                  history.replaceState(null, "", `#${item.id}`);
                }}
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
          onClick={() => {
            const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
            window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
            if (items[0]?.id) {
              history.replaceState(null, "", "#");
              setActiveId(items[0].id);
            }
          }}
          className="rounded-md px-3 py-1.5 text-left text-zinc-600 transition hover:text-zinc-900 focus-accent dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Back to top
        </button>
      </div>
    </nav>
  );
}
