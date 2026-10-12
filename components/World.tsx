"use client";

import { useEffect, useRef } from "react";
import { mountWorld } from "../lib/world/stage";

/** The painted world at the top of the home page. The markup is React's; everything drawn into it belongs to the engine
 *  in lib/world, which mounts on these elements and hands back its own teardown. The seams live further down the
 *  page, so they are found by id once the page has committed. */
export default function World() {
  const hero = useRef<HTMLElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const wake = useRef<HTMLDivElement>(null);
  const guideBtn = useRef<HTMLButtonElement>(null);
  const guide = useRef<HTMLDivElement>(null);
  const guideList = useRef<HTMLOListElement>(null);
  const guideCount = useRef<HTMLElement>(null);
  const guideFoot = useRef<HTMLParagraphElement>(null);
  const postcardBtn = useRef<HTMLButtonElement>(null);

  useEffect(
    () =>
      mountWorld({
        hero: hero.current,
        scene: scene.current,
        tag: tag.current,
        wake: wake.current,
        guideBtn: guideBtn.current,
        guide: guide.current,
        guideList: guideList.current,
        guideCount: guideCount.current,
        guideFoot: guideFoot.current,
        postcardBtn: postcardBtn.current,
        seamTop: document.getElementById("seam"),
        seamLow: document.getElementById("seam-low"),
      }),
    [],
  );

  return (
    <section ref={hero} className="hero" aria-label="Introduction">
      <div ref={scene} className="scene" aria-hidden="true" />
      <div className="scrim" />
      <div className="fade" />
      <div ref={wake} className="wake" />
      <div className="copy" data-hero-copy>
        <p className="eyebrow">Software engineer</p>
        <h1>Steven Gonzalez</h1>
        <p className="lead">I build web apps and the real-time systems behind them.</p>
        <div className="ctas">
          <a className="btn solid" href="#work">
            See the work
          </a>
          <a className="btn line" href="#contact">
            Get in touch
          </a>
        </div>
        <div className="guide-wrap" data-guide>
          <button ref={guideBtn} type="button" className="guide-btn" aria-expanded="false" aria-controls="guide">
            Field guide <b ref={guideCount} />
          </button>
          <div ref={guide} className="guide" id="guide" hidden>
            <p className="guide-h">
              Field guide <span>Things seen in this world</span>
            </p>
            <button ref={postcardBtn} type="button" className="guide-card">
              Save a postcard of this view
            </button>
            <ol ref={guideList} />
            <p ref={guideFoot} className="guide-foot" />
          </div>
        </div>
      </div>
      <div ref={tag} className="tag" role="status" aria-live="polite" />
    </section>
  );
}
