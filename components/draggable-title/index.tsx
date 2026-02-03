"use client";

import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, useCallback, useId } from "react";
import { usePathname } from "next/navigation";
import { usePreviousPath } from "../NavProvider";
import { useSpotlight } from "../../hooks/useSpotlight";
import { useDotAnchor } from "../../hooks/useDotAnchor";
import { LightingLayer } from "./LightingLayer";
import { SpotlightLayer } from "./SpotlightLayer";
import { InteractiveDot } from "./InteractiveDot";
import { TitleLine } from "./TitleLine";
import { getTokenDelay, tokenizeTitle } from "./utils";
export default function DraggableTitle({
  lines = [
    "Hi, I'm Steven",
    "Senior Software Engineer, clarity-first systems",
    "I design reliable, performant software with pragmatic tradeoffs",
  ],
  fill = false,
  children,
}: {
  lines: string[];
  fill?: boolean;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const prevPath = usePreviousPath();

  const containerRef = useRef<HTMLDivElement>(null);
  const spotlightRef = useRef<HTMLDivElement>(null);
  const lightingMaskRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const hiIGlyphRef = useRef<HTMLSpanElement>(null);
  const [dotAnchor, setDotAnchor] = useState<{ left: number; top: number } | null>(null);
  const dotHomeRef = useRef<{ left: number; top: number } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [dotAnimating, setDotAnimating] = useState(true);
  const reduceMotion = useReducedMotion();
  const clipId = useId();

  const dotX = useMotionValue(0);
  const dotY = useMotionValue(0);

  const setStaticGlyphRef = useCallback((node: HTMLSpanElement | null) => {
    if (!node) return;
    if (node.closest('[aria-hidden="true"]')) {
      hiIGlyphRef.current = node;
    }
  }, []);

  useDotAnchor({
    hiIGlyphRef,
    dotRef,
    dotX,
    dotY,
    setDotAnchor,
    dotHomeRef,
  });

  useSpotlight({
    dotRef,
    spotlightRef,
    lightingMaskRef,
    dotAnchor,
    dotX,
    dotY,
  });

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

  const getPageIndex = (p: string | null) => {
    if (!p) return -1;
    if (p === "/") return 0;
    if (p.startsWith("/projects")) return 1;
    if (p.startsWith("/insights")) return 2;
    return -1;
  };

  const currIdx = getPageIndex(pathname);
  const prevIdx = getPageIndex(prevPath);

  let enterX = 0;
  let useFlyIn = false;

  if (prevPath && prevIdx !== -1 && currIdx !== -1) {
    if (prevIdx < currIdx) {
      enterX = -2000;
      useFlyIn = true;
    } else if (prevIdx > currIdx) {
      enterX = 2000;
      useFlyIn = true;
    }
  }

  const dotDelay = useFlyIn ? 0.2 : lastRevealDelay + 0.18;

  useEffect(() => {
    if (useFlyIn && !reduceMotion) {
      dotX.set(enterX);
      const transition = { delay: 0.2, duration: 1.4, ease: [0.16, 1, 0.3, 1] as const };
      animate(dotX, 0, transition);
      animate(dotY, 0, transition);
    }
  }, [useFlyIn, enterX, dotX, dotY, reduceMotion]);

  const dotEnter = reduceMotion
    ? { enterInitialProps: false as const, enterAnimateProps: undefined, enterTransitionProps: undefined }
    : {
        enterInitialProps: useFlyIn
          ? {
              opacity: 0,
              scale: 1,
            }
          : {
              opacity: 0,
              x: 0,
              scale: 0.985,
              filter: "blur(10px)",
            },
        enterAnimateProps: {
          opacity: 1,
          x: 0,
          scale: 1,
          filter: "blur(0px)",
        },
        enterTransitionProps: {
          delay: useFlyIn ? 0.2 : dotDelay,
          duration: useFlyIn ? 1.4 : 1.05,
          ease: [0.16, 1, 0.3, 1],
        },
      };

  return (
    <section
      className={
        fill
          ? "relative z-0 flex flex-1 flex-col overflow-x-hidden overflow-y-visible"
          : "relative z-0 flex flex-1 flex-col overflow-x-hidden overflow-y-visible"
      }
    >
      <LightingLayer
        reduceMotion={reduceMotion}
        lightingMaskRef={lightingMaskRef}
        dotAnchor={dotAnchor}
        dotDelay={dotDelay}
      />

      <InteractiveDot
        dotAnchor={dotAnchor}
        onDirty={() => {
          setDirty(true);
          setDotAnimating(false);
        }}
        resetSignal={resetSignal}
        dotEnter={dotEnter}
        dotX={dotX}
        dotY={dotY}
        dotRef={dotRef}
        dotAnimating={dotAnimating}
        clipId={clipId}
      />

      <SpotlightLayer
        reduceMotion={reduceMotion}
        spotlightRef={spotlightRef}
        dotDelay={dotDelay}
      />


      <div className={fill ? "mx-auto flex w-full max-w-6xl flex-1 flex-col px-4" : "mx-auto flex w-full max-w-6xl flex-1 flex-col px-4"}>
        <div
          ref={containerRef}
          className={fill ? "relative flex min-h-full flex-1 flex-col justify-start" : "relative flex min-h-full flex-1 flex-col justify-start"}
        >
          <div
            className={
              fill
                ? "select-none pt-20 pb-12 sm:pt-32 sm:pb-16 [@media(max-height:650px)]:pt-14"
                : "select-none pt-20 sm:pt-32 [@media(max-height:650px)]:pt-14"
            }
          >
            {lines.map((line, idx) => (
              <TitleLine
                key={idx}
                line={line}
                idx={idx}
                reduceMotion={reduceMotion}
                setDirty={setDirty}
                resetSignal={resetSignal}
                setStaticGlyphRef={setStaticGlyphRef}
              />
            ))}
          </div>

          {children && <div className="mt-8 relative z-10">{children}</div>}

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
