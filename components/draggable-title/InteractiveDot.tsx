import { motion, MotionValue } from "framer-motion";
import { RefObject } from "react";
import { DraggableToken } from "../DraggableToken";

interface InteractiveDotProps {
  dotAnchor: { left: number; top: number } | null;
  onDirty: () => void;
  resetSignal: number;
  dotEnter: {
    enterInitialProps?: Parameters<typeof motion.span>[0]["initial"];
    enterAnimateProps?: Parameters<typeof motion.span>[0]["animate"];
    enterTransitionProps?: Parameters<typeof motion.span>[0]["transition"];
  };
  dotX: MotionValue<number>;
  dotY: MotionValue<number>;
  dotRef: RefObject<HTMLElement | null>;
  dotAnimating: boolean;
  clipId: string;
}

export function InteractiveDot({
  dotAnchor,
  onDirty,
  resetSignal,
  dotEnter,
  dotX,
  dotY,
  dotRef,
  dotAnimating,
  clipId,
}: InteractiveDotProps) {
  return (
    <DraggableToken
      key={dotAnchor ? "hero-dot-ready" : "hero-dot-init"}
      className="fixed z-[200] inline-block origin-center cursor-grab active:cursor-grabbing leading-none text-accent"
      hover={{ scale: 1.03 }}
      onDirty={onDirty}
      onPointerDown={onDirty}
      resetSignal={resetSignal}
      enterInitialProps={dotEnter.enterInitialProps}
      enterAnimateProps={dotEnter.enterAnimateProps}
      enterTransitionProps={dotEnter.enterTransitionProps}
      motionValues={{ x: dotX, y: dotY }}
      forwardedRef={(node) => {
        dotRef.current = node;
      }}
      styleProps={{
        left: `${dotAnchor?.left ?? 0}px`,
        top: `${dotAnchor?.top ?? 0}px`,
        fontSize: "clamp(2.75rem,7vw,4.5rem)",
        lineHeight: 1,
        opacity: dotAnchor ? 1 : 0,
      }}
    >
      <motion.span
        className="inline-block"
        style={{ transformOrigin: "50% 50%" }}
        animate={dotAnimating ? { scale: [1, 1.16, 1] } : { scale: 1 }}
        transition={
          dotAnimating
            ? {
                duration: 0.7,
                repeat: Infinity,
                repeatDelay: 0.9,
                times: [0, 0.5, 1],
                ease: "easeInOut",
              }
            : undefined
        }
      >
        <span className="block h-[0.24em] w-[0.24em]">
          <svg viewBox="0 0 10 10" className="block h-full w-full" aria-hidden="true" focusable="false">
            <defs>
              <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
                <circle cx="5" cy="5" r="4.1" />
              </clipPath>
            </defs>
            <circle cx="5" cy="5" r="4.1" fill="currentColor" />
            <g clipPath={`url(#${clipId})`}>
              <circle cx="3.2" cy="3.1" r="1.2" fill="white" opacity="0.45" />
            </g>
          </svg>
        </span>
      </motion.span>
    </DraggableToken>
  );
}
