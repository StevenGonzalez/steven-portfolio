"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { mountEdge } from "@/lib/edge/stage";

/** The edge of the world. The markup is React's; the layers drawn in the box belong to the engine in lib/edge, which
 *  mounts on these elements and hands back its own teardown. */
export default function Edge() {
  const box = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLParagraphElement>(null);
  const release = useRef<HTMLButtonElement>(null);
  const soundBtn = useRef<HTMLButtonElement>(null);

  useEffect(
    () =>
      mountEdge({
        box: box.current!,
        count: count.current!,
        release: release.current!,
        soundBtn: soundBtn.current!,
      }),
    [],
  );

  return (
    <section className="edge" aria-labelledby="edge-h">
      <div
        ref={box}
        className="edge-scene"
        role="img"
        aria-label="The edge of the world at night. A sea of cloud pours over the edge in falls, and far below them a galaxy turns. In front, a lighthouse stands on a floating rock with a pier running out over nothing."
      />
      <div className="edge-copy">
        <h1 id="edge-h">The edge of the world</h1>
        <p>
          The cloud sea runs off the edge here, and far below it there is a galaxy. Let a lantern go and it sinks until
          it becomes one of its stars. Yours stay there for next time.
        </p>
        <p ref={count} className="edge-count" aria-live="polite" />
        <div className="edge-acts">
          <button ref={release} type="button" className="btn solid">
            Let a lantern go
          </button>
          <button ref={soundBtn} type="button" className="sound-btn" aria-pressed="false">
            Sound
          </button>
          <Link href="/">Sail home</Link>
        </div>
      </div>
    </section>
  );
}
