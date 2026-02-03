"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SectionItem = {
  id: string;
  label: string;
};

export default function SectionRail({ items }: { items: SectionItem[] }) {
  const [activeId, setActiveId] = useState<string>(items[0]?.id ?? "");
  const rafRef = useRef<number | null>(null);

  const ids = useMemo(() => items.map((item) => item.id), [items]);

  useEffect(() => {
    if (!ids.length) return;

    const updateFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && ids.includes(hash)) setActiveId(hash);
    };
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));

    const pickActiveId = () => {
      if (!elements.length) return;

      const scrollY = window.scrollY || window.pageYOffset || 0;
      const doc = document.documentElement;
      const maxScroll = doc.scrollHeight - window.innerHeight;

      const focusY = 120;

      if (scrollY <= 4) {
        setActiveId((prev) => (prev === elements[0].id ? prev : elements[0].id));
        return;
      }

      let nextId = elements[0].id;
      for (const el of elements) {
        const top = el.getBoundingClientRect().top;
        if (top <= focusY) nextId = el.id;
        else break;
      }

      if (maxScroll > 200 && scrollY >= maxScroll - 4) {
        const lastEl = elements[elements.length - 1];
        const lastRect = lastEl.getBoundingClientRect();
        if (lastRect.top < window.innerHeight * 0.8) nextId = lastEl.id;
      }

      setActiveId((prev) => (prev === nextId ? prev : nextId));
    };

    const schedule = () => {
      if (rafRef.current != null) return;
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        pickActiveId();
      });
    };

    updateFromHash();
    pickActiveId();

    window.addEventListener("hashchange", updateFromHash);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);

    return () => {
      window.removeEventListener("hashchange", updateFromHash);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
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
                  setActiveId(item.id);
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
