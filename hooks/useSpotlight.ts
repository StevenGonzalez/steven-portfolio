import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { MotionValue } from "framer-motion";

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
  // Cache dimensions to avoid reading the DOM repeatedly inside hot paths.
  const dimensions = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const dotEl = dotRef.current;
    if (!dotEl) return;

    const measure = () => {
      const { width, height } = dotEl.getBoundingClientRect();
      dimensions.current = { width, height };
    };

    measure();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(measure);
    observer.observe(dotEl);

    return () => {
      observer.disconnect();
    };
  }, [dotRef, dotAnchor]);

  useEffect(() => {
    let secretEl: HTMLElement | null = null;
    let rafId: number | null = null;

    const scheduleUpdate = () => {
      if (rafId !== null) return;

      rafId = requestAnimationFrame(() => {
        updateSpotlight();
        rafId = null;
      });
    };

    const updateSpotlight = () => {
      const spotlightEl = spotlightRef.current;
      const lightingEl = lightingMaskRef.current;
      if (!dotAnchor) return;

      const targetRect = spotlightEl?.getBoundingClientRect() ?? lightingEl?.getBoundingClientRect();
      if (!targetRect) return;

      // Use cached dimensions and motion values to calculate center
      // This avoids reading the dot's DOM node which might be dirty
      const dotH = dimensions.current.height || 60; 
      const dotW = dimensions.current.width || 60;
      
      const currentX = dotX.get();
      const currentY = dotY.get();

      const dotCx = dotAnchor.left + currentX + dotW / 2;
      const dotCy = dotAnchor.top + currentY + dotH / 2;

      const cx = dotCx - targetRect.left;
      const cy = dotCy - targetRect.top;

      const w = targetRect.width;
      const h = targetRect.height;
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
      if (spotlightEl) {
        spotlightEl.style.setProperty("--spotlight-1-x", `${g1x}px`);
        spotlightEl.style.setProperty("--spotlight-1-y", `${g1y}px`);
      }

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

    const onMotionChange = () => {
      scheduleUpdate();
    };

    const unsubscribeX = dotX.on("change", onMotionChange);
    const unsubscribeY = dotY.on("change", onMotionChange);

    scheduleUpdate();

    const onViewportChange = () => scheduleUpdate();

    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, { passive: true });

    const spotlightEl = spotlightRef.current;
    const observer =
      typeof ResizeObserver !== "undefined" && spotlightEl
        ? new ResizeObserver(() => scheduleUpdate())
        : null;

    if (observer && spotlightEl) {
      observer.observe(spotlightEl);
    }

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      unsubscribeX();
      unsubscribeY();
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange);
      observer?.disconnect();
    };
  }, [dotX, dotY, dotAnchor, spotlightRef, lightingMaskRef]);
}
