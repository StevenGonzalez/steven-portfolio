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
    <nav aria-label="On this page">
      <h2>On this page</h2>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={item.id === activeId ? "true" : undefined}
              onClick={(e) => handleLinkClick(e, item.id)}
            >
              {item.label}
            </a>
          </li>
        ))}
        <li>
          <button type="button" className="top" onClick={handleBackToTop}>
            Back to top
          </button>
        </li>
      </ul>
    </nav>
  );
}
