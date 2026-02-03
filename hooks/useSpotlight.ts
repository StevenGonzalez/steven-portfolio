import { useEffect, RefObject, useRef } from "react";
import { MotionValue } from "framer-motion";

interface UseSpotlightProps {
  dotRef: RefObject<HTMLElement | null>;
  spotlightRef: RefObject<HTMLElement | null>;
  lightingMaskRef: RefObject<HTMLElement | null>;
  dotAnchor: { left: number; top: number } | null;
  dotX: MotionValue<number>;
  dotY: MotionValue<number>;
}

export function useSpotlight({
  dotRef,
  spotlightRef,
  lightingMaskRef,
  dotAnchor,
  dotX,
  dotY,
}: UseSpotlightProps) {
  // Cache dimensions to avoid reading the DOM (causing reflows) inside the hot path
  const dimensions = useRef({ width: 0, height: 0 });

  useEffect(() => {
    if (dotRef.current) {
      const { width, height } = dotRef.current.getBoundingClientRect();
      dimensions.current = { width, height };
    }
  }, [dotRef.current, dotAnchor]); // Re-measure when anchor changes (likely resize)

  useEffect(() => {
    let secretEl: HTMLElement | null = null;
    let rafId: number | null = null;

    const updateSpotlight = () => {
      const spotlightEl = spotlightRef.current;
      const lightingEl = lightingMaskRef.current;
      if (!spotlightEl || !dotAnchor) return;

      // We need the spotlight rect because it scrolls (absolute) while dot is fixed.
      // Reading this is somewhat expensive but necessary for the effect to track scroll.
      // Ideally, we'd cache this too, but it changes on scroll.
      const spotRect = spotlightEl.getBoundingClientRect();

      // Use cached dimensions and motion values to calculate center
      // This avoids reading the dot's DOM node which might be dirty
      const dotH = dimensions.current.height || 60; 
      const dotW = dimensions.current.width || 60;
      
      const currentX = dotX.get();
      const currentY = dotY.get();

      const dotCx = dotAnchor.left + currentX + dotW / 2;
      const dotCy = dotAnchor.top + currentY + dotH / 2;

      const cx = dotCx - spotRect.left;
      const cy = dotCy - spotRect.top;

      const w = spotRect.width;
      const h = spotRect.height;
      const overflowX = w * 0.35;
      const overflowY = h * 0.35;
      const minX = -overflowX;
      const maxX = w + overflowX;
      const minY = -overflowY;
      const maxY = h + overflowY;

      // Clamp values
      const g1x = Math.max(minX, Math.min(maxX, cx));
      const g1y = Math.max(minY, Math.min(maxY, cy));

      // Batch style updates
      spotlightEl.style.setProperty("--spotlight-1-x", `${g1x}px`);
      spotlightEl.style.setProperty("--spotlight-1-y", `${g1y}px`);

      if (lightingEl) {
        const maskRect = lightingEl.getBoundingClientRect();
        const mx = dotCx - maskRect.left;
        const my = dotCy - maskRect.top;
        lightingEl.style.setProperty("--lighting-x", `${mx}px`);
        lightingEl.style.setProperty("--lighting-y", `${my}px`);
      }

      secretEl ??= document.getElementById("secret-message");
      if (secretEl) {
        const secretRect = secretEl.getBoundingClientRect();
        const rx = dotCx - secretRect.left;
        const ry = dotCy - secretRect.top;
        secretEl.style.setProperty("--reveal-x", `${rx}px`);
        secretEl.style.setProperty("--reveal-y", `${ry}px`);
      }
    };

    // Optimization: Only update when motion values change or on scroll/resize.
    // We REMOVED the permanent requestAnimationFrame loop.
    
    // We use a single RAF to throttle the updates from multiple sources if needed,
    // but MotionValue.on change callbacks run in a RAF step already.
    const onMotionChange = () => {
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          updateSpotlight();
          rafId = null;
        });
      }
    };

    const unsubscribeX = dotX.on("change", onMotionChange);
    const unsubscribeY = dotY.on("change", onMotionChange);

    // Initial update
    updateSpotlight();

    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, { passive: true });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      unsubscribeX();
      unsubscribeY();
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight);
    };
  }, [dotX, dotY, dotAnchor, spotlightRef, lightingMaskRef]);
}
