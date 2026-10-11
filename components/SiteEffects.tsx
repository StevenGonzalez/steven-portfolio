"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Two small touches shared by every page. Sections rise into place as they scroll into view, staggered when several
 *  arrive together; the hidden state is added here, so nothing stays hidden if this never runs. And cards marked
 *  data-glow catch the light where the pointer is. */
export default function SiteEffects() {
  const pathname = usePathname();

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(
      (entries) => {
        let i = 0;
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.style.setProperty("--d", `${i++ * 70}ms`);
          el.classList.add("in");
          io.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -8% 0px" },
    );
    for (const el of document.querySelectorAll("[data-rv]")) {
      el.classList.add("rv");
      io.observe(el);
    }
    return () => io.disconnect();
  }, [pathname]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const el = (e.target as Element).closest?.<HTMLElement>("[data-glow]");
      if (!el) return;
      const b = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - b.left}px`);
      el.style.setProperty("--my", `${e.clientY - b.top}px`);
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    return () => document.removeEventListener("pointermove", onMove);
  }, []);

  return null;
}
