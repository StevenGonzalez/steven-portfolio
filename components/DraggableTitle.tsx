"use client";

import { animate, motion, type MotionValue, useMotionValue, useReducedMotion } from "framer-motion";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

function DraggableToken({
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
}: {
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
}) {
  const reduceMotion = useReducedMotion();
  const internalX = useMotionValue(0);
  const internalY = useMotionValue(0);
  const x = motionValues?.x ?? internalX;
  const y = motionValues?.y ?? internalY;

  const dragElRef = useRef<HTMLSpanElement | null>(null);
  const placeholderRef = useRef<HTMLSpanElement | null>(null);
  const [overlayBase, setOverlayBase] = useState<{ left: number; top: number } | null>(null);

  const setRefs = (node: HTMLSpanElement | null) => {
    dragElRef.current = node;
    forwardedRef?.(node);
  };

  useEffect(() => {
    if (resetSignal === 0) return;
    const transition = { type: "spring" as const, stiffness: 340, damping: 14, restDelta: 0.001 };
    const ax = animate(x, 0, transition);
    const ay = animate(y, 0, transition);
    return () => {
      ax.stop();
      ay.stop();
    };
  }, [resetSignal, x, y]);

  // “Picked up” should feel lifted (slightly larger), not pressed down.
  const tapScale = reduceMotion ? 1 : 1.07;
  const dragScale = reduceMotion ? 1 : 1.14;

  const snapBackIntoViewport = () => {
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

    const transition = { type: "spring" as const, stiffness: 520, damping: 26, restDelta: 0.001 };
    animate(x, x.get() + dx, transition);
    animate(y, y.get() + dy, transition);
  };

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
    fontsReady
      ?.then(() => schedule(false))
      .catch(() => {
        // ignore
      });

    const onResize = () => schedule(false);
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
    };
  }, [overlay, x, y]);

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
      onDragEnd={snapBackIntoViewport}
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
export default function DraggableTitle({
  lines = [
    "Hi, I'm Steven",
    "Senior Software Engineer, clarity-first systems",
    "I design reliable, performant software with pragmatic tradeoffs",
  ],
  fill = false,
}: {
  lines?: string[];
  fill?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const hiIGlyphRef = useRef<HTMLSpanElement>(null);
  const [dotAnchor, setDotAnchor] = useState<{ left: number; top: number } | null>(null);
  const dotHomeRef = useRef<{ left: number; top: number } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [dotAnimating, setDotAnimating] = useState(true);
  const reduceMotion = useReducedMotion();

  const dotX = useMotionValue(0);
  const dotY = useMotionValue(0);

  useLayoutEffect(() => {
    let rafId = 0;
    let settleRafId = 0;
    const HI_DOT_TUNE_X = 2;
    const HI_DOT_TUNE_Y = 32;

    const computeAnchor = (force: boolean) => {
      const glyphEl = hiIGlyphRef.current;
      const dotEl = dotRef.current;
      if (!glyphEl || !dotEl) return;

      // Avoid snapping the dot back during normal resizes/font swaps if the user has dragged it away.
      if (!force && (dotX.get() !== 0 || dotY.get() !== 0)) return;

      const glyphRect = glyphEl.getBoundingClientRect();

      // IMPORTANT: Use layout size (offset*) so transforms (pulse scale / drag)
      // don't affect the computed dock position.
      const dotW = dotEl.offsetWidth || dotEl.getBoundingClientRect().width;
      const dotH = dotEl.offsetHeight || dotEl.getBoundingClientRect().height;

      const iCenterX = glyphRect.left + glyphRect.width / 2;
      const left = iCenterX - dotW / 2 + HI_DOT_TUNE_X;

      // Place the dot above the top of the (dotless) i stem.
      const top = glyphRect.top - dotH * 1.05 + HI_DOT_TUNE_Y;

      const anchor = { left, top };
      setDotAnchor(anchor);
      // Record the canonical "home" position while the dot hasn't been dragged.
      if (dotX.get() === 0 && dotY.get() === 0) dotHomeRef.current = anchor;
    };

    const schedule = (force: boolean) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => computeAnchor(force));
    };

    const scheduleAfterSettle = () => {
      cancelAnimationFrame(settleRafId);

      const glyphEl = hiIGlyphRef.current;
      if (!glyphEl) {
        schedule(true);
        return;
      }

      const start = performance.now();
      let lastLeft = Number.NaN;
      let lastTop = Number.NaN;
      let stableFrames = 0;

      const tick = () => {
        const rect = glyphEl.getBoundingClientRect();
        const moved =
          Number.isFinite(lastLeft) && Number.isFinite(lastTop)
            ? Math.abs(rect.left - lastLeft) + Math.abs(rect.top - lastTop)
            : Infinity;

        lastLeft = rect.left;
        lastTop = rect.top;

        if (moved < 0.25) stableFrames += 1;
        else stableFrames = 0;

        // Once the glyph stops moving (spring settled), force a final anchor compute.
        // Fallback after ~1.6s so we never get stuck.
        if (stableFrames >= 6 || performance.now() - start > 1600) {
          schedule(true);
          return;
        }

        settleRafId = requestAnimationFrame(tick);
      };

      settleRafId = requestAnimationFrame(tick);
    };

    // Compute the canonical home on mount by waiting for the title to settle.
    // Reset should use the stored home (see Reset button handler) to avoid post-reset jumps.
    scheduleAfterSettle();

    // Recompute once fonts are ready (swap can shift glyph metrics).
    const fontsReady = (document as Document & { fonts?: FontFaceSet }).fonts?.ready;
    fontsReady
      ?.then(() => schedule(false))
      .catch(() => {
      // ignore
    });

    const onResize = () => schedule(false);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(rafId);
      cancelAnimationFrame(settleRafId);
      window.removeEventListener("resize", onResize);
    };
  }, [dotX, dotY]);

  useEffect(() => {
    let secretEl: HTMLElement | null = null;
    const updateSpotlight = () => {
      const dotEl = dotRef.current;
      const spotlightEl = spotlightRef.current;
      if (!dotEl || !spotlightEl) return;
      if (!dotAnchor) return;

      const dotRect = dotEl.getBoundingClientRect();
      const spotRect = spotlightEl.getBoundingClientRect();

      const cx = dotRect.left + dotRect.width / 2 - spotRect.left;
      const cy = dotRect.top + dotRect.height / 2 - spotRect.top;

      const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

      // Single main spotlight: center it on the dot.
      const w = spotRect.width;
      const h = spotRect.height;

      // Allow the gradient centers to move slightly outside the element bounds.
      // The spotlight element is oversized (inset: -25%), so clamping tightly can make a
      // gradient appear "stuck" against an edge.
      const overflowX = w * 0.35;
      const overflowY = h * 0.35;
      const minX = -overflowX;
      const maxX = w + overflowX;
      const minY = -overflowY;
      const maxY = h + overflowY;

      const g1x = clamp(cx, minX, maxX);
      const g1y = clamp(cy, minY, maxY);

      // Vars for the single gradient
      spotlightEl.style.setProperty("--spotlight-1-x", `${g1x}px`);
      spotlightEl.style.setProperty("--spotlight-1-y", `${g1y}px`);

      // Secret message reveal (in footer). Safe no-op on pages/layouts without it.
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

    window.addEventListener("resize", updateSpotlight);
    window.addEventListener("scroll", updateSpotlight, { passive: true });
    return () => {
      unsubscribeX();
      unsubscribeY();
      window.removeEventListener("resize", updateSpotlight);
      window.removeEventListener("scroll", updateSpotlight);
    };
  }, [dotX, dotY, dotAnchor]);

  const getTokenDelay = (lineIndex: number, tokenIndex: number) => {
    // Tuned to feel "premium": the title takes its time, then supporting lines follow.
    if (lineIndex === 0) return 0.12 + tokenIndex * 0.042;
    if (lineIndex === 1) return 0.78 + tokenIndex * 0.055;
    return 1.12 + tokenIndex * 0.03;
  };

  const tokenizeTitle = (line: string) => {
    // Preserve spaces so the layout stays natural.
    // Keep punctuation attached (e.g. "Steven." drags as one token).
    return line.split(/(\s+)/g).filter((p) => p.length > 0);
  };

  const getEnterAnimation = (delay: number, isTitle: boolean) => {
    if (reduceMotion) {
      return {
        enterInitialProps: false as const,
        enterAnimateProps: undefined,
        enterTransitionProps: undefined,
      };
    }

    return {
      enterInitialProps: {
        opacity: 0,
        y: isTitle ? 16 : 12,
        scale: 0.985,
        filter: "blur(10px)",
      },
      enterAnimateProps: {
        opacity: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
      },
      enterTransitionProps: {
        delay,
        duration: isTitle ? 1.05 : 0.95,
        ease: [0.16, 1, 0.3, 1],
      },
    };
  };

  // Fade the dot (and spotlight) in last, after all text has revealed.
  const lastRevealDelay = (() => {
    let maxDelay = 0;
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      const isTitle = lineIndex === 0;
      const tokens = isTitle ? tokenizeTitle(lines[lineIndex] ?? "") : (lines[lineIndex] ?? "").split(" ");
      const revealTokens = isTitle ? tokens.filter((t) => !/^\s+$/.test(t)) : tokens.filter((t) => t.length > 0);
      if (revealTokens.length === 0) continue;
      const delay = getTokenDelay(lineIndex, revealTokens.length - 1);
      maxDelay = Math.max(maxDelay, delay);
    }
    return maxDelay;
  })();

  const dotDelay = lastRevealDelay + 0.18;
  const dotEnter = reduceMotion
    ? { enterInitialProps: false as const, enterAnimateProps: undefined, enterTransitionProps: undefined }
    : {
        enterInitialProps: {
          opacity: 0,
          scale: 0.985,
          filter: "blur(10px)",
        },
        enterAnimateProps: {
          opacity: 1,
          scale: 1,
          filter: "blur(0px)",
        },
        enterTransitionProps: {
          delay: dotDelay,
          duration: 1.05,
          ease: [0.16, 1, 0.3, 1],
        },
      };

  return (
    <section
      className={
        fill
          ? "relative flex flex-1 flex-col overflow-x-hidden overflow-y-visible"
          : "relative overflow-x-hidden overflow-y-visible"
      }
    >
      {/* Draggables can move off-screen but will snap back on release. */}

      {/* Draggable dot (independent from the word "Hi") */}
      <DraggableToken
        key={dotAnchor ? "hero-dot-ready" : "hero-dot-init"}
        className="fixed z-[200] inline-block origin-center cursor-grab active:cursor-grabbing leading-none text-accent"
        hover={{ scale: 1.03 }}
        onDirty={() => {
          setDirty(true);
          setDotAnimating(false);
        }}
        onPointerDown={() => {
          setDirty(true);
          setDotAnimating(false);
        }}
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
              <circle cx="5" cy="5" r="4.1" fill="currentColor" />
              <circle cx="3.2" cy="3.1" r="1.2" fill="white" opacity="0.45" />
            </svg>
          </span>
        </motion.span>
      </DraggableToken>

      {/* Spotlight spans full viewport width (not clipped by max-w container) */}
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

      <div className={fill ? "mx-auto flex w-full max-w-6xl flex-1 flex-col px-4" : "mx-auto max-w-6xl px-4"}>
        <div
          ref={containerRef}
          className={fill ? "relative flex min-h-full flex-1 flex-col justify-start" : "relative min-h-[80vh]"}
        >
          <div
            className={
              fill
                ? "select-none pt-20 pb-12 sm:pt-32 sm:pb-16 [@media(max-height:650px)]:pt-14"
                : "select-none pt-20 sm:pt-32 [@media(max-height:650px)]:pt-14"
            }
          >
            {lines.map((line, idx) => {
              const isTitle = idx === 0;
              const tokens = isTitle ? tokenizeTitle(line) : line.split(" ");
              const lineClasses = isTitle
                ? "font-display text-[clamp(2.75rem,7vw,4.5rem)] font-semibold tracking-tight leading-[1.02] text-zinc-900 dark:text-zinc-100"
                : idx === 1
                ? "font-display mt-5 text-[clamp(1.25rem,3.2vw,2rem)] font-medium leading-snug text-zinc-900 dark:text-zinc-100"
                : "mt-3 max-w-4xl text-[clamp(1rem,2.2vw,1.25rem)] leading-relaxed text-zinc-600 dark:text-zinc-400";

              return (
                <div key={idx} className={lineClasses}>
                  {(() => {
                    let revealIndex = 0;
                    return tokens.map((t, i) => {
                      if (isTitle && /^\s+$/.test(t)) {
                        return (
                          <span key={`${idx}-${i}-space`} className="inline-block whitespace-pre" aria-hidden="true">
                            {t}
                          </span>
                        );
                      }

                      const delay = getTokenDelay(idx, revealIndex);
                      revealIndex += 1;
                    const enter = getEnterAnimation(delay, isTitle);

                    // Special case: make the draggable purple dot act as the dot on the "i" in "Hi".
                    // We render a dotless i ("ı") and anchor the draggable dot to that glyph.
                    if (isTitle && idx === 0 && i === 0 && (t === "Hi," || t === "Hi")) {
                      const comma = t === "Hi," ? "," : "";
                      return (
                        <DraggableToken
                          key={`${idx}-${i}-hi`}
                          className="relative z-[60] inline-block cursor-grab active:cursor-grabbing"
                          overlay
                          hover={{ scale: 1.03, rotate: 0.8 }}
                          onDirty={() => setDirty(true)}
                          resetSignal={resetSignal}
                          enterInitialProps={enter.enterInitialProps}
                          enterAnimateProps={enter.enterAnimateProps}
                          enterTransitionProps={enter.enterTransitionProps}
                        >
                          <span className="inline-flex items-baseline">
                            <span>H</span>
                            <span className="relative inline-block">
                              <span ref={hiIGlyphRef}>ı</span>
                            </span>
                            <span>{comma}</span>
                          </span>
                        </DraggableToken>
                      );
                    }

                    return (
                      <DraggableToken
                        key={`${idx}-${i}-${t}`}
                        className={
                          isTitle
                            ? "relative z-[60] inline-block cursor-grab active:cursor-grabbing"
                            : "relative z-[60] inline-block cursor-grab active:cursor-grabbing px-1 mr-1"
                        }
                        overlay
                        hover={{ scale: 1.03, rotate: 0.8 }}
                        onDirty={() => setDirty(true)}
                        resetSignal={resetSignal}
                        enterInitialProps={enter.enterInitialProps}
                        enterAnimateProps={enter.enterAnimateProps}
                        enterTransitionProps={enter.enterTransitionProps}
                        styleProps={
                          isTitle && t === " "
                            ? {
                                whiteSpace: "pre-wrap",
                              }
                            : undefined
                        }
                      >
                        {t}
                      </DraggableToken>
                    );
                    });
                  })()}
                </div>
              );
            })}
          </div>

          {dirty && (
            <div className="absolute right-4 top-4">
              <button
                onClick={() => {
                  setResetSignal((n) => n + 1);
                  if (dotHomeRef.current) setDotAnchor(dotHomeRef.current);
                  setDirty(false);
                  setDotAnimating(true);
                }}
                className="rounded-full border border-zinc-300 px-3 py-1 text-xs text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-900"
              >
                Reset
              </button>
            </div>
          )}
        </div>
      </div>

    </section>
  );
}
