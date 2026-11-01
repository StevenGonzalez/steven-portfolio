"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { seasonNow } from "@/lib/season";
import { worldSourceUrl } from "@/lib/site";

// The console greeting prints once per load, not once per page.
let greeted = false;

/** Small touches shared by every page. Sections rise into place as they scroll into view, staggered when several
 *  arrive together; the hidden state is added here, and only to those not yet on screen, so nothing that has been
 *  painted blinks out and back, and nothing stays hidden if this never runs. The page is marked with the season, for
 *  the ornaments, and the tab's icon follows the season. Cards marked data-glow catch the light where the pointer is.
 *  A box marked data-scene plays that painted scene. A link marked data-seal is sealed in wax as it is clicked.
 *  Articles read are dog-eared in the lists. A click on the paper leaves a spatter of ink. A service worker keeps the
 *  site for offline use. And whoever opens the console finds a note about how the world is made, and a switch for it
 *  that nothing on the page shows. */
export default function SiteEffects() {
  const pathname = usePathname();

  // The flourishes' ornaments follow the season (globals.css), and so does the tab's icon: the maple leaf (app/icon.svg)
  // is autumn's, and the other seasons have their own in public/icons.
  useEffect(() => {
    const { season, occasion } = seasonNow(),
      root = document.documentElement.dataset;
    root.season = season;
    if (occasion) root.occasion = occasion;
    else delete root.occasion;
    // React puts in its own copy of the server's icon link after this has run, so each copy is pointed at the season's
    // icon as it arrives.
    if (season === "autumn") return;
    const point = () => {
      for (const icon of document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"][type="image/svg+xml"]'))
        if (icon.getAttribute("href") !== `/icons/${season}.svg`) icon.href = `/icons/${season}.svg`;
    };
    point();
    const mo = new MutationObserver(point);
    mo.observe(document.head, { childList: true });
    return () => mo.disconnect();
  }, [pathname]);

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

  // An article counts as read once its last paragraph has been on screen, and the lists of articles dog-ear the ones
  // this browser has read. Kept in this browser only.
  useEffect(() => {
    const KEY = "read";
    const load = (): string[] => {
      try {
        return JSON.parse(localStorage.getItem(KEY) ?? "[]");
      } catch {
        return [];
      }
    };
    const read = load();
    for (const li of document.querySelectorAll<HTMLElement>(".posts li")) {
      const slug = li.querySelector("a")?.getAttribute("href")?.split("/").pop();
      if (slug && read.includes(slug)) li.dataset.read = "";
    }
    const slug = pathname.match(/^\/insights\/([^/]+)$/)?.[1];
    const end = document.querySelector(".doc-body > :last-child");
    if (!slug || !end || read.includes(slug)) return;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      try {
        localStorage.setItem(KEY, JSON.stringify([...load(), slug]));
      } catch {
        // Storage can be blocked; the article just is not remembered.
      }
    });
    io.observe(end);
    return () => io.disconnect();
  }, [pathname]);

  // Only the 404 page marks a scene this way. The root 404 is part of every route, so a client component of its own
  // would add a script request to every page; this one is already there, and the scene code loads only when needed.
  useEffect(() => {
    const boxes = [...document.querySelectorAll<HTMLElement>("[data-scene]")];
    if (!boxes.length) return;
    const stops: (() => void)[] = [];
    let gone = false;
    import("@/lib/world/vignette-stage").then(({ mountScene }) => {
      if (!gone) for (const box of boxes) stops.push(mountScene(box, box.dataset.scene!));
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

  // A painted plate leans toward the pointer and its scene slides the other way inside the frame, like a picture seen
  // through a window as you move your head. Over a card, the card's plate follows anywhere on the card. Only for a
  // mouse or a pen, and not when the system asks for reduced motion.
  useEffect(() => {
    if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let current: HTMLElement | null = null;
    const rest = () => {
      current?.classList.remove("lean");
      current = null;
    };
    const onMove = (e: PointerEvent) => {
      const area = (e.target as Element).closest?.<HTMLElement>(".proj, .plate");
      const plate = area?.matches(".plate") ? area : area?.querySelector<HTMLElement>(".plate");
      if (plate !== current) rest();
      if (!area || !plate) return;
      const b = area.getBoundingClientRect();
      plate.style.setProperty("--px", (((e.clientX - b.left) / b.width) * 2 - 1).toFixed(3));
      plate.style.setProperty("--py", (((e.clientY - b.top) / b.height) * 2 - 1).toFixed(3));
      plate.classList.add("lean");
      current = plate;
    };
    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", rest);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", rest);
      rest();
    };
  }, []);
  // A link marked data-seal is sealed in wax as it is clicked, and opens in its new tab once the seal is pressed, so the
  // seal is seen. A click that asks for something else (a middle click, a modifier) is left to the browser, and so is
  // every click when the system asks for reduced motion.
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element).closest?.<HTMLAnchorElement>("a[data-seal]");
      if (!a || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      if (a.querySelector(".seal")) return;
      const seal = document.createElement("span");
      seal.className = "seal";
      seal.setAttribute("aria-hidden", "true");
      seal.addEventListener("animationend", () => seal.remove());
      a.append(seal);
      setTimeout(() => open(a.href, "_blank", "noopener,noreferrer"), 450);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // A click on the paper itself, not on anything that does something, leaves a small spatter of ink that soaks in and
  // fades. Not for a double click, which is selecting a word, nor when the system asks for reduced motion.
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const NS = "http://www.w3.org/2000/svg";
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.detail !== 1) return;
      const t = e.target as Element;
      if (
        !t.closest?.(".site, .page") ||
        t.closest("a, button, input, textarea, select, label, summary, canvas, .plate")
      )
        return;
      if (getSelection()?.toString()) return;
      const svg = document.createElementNS(NS, "svg");
      svg.setAttribute("class", "splash");
      svg.setAttribute("viewBox", "-24 -24 48 48");
      svg.setAttribute("aria-hidden", "true");
      svg.style.left = `${e.pageX}px`;
      svg.style.top = `${e.pageY}px`;
      const drop = (x: number, y: number, r: number) => {
        const c = document.createElementNS(NS, "circle");
        c.setAttribute("cx", x.toFixed(1));
        c.setAttribute("cy", y.toFixed(1));
        c.setAttribute("r", r.toFixed(1));
        svg.append(c);
      };
      // The drop, lumpy at its edge, and the droplets thrown off it, smaller the further they flew.
      drop(0, 0, 4 + Math.random() * 1.5);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * 6.28 + Math.random() * 0.8;
        drop(Math.cos(a) * 3.6, Math.sin(a) * 3.6, 1.6 + Math.random() * 1.1);
      }
      for (let i = 0, n = 5 + Math.floor(Math.random() * 4); i < n; i++) {
        const a = Math.random() * 6.28,
          d = 8 + Math.random() * 13;
        drop(Math.cos(a) * d, Math.sin(a) * d, Math.max(0.7, 2.2 - d / 12 + Math.random() * 0.5));
      }
      svg.addEventListener("animationend", () => svg.remove());
      document.body.append(svg);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // The page scrolls smoothly, and the browser's own Back and Forward buttons honour that when they put the reader's
  // place back, gliding down from the top of the page instead of arriving there. So a step through history scrolls at
  // once, and smooth scrolling comes back with the reader's next touch, before any link on the page can use it.
  useEffect(() => {
    const root = document.documentElement;
    const smooth = () => {
      root.style.scrollBehavior = "";
      for (const type of ["pointerdown", "keydown", "wheel", "touchstart"]) removeEventListener(type, smooth, true);
    };
    const onPop = () => {
      root.style.scrollBehavior = "auto";
      for (const type of ["pointerdown", "keydown", "wheel", "touchstart"])
        addEventListener(type, smooth, { capture: true, passive: true });
    };
    addEventListener("popstate", onPop);
    return () => {
      removeEventListener("popstate", onPop);
      smooth();
    };
  }, []);

  // The service worker keeps the site for offline use (public/sw.js). Once it is in charge it is handed everything this
  // page loaded before then, so the first visit is kept as well. Development builds go without it, so a stale copy
  // never stands in for code being edited.
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const sw = navigator.serviceWorker;
    sw.register("/sw.js")
      .then(() => sw.ready)
      .then((reg) =>
        reg.active?.postMessage({
          type: "keep",
          urls: [location.href, ...performance.getEntriesByType("resource").map((r) => r.name)],
        }),
      )
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (greeted) return;
    greeted = true;
    // The console cannot use the page's fonts or custom properties, so the heading takes the glow colour of the theme
    // showing, which reads well on a console of the same shade, and a serif every system has.
    const glow = getComputedStyle(document.documentElement).getPropertyValue("--glow").trim();
    console.info(
      "%cHi, you opened the console.%c\n\nThe sky islands at the top of the home page are plain JavaScript drawing on canvas in web workers, with no images and no libraries.\n\nHow it works: %s\nThe source: %s\n\nAdd ?season=winter, spring, summer or autumn to the home page's address to see another season, or ?season=halloween or newyear for the days it dresses up.",
      `font: italic 500 20px Georgia, serif; color: ${glow}`,
      "font: 12px/1.6 ui-monospace, monospace",
      `${location.origin}/insights/how-the-sky-islands-work`,
      worldSourceUrl,
    );
  }, []);

  return null;
}
