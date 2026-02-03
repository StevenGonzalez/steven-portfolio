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
    const HI_DOT_TUNE_Y = 46;

    const computeAnchor = (force: boolean) => {
      const glyphEl = hiIGlyphRef.current;
      const dotEl = dotRef.current;
      if (!glyphEl || !dotEl) return;

      if (!force && (dotX.get() !== 0 || dotY.get() !== 0)) {
        const glyphRect = glyphEl.getBoundingClientRect();
        const dotW = dotEl.offsetWidth || dotEl.getBoundingClientRect().width;
        const dotH = dotEl.offsetHeight || dotEl.getBoundingClientRect().height;
        const iCenterX = glyphRect.left + glyphRect.width / 2;
        const left = iCenterX - dotW / 2 + HI_DOT_TUNE_X;
        const top = glyphRect.top - dotH * 1.05 + HI_DOT_TUNE_Y;
        setDotAnchor({ left, top });
        return;
      }

      const glyphRect = glyphEl.getBoundingClientRect();

      const dotW = dotEl.offsetWidth || dotEl.getBoundingClientRect().width;
      const dotH = dotEl.offsetHeight || dotEl.getBoundingClientRect().height;

      const iCenterX = glyphRect.left + glyphRect.width / 2;
      const left = iCenterX - dotW / 2 + HI_DOT_TUNE_X;

      const top = glyphRect.top - dotH * 1.05 + HI_DOT_TUNE_Y;

      const anchor = { left, top };
      setDotAnchor(anchor);
      if (dotX.get() === 0 && dotY.get() === 0) dotHomeRef.current = anchor;
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
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(settleRafId);
      window.removeEventListener("resize", onResize);
    };
  }, [dotX, dotY, hiIGlyphRef, dotRef, setDotAnchor, dotHomeRef]);
}
