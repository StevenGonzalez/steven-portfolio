"use client";

import { useEffect, useRef } from "react";
import { mountScene } from "@/lib/world/vignette-stage";

/** A project's painted scene: a box the engine in lib/world draws into and animates while it is on screen. The engine
 *  starts only once the box nears the screen, so a page of cards does not start every scene at load. */
export default function ProjectScene({ slug, label }: { slug: string; label: string }) {
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current!;
    let stop: (() => void) | null = null;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        stop = mountScene(el, slug);
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      stop?.();
    };
  }, [slug]);

  return <div ref={box} className="scene-cv" role="img" aria-label={label} />;
}
