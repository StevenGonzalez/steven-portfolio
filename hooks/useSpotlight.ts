import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import type { MotionValue } from "framer-motion";

interface UseSpotlightProps {
  dotRef: RefObject<HTMLElement | null>;
  lightingMaskRef: RefObject<HTMLElement | null>;
  dotAnchor: { left: number; top: number } | null;
  dotX: MotionValue<number>;
  dotY: MotionValue<number>;
}

export function useSpotlight({
  dotRef,
  lightingMaskRef,
  dotAnchor,
  dotX,
  dotY,
}: UseSpotlightProps) {
  // Cache dot dimensions to avoid reading the DOM inside hot paths.
  const dimensions = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const dotEl = dotRef.current;
    if (!dotEl) return;

    const measure = () => {
      const { width, height } = dotEl.getBoundingClientRect();
      dimensions.current = { width, height };
    };

    measure();

    if (typeof ResizeObserver === "undefined") return;

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
        updatePositions();
        rafId = null;
      });
    };

    const updatePositions = () => {
      const lightingEl = lightingMaskRef.current;
      if (!dotAnchor || !lightingEl) return;

      const dotH = dimensions.current.height || 60;
      const dotW = dimensions.current.width || 60;

      const dotCx = dotAnchor.left + dotX.get() + dotW / 2;
      const dotCy = dotAnchor.top + dotY.get() + dotH / 2;

      // GPU-composited move — no repaint. LightingLayer's motion.div only
      // animates opacity so Framer Motion does not own the transform property.
      lightingEl.style.transform = `translate3d(${dotCx}px, ${dotCy}px, 0)`;

      // Secret message reveal (small element, low repaint cost)
      secretEl ??= document.getElementById("secret-message");
      if (secretEl) {
        const secretRect = secretEl.getBoundingClientRect();
        secretEl.style.setProperty("--reveal-x", `${dotCx - secretRect.left}px`);
        secretEl.style.setProperty("--reveal-y", `${dotCy - secretRect.top}px`);
      }
    };

    const unsubscribeX = dotX.on("change", scheduleUpdate);
    const unsubscribeY = dotY.on("change", scheduleUpdate);

    scheduleUpdate();

    window.addEventListener("resize", scheduleUpdate);
    window.addEventListener("scroll", scheduleUpdate, { passive: true });

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      unsubscribeX();
      unsubscribeY();
      window.removeEventListener("resize", scheduleUpdate);
      window.removeEventListener("scroll", scheduleUpdate);
    };
  }, [dotX, dotY, dotAnchor, lightingMaskRef]);
}
