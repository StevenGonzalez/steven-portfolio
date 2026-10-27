"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { mountWorld } from "@/lib/world/stage";

/** The painted world at the top of the home page. The markup is React's; everything drawn into it belongs to the engine
 *  in lib/world, which mounts on these elements and hands back its own teardown. Each one is rendered below without
 *  a condition, so its ref is set by the time the effect runs. The seams live further down the page, so they are found
 *  by id once the page has committed, and checked. */
export default function World() {
  const router = useRouter();
  const hero = useRef<HTMLElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  const tag = useRef<HTMLDivElement>(null);
  const wake = useRef<HTMLDivElement>(null);
  const guideBtn = useRef<HTMLButtonElement>(null);
  const guide = useRef<HTMLDivElement>(null);
  const guideList = useRef<HTMLOListElement>(null);
  const guideCount = useRef<HTMLElement>(null);
  const guideFoot = useRef<HTMLParagraphElement>(null);
  const guideViews = useRef<HTMLDivElement>(null);
  const guideMap = useRef<HTMLDivElement>(null);
  const guideMail = useRef<HTMLOListElement>(null);
  const postcardBtn = useRef<HTMLButtonElement>(null);
  const soundBtn = useRef<HTMLButtonElement>(null);
  const explore = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const seamTop = document.getElementById("seam");
    const seamLow = document.getElementById("seam-low");
    if (!(seamTop instanceof HTMLCanvasElement && seamLow instanceof HTMLCanvasElement)) {
      throw new Error("The world needs the page's #seam and #seam-low canvases to draw into.");
    }
    return mountWorld({
      hero: hero.current!,
      scene: scene.current!,
      tag: tag.current!,
      wake: wake.current!,
      guideBtn: guideBtn.current!,
      guide: guide.current!,
      guideList: guideList.current!,
      guideCount: guideCount.current!,
      guideFoot: guideFoot.current!,
      guideViews: guideViews.current!,
      guideMap: guideMap.current!,
      guideMail: guideMail.current!,
      postcardBtn: postcardBtn.current!,
      soundBtn: soundBtn.current!,
      explore: explore.current!,
      ring: ring.current!,
      seamTop,
      seamLow,
      sail: () => router.push("/edge"),
    });
  }, [router]);

  return (
    <section ref={hero} className="hero" aria-label="Introduction">
      <div ref={scene} className="scene" aria-hidden="true" />
      <div className="scrim" />
      <div className="fade" />
      <div ref={wake} className="wake" />
      <div className="copy" data-hero-copy>
        <p className="eyebrow">Software engineer</p>
        <h1>Steven Gonzalez</h1>
        <p className="lead">I build web apps and the APIs and services behind them.</p>
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
            <div className="guide-top">
              <p className="guide-h">
                Field guide <span>Things seen in this world</span>
              </p>
              <div ref={guideViews} className="guide-views" role="group" aria-label="Show the guide as">
                <button type="button" data-view="list" aria-pressed="true">
                  List
                </button>
                <button type="button" data-view="map" aria-pressed="false">
                  Map
                </button>
                <button type="button" data-view="mail" aria-pressed="false" hidden>
                  Mail
                </button>
              </div>
            </div>
            <button ref={postcardBtn} type="button" className="guide-card">
              Save a postcard of this view
            </button>
            <ol ref={guideList} role="list" />
            <div ref={guideMap} className="guide-map" hidden />
            <ol ref={guideMail} className="guide-mail" role="list" hidden />
            <p ref={guideFoot} className="guide-foot" />
          </div>
          <button ref={soundBtn} type="button" className="sound-btn" aria-pressed="false">
            Sound
          </button>
        </div>
      </div>
      {/* The world's own stop for the keyboard, out of sight: the ring round whatever it is on shows where focus is. */}
      <div
        ref={explore}
        className="sr-only"
        tabIndex={0}
        role="application"
        aria-label="The world. The arrow keys move between the things in it, and Enter clicks the one you're on."
      />
      <span ref={ring} className="aim" hidden />
      <div ref={tag} className="tag" role="status" aria-live="polite" />
    </section>
  );
}
