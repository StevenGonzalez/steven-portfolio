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

  // The page's scroll-behavior decides whether this glides, and reduced motion turns that off. The section's name comes
  // off the address, so a reload starts at the top too.
  const handleBackToTop = () => {
    window.scrollTo({ top: 0 });
    history.replaceState(null, "", location.pathname + location.search);
  };

  if (!items.length) return null;

  return (
    <nav aria-label="On this page">
      <h2>On this page</h2>
      <ul>
        {/* Plain links: the browser scrolls to the section, clear of the header, records the step in history and
            starts keyboard focus from there. */}
        {items.map((item) => (
          <li key={item.id}>
            <a href={`#${item.id}`} aria-current={item.id === activeId ? "true" : undefined}>
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
