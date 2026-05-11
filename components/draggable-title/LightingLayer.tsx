import { motion } from "framer-motion";
import { RefObject } from "react";

interface LightingLayerProps {
  reduceMotion: boolean | null;
  lightingMaskRef: RefObject<HTMLDivElement | null>;
  dotAnchor: { left: number; top: number } | null;
  dotDelay: number;
}

// Fixed-size element centered on the dot via transform: translate3d(dotCx, dotCy, 0).
// 1200×1200 contains the 460px accent gradient fully.
// The 1450px vignette stops at <0.4% opacity at our 600px edge — imperceptible.
const SIZE = 1200;
const HALF = SIZE / 2;

const BG =
  `radial-gradient(460px circle at 50% 50%, rgb(var(--accent-rgb) / 0.24) 0%, rgb(var(--accent-rgb) / 0.12) 34%, rgb(var(--accent-rgb) / 0.04) 56%, transparent 78%), ` +
  `radial-gradient(1450px circle at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.004) 58%, rgba(0,0,0,0.012) 78%, rgba(0,0,0,0.02) 96%, rgba(0,0,0,0.03) 104%)`;

const layerStyle: React.CSSProperties = {
  width: `${SIZE}px`,
  height: `${SIZE}px`,
  left: `-${HALF}px`,
  top: `-${HALF}px`,
  willChange: "transform",
  background: BG,
};

export function LightingLayer({
  reduceMotion,
  lightingMaskRef,
  dotAnchor,
  dotDelay,
}: LightingLayerProps) {
  if (reduceMotion) {
    return (
      <div
        ref={lightingMaskRef}
        className="pointer-events-none fixed z-[120]"
        aria-hidden="true"
        style={{
          ...layerStyle,
          opacity: dotAnchor ? 1 : 0,
          transition: "opacity 200ms ease-out",
        }}
      />
    );
  }

  return (
    <motion.div
      ref={lightingMaskRef}
      className="pointer-events-none fixed z-[120]"
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: dotDelay, duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
      style={layerStyle}
    />
  );
}
