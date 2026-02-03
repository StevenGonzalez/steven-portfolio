import { animate, motion, PanInfo, useMotionValue, useReducedMotion, MotionValue } from "framer-motion";
import { useRef, useState, useEffect, useLayoutEffect, useCallback } from "react";

// Physics constants for the draggable behavior
const PHYSICS = {
  reset: { type: "spring" as const, stiffness: 340, damping: 14, restDelta: 0.001 },
  // Gentle glide tuning
  drag: { 
    momentumScale: 0.45,
    spring: { type: "spring" as const, stiffness: 45, damping: 14, restDelta: 0.001 }
  },
  // Snap back to viewport
  snap: { type: "spring" as const, stiffness: 520, damping: 26, restDelta: 0.001 }
};

interface DraggableTokenProps {
  children: React.ReactNode;
  className: string;
  hover: { scale: number; rotate?: number };
  onDirty: () => void;
  resetSignal: number;
  enterInitialProps?: Parameters<typeof motion.span>[0]["initial"];
  enterAnimateProps?: Parameters<typeof motion.span>[0]["animate"];
  enterTransitionProps?: Parameters<typeof motion.span>[0]["transition"];
  onPointerDown?: () => void;
  styleProps?: React.CSSProperties;
  motionValues?: { x: MotionValue<number>; y: MotionValue<number> };
  forwardedRef?: React.RefCallback<HTMLSpanElement>;
  overlay?: boolean;
}

export function DraggableToken({
  children,
  className,
  hover,
  onDirty,
  resetSignal,
  enterInitialProps,
  enterAnimateProps,
  enterTransitionProps,
  onPointerDown,
  styleProps,
  motionValues,
  forwardedRef,
  overlay,
}: DraggableTokenProps) {
  const reduceMotion = useReducedMotion();
  const internalX = useMotionValue(0);
  const internalY = useMotionValue(0);
  const x = motionValues?.x ?? internalX;
  const y = motionValues?.y ?? internalY;

  const dragElRef = useRef<HTMLSpanElement | null>(null);
  const placeholderRef = useRef<HTMLSpanElement | null>(null);
  const [overlayBase, setOverlayBase] = useState<{ left: number; top: number } | null>(null);

  const setRefs = useCallback((node: HTMLSpanElement | null) => {
    dragElRef.current = node;
    if (forwardedRef) forwardedRef(node);
  }, [forwardedRef]);

  // Handle external reset signals
  useEffect(() => {
    if (resetSignal === 0) return;
    const ax = animate(x, 0, PHYSICS.reset);
    const ay = animate(y, 0, PHYSICS.reset);
    return () => {
      ax.stop();
      ay.stop();
    };
  }, [resetSignal, x, y]);

  // “Picked up” tactile feel
  const tapScale = reduceMotion ? 1 : 1.07;
  const dragScale = reduceMotion ? 1 : 1.14;

  const snapBackIntoViewport = useCallback(() => {
    const el = dragElRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const padding = 6;
    const maxRight = window.innerWidth - padding;
    const maxBottom = window.innerHeight - padding;

    let dx = 0;
    let dy = 0;

    if (rect.left < padding) dx = padding - rect.left;
    else if (rect.right > maxRight) dx = maxRight - rect.right;

    if (rect.top < padding) dy = padding - rect.top;
    else if (rect.bottom > maxBottom) dy = maxBottom - rect.bottom;

    if (dx === 0 && dy === 0) return;

    animate(x, x.get() + dx, PHYSICS.snap);
    animate(y, y.get() + dy, PHYSICS.snap);
  }, [x, y]);

  // Handle overlay positioning
  useLayoutEffect(() => {
    if (!overlay) return;

    let rafId = 0;

    const measure = (force: boolean) => {
      const el = placeholderRef.current;
      if (!el) return;

      // Don't re-anchor the overlay after the user has moved it.
      if (!force && (x.get() !== 0 || y.get() !== 0)) return;

      const rect = el.getBoundingClientRect();
      setOverlayBase({ left: rect.left, top: rect.top });
    };

    const schedule = (force: boolean) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => measure(force));
    };

    schedule(true);

    const fontsReady = (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
    fontsReady?.then(() => schedule(false)).catch(() => {});

    const onResize = () => schedule(false);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }, [overlay, x, y]);

  // Drag physics handler
  const handleDragEnd = useCallback((_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (reduceMotion) {
      snapBackIntoViewport();
      return;
    }

    const vx = info.velocity.x ?? 0;
    const vy = info.velocity.y ?? 0;
    const speed = Math.hypot(vx, vy);

    if (speed < 80) {
      snapBackIntoViewport();
      return;
    }

    const targetX = x.get() + vx * PHYSICS.drag.momentumScale;
    const targetY = y.get() + vy * PHYSICS.drag.momentumScale;

    animate(x, targetX, {
      ...PHYSICS.drag.spring,
      onComplete: snapBackIntoViewport,
    });
    animate(y, targetY, PHYSICS.drag.spring);
  }, [reduceMotion, x, y, snapBackIntoViewport]);

  const draggable = (
    <motion.span
      ref={setRefs}
      drag
      dragMomentum={false}
      whileHover={hover}
      whileTap={reduceMotion ? undefined : { scale: tapScale }}
      whileDrag={reduceMotion ? undefined : { scale: dragScale }}
      className={className}
      style={
        overlay
          ? {
              position: "fixed",
              zIndex: 100,
              touchAction: "none",
              left: overlayBase?.left ?? 0,
              top: overlayBase?.top ?? 0,
              opacity: overlayBase ? 1 : 0,
              x,
              y,
              ...styleProps,
            }
          : { touchAction: "none", x, y, ...styleProps }
      }
      onDragStart={onDirty}
      onDragEnd={handleDragEnd}
      onPointerDown={onPointerDown}
    >
      <motion.span
        className="inline-block"
        style={{ willChange: "transform, opacity, filter" }}
        initial={enterInitialProps}
        animate={enterAnimateProps}
        transition={enterTransitionProps}
      >
        {children}
      </motion.span>
    </motion.span>
  );

  if (!overlay) return draggable;

  return (
    <>
      <span
        ref={placeholderRef}
        className={`${className} pointer-events-none`}
        style={{ visibility: "hidden", ...styleProps }}
        aria-hidden="true"
      >
        <span className="inline-block">{children}</span>
      </span>
      {draggable}
    </>
  );
}
