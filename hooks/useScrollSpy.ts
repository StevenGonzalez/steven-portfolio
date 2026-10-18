import { useState, useEffect } from "react";

// Within this many pixels of the top or the bottom of the page counts as being there.
const EDGE = 4;
// A page that scrolls less than this never jumps to its last section for reaching the bottom.
const SHORT_PAGE = 200;
// How far below where a link leaves a section, clear of the header, its top may be and still count as reached.
const SLACK = 24;

/** The id of the section being read: the last one whose top has scrolled up under the header, or the last of all once
 *  the page is scrolled to the bottom with it in view. */
export function useScrollSpy(ids: string[]) {
  const [activeId, setActiveId] = useState<string>(ids[0] ?? "");

  useEffect(() => {
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (!elements.length) return;
    let raf = 0;

    const pickActiveId = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const focusY = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) + SLACK;

      let nextId = elements[0].id;
      if (window.scrollY > EDGE) {
        for (const el of elements) {
          if (el.getBoundingClientRect().top > focusY) break;
          nextId = el.id;
        }
        const last = elements[elements.length - 1];
        const atBottom = maxScroll > SHORT_PAGE && window.scrollY >= maxScroll - EDGE;
        if (atBottom && last.getBoundingClientRect().top <= window.innerHeight) nextId = last.id;
      }
      setActiveId(nextId);
    };

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(pickActiveId);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    pickActiveId();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [ids]);

  return activeId;
}
