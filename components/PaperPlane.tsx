"use client";

import { useEffect, useRef } from "react";

/** Now and then a paper plane glides across the world at the top of the home page, loops once and flies off. Only on a
 *  screen wide enough to have sky beside the words, only while the world is on screen and the tab is in front, and not
 *  at all when the system asks for reduced motion. */
export default function PaperPlane() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const plane = ref.current!,
      hero = plane.parentElement!;
    let seen = false,
      timer = 0,
      flight: Animation | undefined;
    const io = new IntersectionObserver(([e]) => (seen = e.isIntersecting));
    io.observe(hero);

    // In from the left, high in the sky, then a loop between the words and the island, and away to the right. The
    // loop is two half circles, so the plane comes out of it heading the way it went in.
    const fly = () => {
      timer = window.setTimeout(fly, 45_000 + Math.random() * 45_000);
      if (!seen || document.hidden || innerWidth < 900) return;
      const W = hero.clientWidth,
        y = hero.clientHeight * (0.14 + Math.random() * 0.12),
        x = W * (0.42 + Math.random() * 0.12),
        r = 34 + Math.random() * 10;
      plane.style.offsetPath =
        `path("M-60 ${y - 40} C${W * 0.2} ${y - 40} ${x - 140} ${y} ${x} ${y} ` +
        `a${r} ${r} 0 0 0 0 ${-2 * r} a${r} ${r} 0 0 0 0 ${2 * r} ` +
        `C${x + 140} ${y} ${W * 0.8} ${y - 20} ${W + 60} ${y - 70}")`;
      flight = plane.animate(
        [
          { offsetDistance: "0%", opacity: 1 },
          { offsetDistance: "100%", opacity: 1 },
        ],
        { duration: 9000 + W * 2, easing: "cubic-bezier(0.3, 0.1, 0.6, 0.9)" },
      );
    };
    timer = window.setTimeout(fly, 6000 + Math.random() * 6000);

    return () => {
      clearTimeout(timer);
      io.disconnect();
      flight?.cancel();
    };
  }, []);

  return <span ref={ref} className="paper-plane" aria-hidden="true" />;
}
