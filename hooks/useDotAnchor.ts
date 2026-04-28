import { useLayoutEffect, RefObject } from "react";
import { MotionValue } from "framer-motion";

interface UseDotAnchorProps {
  hiIGlyphRef: RefObject<HTMLElement | null>;
  dotRef: RefObject<HTMLElement | null>;
  dotX: MotionValue<number>;
  dotY: MotionValue<number>;
  setDotAnchor: (anchor: { left: number; top: number } | null) => void;
  dotHomeRef: RefObject<{ left: number; top: number } | null>;
}

export function useDotAnchor({
  hiIGlyphRef,
  dotRef,
  dotX,
  dotY,
  setDotAnchor,
  dotHomeRef,
}: UseDotAnchorProps) {
  useLayoutEffect(() => {
    let rafId = 0;
    let settleRafId = 0;
    const HI_DOT_TUNE_X = 1;
    const TUNE_Y_RATIO = 0.665;

    const getAnchor = (glyphEl: HTMLElement, dotEl: HTMLElement) => {
      const style = window.getComputedStyle(glyphEl);
      const fontSize = parseFloat(style.fontSize) || 72;
      const tuneY = fontSize * TUNE_Y_RATIO;
      const glyphRect = glyphEl.getBoundingClientRect();
      const dotRect = dotEl.getBoundingClientRect();
      const dotW = dotEl.offsetWidth || dotRect.width;
      const dotH = dotEl.offsetHeight || dotRect.height;
      const iCenterX = glyphRect.left + glyphRect.width / 2;

      return {
        left: iCenterX - dotW / 2 + HI_DOT_TUNE_X,
        top: glyphRect.top - dotH * 1.05 + tuneY,
      };
    };

    const computeAnchor = (force: boolean) => {
      const glyphEl = hiIGlyphRef.current;
      const dotEl = dotRef.current;
      if (!glyphEl || !dotEl) return;

      const anchor = getAnchor(glyphEl, dotEl);
      setDotAnchor(anchor);

      const atRest = dotX.get() === 0 && dotY.get() === 0;
      if (force || atRest) {
        dotHomeRef.current = anchor;
      }
    };

    const schedule = (force: boolean) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => computeAnchor(force));
    };

    const scheduleAfterSettle = () => {
      cancelAnimationFrame(settleRafId);

      const glyphEl = hiIGlyphRef.current;
      if (!glyphEl) {
        schedule(true);
        return;
      }

      const start = performance.now();
      let lastLeft = Number.NaN;
      let lastTop = Number.NaN;
      let stableFrames = 0;

      const tick = () => {
        const rect = glyphEl.getBoundingClientRect();
        const moved =
          Number.isFinite(lastLeft) && Number.isFinite(lastTop)
            ? Math.abs(rect.left - lastLeft) + Math.abs(rect.top - lastTop)
            : Infinity;

        lastLeft = rect.left;
        lastTop = rect.top;

        if (moved < 0.25) stableFrames += 1;
        else stableFrames = 0;

        if (stableFrames >= 6 || performance.now() - start > 1600) {
          schedule(true);
          return;
        }

        settleRafId = requestAnimationFrame(tick);
      };

      settleRafId = requestAnimationFrame(tick);
    };

    scheduleAfterSettle();

    const fontsReady = (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
    fontsReady
      ?.then(() => schedule(false))
      .catch(() => {});

    const onResize = () => schedule(false);
    const onScroll = () => schedule(false);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onScroll, { passive: true });

    const glyphEl = hiIGlyphRef.current;
    const dotEl = dotRef.current;
    const observer =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => schedule(false))
        : null;

    if (observer && glyphEl) observer.observe(glyphEl);
    if (observer && dotEl) observer.observe(dotEl);

    return () => {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(settleRafId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, [dotX, dotY, hiIGlyphRef, dotRef, setDotAnchor, dotHomeRef]);
}
