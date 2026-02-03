import { useEffect, RefObject } from "react";
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
  useEffect(() => {
    let secretEl: HTMLElement | null = null;
    const updateSpotlight = () => {
      const dotEl = dotRef.current;
      const spotlightEl = spotlightRef.current;
      const lightingEl = lightingMaskRef.current;
      if (!dotEl || !spotlightEl) return;
      if (!dotAnchor) return;

      const dotRect = dotEl.getBoundingClientRect();
      const spotRect = spotlightEl.getBoundingClientRect();

      const dotCx = dotRect.left + dotRect.width / 2;
      const dotCy = dotRect.top + dotRect.height / 2;

      const cx = dotCx - spotRect.left;
      const cy = dotCy - spotRect.top;

      const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

      const w = spotRect.width;
      const h = spotRect.height;

      const overflowX = w * 0.35;
      const overflowY = h * 0.35;
      const minX = -overflowX;
      const maxX = w + overflowX;
      const minY = -overflowY;
      const maxY = h + overflowY;

      const g1x = clamp(cx, minX, maxX);
      const g1y = clamp(cy, minY, maxY);

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
        const rx = dotRect.left + dotRect.width / 2 - secretRect.left;
        const ry = dotRect.top + dotRect.height / 2 - secretRect.top;
        secretEl.style.setProperty("--reveal-x", `${rx}px`);
        secretEl.style.setProperty("--reveal-y", `${ry}px`);
      }
    };

    updateSpotlight();
    const unsubscribeX = dotX.on("change", updateSpotlight);
    const unsubscribeY = dotY.on("change", updateSpotlight);

    let pollId = 0;
    const loop = () => {
      updateSpotlight();
      pollId = requestAnimationFrame(loop);
    };
    loop();

    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, { passive: true });
    return () => {
      cancelAnimationFrame(pollId);
      unsubscribeX();
      unsubscribeY();
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight);
    };
  }, [dotX, dotY, dotAnchor, dotRef, spotlightRef, lightingMaskRef]);
}
