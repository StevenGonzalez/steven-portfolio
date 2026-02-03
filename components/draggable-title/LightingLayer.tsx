import { motion } from "framer-motion";
import { RefObject } from "react";

interface LightingLayerProps {
  reduceMotion: boolean | null;
  lightingMaskRef: RefObject<HTMLDivElement | null>;
  dotAnchor: { left: number; top: number } | null;
  dotDelay: number;
}

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
        className="pointer-events-none absolute inset-0 z-[150]"
        aria-hidden="true"
        style={{
          opacity: dotAnchor ? 1 : 0,
          transition: "opacity 200ms ease-out",
          background:
            "radial-gradient(900px circle at var(--lighting-x, 50vw) var(--lighting-y, 50vh), rgba(0,0,0,0) 0%, rgba(0,0,0,0.01) 60%, rgba(0,0,0,0.02) 74%, rgba(0,0,0,0.04) 86%, rgba(0,0,0,0.08) 100%)",
        }}
      />
    );
  }

  return (
    <motion.div
      ref={lightingMaskRef}
      className="pointer-events-none absolute inset-0 z-[150]"
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: dotDelay, duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background:
          "radial-gradient(900px circle at var(--lighting-x, 50vw) var(--lighting-y, 50vh), rgba(0,0,0,0) 0%, rgba(0,0,0,0.01) 60%, rgba(0,0,0,0.02) 74%, rgba(0,0,0,0.04) 86%, rgba(0,0,0,0.08) 100%)",
      }}
    />
  );
}
