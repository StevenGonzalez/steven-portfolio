"use client";

import { useLayoutEffect, useMemo, useRef } from "react";
import { useScrollSpy } from "@/hooks/useScrollSpy";

type SectionItem = {
  id: string;
  label: string;
};

export default function SectionRail({ items }: { items: SectionItem[] }) {
  const ids = useMemo(() => items.map((item) => item.id), [items]);
  const activeId = useScrollSpy(ids);
  const list = useRef<HTMLUListElement>(null);
  const ribbon = useRef<HTMLSpanElement>(null);

  // A bookmark ribbon hangs from the top of the list down to the section being read, and its notched end sits just
  // below that section's name. It is measured off the links, so it follows when they wrap or the fonts arrive.
  useLayoutEffect(() => {
    const ul = list.current,
      r = ribbon.current;
    if (!ul || !r) return;
    const place = () => {
      const a = ul.querySelector<HTMLElement>('a[aria-current="true"]');
      r.style.top = `${ul.offsetTop - 6}px`;
      r.style.height = a ? `${a.offsetTop - ul.offsetTop + a.offsetHeight + 14}px` : "0";
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(ul);
    return () => ro.disconnect();
  }, [activeId]);

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
      <span ref={ribbon} className="ribbon" aria-hidden="true" />
      <ul ref={list}>
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
