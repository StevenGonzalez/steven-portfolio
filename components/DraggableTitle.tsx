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
}: {
  children: React.ReactNode;
  containerRef: React.RefObject<HTMLElement | null>;
  className: string;
  hover: { scale: number; rotate?: number };
  onDirty: () => void;
  resetSignal: number;
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
      style={{ touchAction: "none", x, y }}
      onDragStart={onDirty}
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
          <motion.div className="select-none pt-24 sm:pt-32">
            {lines.map((line, idx) => {
              const isTitle = idx === 0;
              const tokens = isTitle ? Array.from(line) : line.split(" ");
              const lineClasses = isTitle
                ? "text-6xl sm:text-7xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
                : idx === 1
                ? "mt-6 text-2xl sm:text-3xl font-medium text-zinc-900 dark:text-zinc-100"
                : "mt-3 max-w-4xl text-lg sm:text-xl text-zinc-600 dark:text-zinc-400";

              return (
                <motion.div key={idx} className={lineClasses} variants={lineVariants} initial="hidden" animate="show">
                  {tokens.map((t, i) => {
                    if (isTitle && t === ".") {
                      return (
                        <DraggableToken
                          key={`${idx}-${i}-dot`}
                          containerRef={containerRef}
                          className="inline-block cursor-grab active:cursor-grabbing px-1.5 text-accent"
                          hover={{ scale: 1.06, rotate: 1 }}
                          onDirty={() => setDirty(true)}
                          resetSignal={resetSignal}
                        >
                          .
                        </DraggableToken>
                      );
                    }
                    return (
                      <DraggableToken
                        key={`${idx}-${i}-${t}`}
                        containerRef={containerRef}
                        className={isTitle ? "inline-block cursor-grab active:cursor-grabbing px-1.5" : "inline-block cursor-grab active:cursor-grabbing px-1 mr-1"}
                        hover={{ scale: 1.06, rotate: 0.8 }}
                        onDirty={() => setDirty(true)}
                        resetSignal={resetSignal}
                      >
                        {isTitle && t === " " ? "\u00A0" : t}
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
