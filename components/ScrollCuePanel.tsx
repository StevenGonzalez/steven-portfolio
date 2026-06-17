"use client";

import { useEffect, useRef, useState } from "react";

interface ScrollCuePanelProps {
  children: React.ReactNode;
  containerClassName?: string;
  scrollerClassName?: string;
  nudgeKey?: string;
  enableNudge?: boolean;
}

interface ScrollState {
  canScroll: boolean;
  atTop: boolean;
  atBottom: boolean;
  progress: number;
}

export default function ScrollCuePanel({
  children,
  containerClassName,
  scrollerClassName,
  nudgeKey,
  enableNudge = true,
}: ScrollCuePanelProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState<ScrollState>({
    canScroll: false,
    atTop: true,
    atBottom: true,
    progress: 0,
  });

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const updateState = () => {
      const { scrollTop, scrollHeight, clientHeight } = scroller;
      const range = Math.max(0, scrollHeight - clientHeight);
      const canScroll = range > 2;
      const atTop = scrollTop <= 2;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 2;
      const progress = range <= 0 ? 0 : Math.min(1, Math.max(0, scrollTop / range));
      setScrollState({ canScroll, atTop, atBottom, progress });
    };

    updateState();

    const resizeObserver = new ResizeObserver(updateState);
    resizeObserver.observe(scroller);

    window.addEventListener("resize", updateState);
    scroller.addEventListener("scroll", updateState, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateState);
      scroller.removeEventListener("scroll", updateState);
    };
  }, []);

  useEffect(() => {
    if (!enableNudge) return;

    const scroller = scrollerRef.current;
    if (!scroller || !scrollState.canScroll || !scrollState.atTop) return;

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (media.matches) return;

    const key = `scroll-cue-nudged:${nudgeKey ?? "default"}`;
    if (window.sessionStorage.getItem(key) === "1") return;
    window.sessionStorage.setItem(key, "1");

    const nudgeDistance = Math.min(30, Math.max(16, scroller.clientHeight * 0.085));
    const downTimer = window.setTimeout(() => {
      scroller.scrollTo({ top: nudgeDistance, behavior: "smooth" });
    }, 260);
    const upTimer = window.setTimeout(() => {
      scroller.scrollTo({ top: 0, behavior: "smooth" });
    }, 700);

    return () => {
      window.clearTimeout(downTimer);
      window.clearTimeout(upTimer);
    };
  }, [enableNudge, nudgeKey, scrollState.canScroll, scrollState.atTop]);

  return (
    <div className={`relative min-h-0 overflow-hidden ${containerClassName ?? ""}`}>
      <div ref={scrollerRef} className={`cue-scroller ${scrollerClassName ?? ""}`}>
        {children}
      </div>

      {scrollState.canScroll && !scrollState.atTop ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-11 bg-gradient-to-b from-white/78 via-white/42 to-transparent dark:from-black/84 dark:via-black/56"
        />
      ) : null}

      {scrollState.canScroll && !scrollState.atBottom ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-white/82 via-white/44 to-transparent dark:from-black/88 dark:via-black/58"
        />
      ) : null}
    </div>
  );
}