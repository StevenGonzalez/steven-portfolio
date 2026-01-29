"use client";

import { motion } from "framer-motion";
import { useRef, useState } from "react";

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
  const [resetKey, setResetKey] = useState(0);
  const [dirty, setDirty] = useState(false);

  return (
    <section>
      <div className="mx-auto max-w-6xl px-4">
        <div ref={containerRef} className="relative min-h-[80vh]">
          <motion.div key={resetKey} className="select-none pt-24 sm:pt-32">
            {lines.map((line, idx) => {
              const isTitle = idx === 0;
              const tokens = isTitle ? Array.from(line) : line.split(" ");
              const lineClasses = isTitle
                ? "text-6xl sm:text-7xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
                : idx === 1
                ? "mt-6 text-2xl sm:text-3xl font-medium text-zinc-900 dark:text-zinc-100"
                : "mt-3 max-w-4xl text-lg sm:text-xl text-zinc-600 dark:text-zinc-400";

              return (
                <div key={idx} className={lineClasses}>
                  {tokens.map((t, i) => {
                    if (isTitle && t === ".") {
                      return (
                        <motion.span
                          key={`${idx}-${i}-dot`}
                          drag
                          dragConstraints={containerRef}
                          dragMomentum
                          dragElastic={0.2}
                          whileHover={{ scale: 1.06 }}
                          whileTap={{ scale: 0.95 }}
                          className="inline-block cursor-grab px-1.5 text-accent"
                          style={{ touchAction: "none" }}
                          onDragStart={() => setDirty(true)}
                        >
                          .
                        </motion.span>
                      );
                    }
                    return (
                      <motion.span
                        key={`${idx}-${i}-${t}`}
                        drag
                        dragConstraints={containerRef}
                        dragMomentum
                        dragElastic={0.2}
                        whileHover={{ scale: 1.06 }}
                        whileTap={{ scale: 0.95 }}
                        className={isTitle ? "inline-block cursor-grab px-1.5" : "inline-block cursor-grab px-1 mr-1"}
                        style={{ touchAction: "none" }}
                        onDragStart={() => setDirty(true)}
                      >
                        {isTitle && t === " " ? "\u00A0" : t}
                      </motion.span>
                    );
                  })}
                </div>
              );
            })}
          </motion.div>

          {dirty && (
            <div className="absolute right-4 top-4">
              <button
                onClick={() => {
                  setResetKey((k) => k + 1);
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
