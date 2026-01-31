"use client";

import { animate, motion, useMotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";

function DraggableToken({
  children,
  containerRef,
  className,
  hover,
  onDirty,
  resetSignal,
  animateProps,
  transitionProps,
  onPointerDown,
  styleProps,
}: {
  children: React.ReactNode;
  containerRef: React.RefObject<HTMLElement | null>;
  className: string;
  hover: { scale: number; rotate?: number };
  onDirty: () => void;
  resetSignal: number;
  animateProps?: Parameters<typeof motion.span>[0]["animate"];
  transitionProps?: Parameters<typeof motion.span>[0]["transition"];
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
      animate={animateProps}
      transition={transitionProps}
    >
      {children}
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
  const [dirty, setDirty] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [dotAnimating, setDotAnimating] = useState(true);

  const lineVariants = {
    hidden: { y: 8 },
    show: {
      y: 0,
      transition: { type: "spring", stiffness: 180, damping: 22, staggerChildren: 0.02 },
    },
  } as const;

  return (
    <section>
      <div className="mx-auto max-w-6xl px-4">
        <div ref={containerRef} className="relative min-h-[80vh]">
          <motion.div className="select-none pt-20 sm:pt-32 [@media(max-height:650px)]:pt-14">
            {lines.map((line, idx) => {
              const isTitle = idx === 0;
              const tokens = isTitle ? Array.from(line) : line.split(" ");
              const lineClasses = isTitle
                ? "text-[clamp(2.75rem,7vw,4.5rem)] font-semibold tracking-tight leading-[1.02] text-zinc-900 dark:text-zinc-100"
                : idx === 1
                ? "mt-5 text-[clamp(1.25rem,3.2vw,2rem)] font-medium leading-snug text-zinc-900 dark:text-zinc-100"
                : "mt-3 max-w-4xl text-[clamp(1rem,2.2vw,1.25rem)] leading-relaxed text-zinc-600 dark:text-zinc-400";

              return (
                <motion.div key={idx} className={lineClasses} variants={lineVariants} initial="hidden" animate="show">
                  {tokens.map((t, i) => {
                    if (isTitle && t === ".") {
                      return (
                        <DraggableToken
                          key={`${idx}-${i}-dot`}
                          containerRef={containerRef}
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
                        containerRef={containerRef}
                        className={
                          isTitle
                            ? "inline-block cursor-grab active:cursor-grabbing px-1 sm:px-1.5"
                            : "inline-block cursor-grab active:cursor-grabbing px-1 mr-1"
                        }
                        hover={{ scale: 1.06, rotate: 0.8 }}
                        onDirty={() => setDirty(true)}
                        resetSignal={resetSignal}
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
                  })}
                </motion.div>
              );
            })}
          </motion.div>

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
