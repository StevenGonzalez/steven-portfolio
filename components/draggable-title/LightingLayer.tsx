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
        className="pointer-events-none fixed inset-0 z-[120]"
        aria-hidden="true"
        style={{
          opacity: dotAnchor ? 1 : 0,
          transition: "opacity 200ms ease-out",
          background:
            "radial-gradient(460px circle at var(--lighting-x, 50vw) var(--lighting-y, 50vh), rgb(var(--accent-rgb) / 0.24) 0%, rgb(var(--accent-rgb) / 0.12) 34%, rgb(var(--accent-rgb) / 0.04) 56%, transparent 78%), radial-gradient(1450px circle at var(--lighting-x, 50vw) var(--lighting-y, 50vh), rgba(0,0,0,0) 0%, rgba(0,0,0,0.004) 58%, rgba(0,0,0,0.012) 78%, rgba(0,0,0,0.02) 96%, rgba(0,0,0,0.03) 104%)",
        }}
      />
    );
  }

  return (
    <motion.div
      ref={lightingMaskRef}
      className="pointer-events-none fixed inset-0 z-[120]"
      aria-hidden="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: dotDelay, duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
      style={{
        background:
          "radial-gradient(460px circle at var(--lighting-x, 50vw) var(--lighting-y, 50vh), rgb(var(--accent-rgb) / 0.24) 0%, rgb(var(--accent-rgb) / 0.12) 34%, rgb(var(--accent-rgb) / 0.04) 56%, transparent 78%), radial-gradient(1450px circle at var(--lighting-x, 50vw) var(--lighting-y, 50vh), rgba(0,0,0,0) 0%, rgba(0,0,0,0.004) 58%, rgba(0,0,0,0.012) 78%, rgba(0,0,0,0.02) 96%, rgba(0,0,0,0.03) 104%)",
      }}
    />
  );
}
