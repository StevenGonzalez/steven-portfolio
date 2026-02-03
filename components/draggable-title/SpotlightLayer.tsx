import { motion } from "framer-motion";
import { RefObject } from "react";

interface SpotlightLayerProps {
  reduceMotion: boolean | null;
  spotlightRef: RefObject<HTMLDivElement | null>;
  dotDelay: number;
}

export function SpotlightLayer({
  reduceMotion,
  spotlightRef,
  dotDelay,
}: SpotlightLayerProps) {
  return (
    <div
      className="pointer-events-none absolute inset-0 left-1/2 w-screen -translate-x-1/2 -z-10"
      aria-hidden="true"
    >
      {reduceMotion ? (
        <div ref={spotlightRef} className="premium-spotlight" />
      ) : (
        <motion.div
          ref={spotlightRef}
          className="premium-spotlight"
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: dotDelay, duration: 1.05, ease: [0.16, 1, 0.3, 1] }}
        />
      )}
    </div>
  );
}
