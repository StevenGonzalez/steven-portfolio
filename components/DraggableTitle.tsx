"use client";

import { animate, motion, useMotionValue, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

function DraggableToken({
  children,
  containerRef,
  className,
  hover,
  onDirty,
  resetSignal,
  enterInitialProps,
  enterAnimateProps,
  enterTransitionProps,
  onPointerDown,
  styleProps,
}: {
  children: React.ReactNode;
  containerRef: React.RefObject<HTMLElement | null>;
  className: string;
  hover: { scale: number; rotate?: number };
  onDirty: () => void;
  resetSignal: number;
  enterInitialProps?: Parameters<typeof motion.span>[0]["initial"];
  enterAnimateProps?: Parameters<typeof motion.span>[0]["animate"];
  enterTransitionProps?: Parameters<typeof motion.span>[0]["transition"];
  onPointerDown?: () => void;
  styleProps?: React.CSSProperties;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

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

  return (
    <motion.span
      drag
      dragConstraints={containerRef}
      dragMomentum
      dragElastic={0.2}
      whileHover={hover}
      whileTap={{ scale: 0.95 }}
      className={className}
      style={{ touchAction: "none", x, y, ...styleProps }}
      onDragStart={onDirty}
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
}

export default function DraggableTitle({
  lines = [
    "Hi, I'm Steven.",
    "Senior Software Engineer, clarity-first systems.",
    "I design reliable, performant software with pragmatic tradeoffs.",
  ],
}: {
  lines?: string[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const constraintsRef = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [dotAnimating, setDotAnimating] = useState(true);
  const reduceMotion = useReducedMotion();

  const getTokenDelay = (lineIndex: number, tokenIndex: number) => {
    // Tuned to feel "premium": the title takes its time, then supporting lines follow.
    if (lineIndex === 0) return 0.12 + tokenIndex * 0.042;
    if (lineIndex === 1) return 0.78 + tokenIndex * 0.055;
    return 1.12 + tokenIndex * 0.03;
  };

  const tokenizeTitle = (line: string) => {
    // Preserve spaces so the layout stays natural.
    // We keep the trailing '.' as its own draggable accent token.
    const parts = line.split(/(\s+)/g).filter((p) => p.length > 0);
    const tokens: string[] = [];
    for (const part of parts) {
      if (/^\s+$/.test(part)) {
        tokens.push(part);
        continue;
      }
      if (part.length > 1 && part.endsWith(".")) {
        tokens.push(part.slice(0, -1));
        tokens.push(".");
        continue;
      }
      tokens.push(part);
    }
    return tokens;
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

  return (
    <section className="relative">
      {/* Full-viewport drag constraints so tokens can be moved anywhere on screen */}
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none" aria-hidden="true" />

      {/* Spotlight spans full viewport width (not clipped by max-w container) */}
      <div
        className="pointer-events-none absolute inset-0 left-1/2 w-screen -translate-x-1/2 -z-10"
        aria-hidden="true"
      >
        {reduceMotion ? (
          <div className="premium-spotlight" />
        ) : (
          <motion.div
            className="premium-spotlight"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.65, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
      </div>

      <div className="mx-auto max-w-6xl px-4">
        <div ref={containerRef} className="relative min-h-[80vh]">
          <div className="select-none pt-20 sm:pt-32 [@media(max-height:650px)]:pt-14">
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

                    if (isTitle && t === ".") {
                      return (
                        <DraggableToken
                          key={`${idx}-${i}-dot`}
                          containerRef={constraintsRef}
                          className="inline-block origin-center cursor-grab active:cursor-grabbing mx-1 sm:mx-1.5 leading-none text-accent"
                          hover={{ scale: 1.06 }}
                          onDirty={() => {
                            setDirty(true);
                            setDotAnimating(false);
                          }}
                          onPointerDown={() => {
                            setDirty(true);
                            setDotAnimating(false);
                          }}
                          resetSignal={resetSignal}
                          enterInitialProps={enter.enterInitialProps}
                          enterAnimateProps={enter.enterAnimateProps}
                          enterTransitionProps={enter.enterTransitionProps}
                        >
                          <span className="relative top-[0.08em] inline-block align-baseline">
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
                                <svg
                                  viewBox="0 0 10 10"
                                  className="block h-full w-full"
                                  aria-hidden="true"
                                  focusable="false"
                                >
                                  <circle cx="5" cy="5" r="4.1" fill="currentColor" />
                                  <circle cx="3.2" cy="3.1" r="1.2" fill="white" opacity="0.45" />
                                </svg>
                              </span>
                            </motion.span>
                          </span>
                        </DraggableToken>
                      );
                    }
                    return (
                      <DraggableToken
                        key={`${idx}-${i}-${t}`}
                        containerRef={constraintsRef}
                        className={
                          isTitle
                            ? "inline-block cursor-grab active:cursor-grabbing"
                            : "inline-block cursor-grab active:cursor-grabbing px-1 mr-1"
                        }
                        hover={{ scale: 1.06, rotate: 0.8 }}
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
