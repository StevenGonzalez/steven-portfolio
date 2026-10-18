"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { worldSourceUrl } from "../lib/site";

// The console greeting prints once per load, not once per page.
let greeted = false;

/** Small touches shared by every page. Sections rise into place as they scroll into view, staggered when several
 *  arrive together; the hidden state is added here, and only to those not yet on screen, so nothing that has been
 *  painted blinks out and back, and nothing stays hidden if this never runs. Cards marked
 *  data-glow catch the light where the pointer is. A box marked data-scene plays that painted scene. And whoever opens
 *  the console finds a note about how the world is made, and a switch for it that nothing on the page shows. */
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
      if (el.getBoundingClientRect().top < innerHeight) continue;
      el.classList.add("rv");
      io.observe(el);
    }
    return () => io.disconnect();
  }, [pathname]);

  // Only the 404 page marks a scene this way. The root 404 is part of every route, so a client component of its own
  // would add a script request to every page; this one is already there, and the scene code loads only when needed.
  useEffect(() => {
    const boxes = [...document.querySelectorAll<HTMLElement>("[data-scene]")];
    if (!boxes.length) return;
    const stops: (() => void)[] = [];
    let gone = false;
    import("../lib/world/vignette-stage").then(({ mountScene }) => {
      if (!gone) for (const box of boxes) stops.push(mountScene(box, box.dataset.scene));
    });
    return () => {
      gone = true;
      for (const stop of stops) stop();
    };
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

  useEffect(() => {
    if (greeted) return;
    greeted = true;
    console.info(
      "%cHi, you opened the console.%c\n\nThe sky islands at the top of the home page are plain JavaScript drawing on canvas in web workers, with no images and no libraries.\n\nHow it works: %s\nThe source: %s\n\nAdd ?season=winter, spring, summer or autumn to the home page's address to see another season, or ?season=halloween or newyear for the days it dresses up.",
      "font: italic 500 20px Georgia, serif; color: #78dccb",
      "font: 12px/1.6 ui-monospace, monospace",
      `${location.origin}/insights/how-the-sky-islands-work`,
      worldSourceUrl,
    );
  }, []);

  return null;
}
