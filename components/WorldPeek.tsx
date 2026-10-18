"use client";

import { useEffect, useRef } from "react";

/** The world from the top of the home page, running in the article on how it works, with a button that takes it apart
 *  into its layers. Its engine in lib/world loads only once the figure nears the screen, so the article opens as fast
 *  as any other. */
export default function WorldPeek() {
  const box = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const readout = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let stop: (() => void) | null = null;
    let gone = false;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        import("@/lib/world/peek").then(({ mountPeek }) => {
          if (!gone) stop = mountPeek(box.current, btn.current, readout.current);
        });
      },
      { rootMargin: "400px" },
    );
    io.observe(box.current!);
    return () => {
      gone = true;
      io.disconnect();
      stop?.();
    };
  }, []);

  return (
    <figure className="peek-fig">
      <div className="peek-wrap">
        <div
          ref={box}
          className="peek"
          role="img"
          aria-label="The world from the top of the home page, running live: eleven stacked canvases, from the sky at the back to the ferns at the front."
        />
      </div>
      <figcaption>
        <button ref={btn} type="button" className="peek-btn" aria-pressed="false" disabled>
          Take it apart
        </button>
        <span ref={readout} className="peek-ms" />
      </figcaption>
    </figure>
  );
}
