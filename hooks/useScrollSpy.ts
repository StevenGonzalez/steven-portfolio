import { useState, useEffect, useRef } from "react";

export function useScrollSpy(ids: string[]) {
  const [activeId, setActiveId] = useState<string>(ids[0] ?? "");
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ids.length) return;

    const updateFromHash = () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && ids.includes(hash)) setActiveId(hash);
    };

    updateFromHash();

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
        if (lastRect.top <= window.innerHeight) {
          nextId = lastEl.id;
        }
      }

      setActiveId((prev) => (prev === nextId ? prev : nextId));
    };

    const onScroll = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(pickActiveId);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    // Also check on resize as layout shifts
    window.addEventListener("resize", onScroll, { passive: true });
    
    // Initial check
    pickActiveId();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ids]);

  return activeId;
}
