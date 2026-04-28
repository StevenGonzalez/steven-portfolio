"use client";

import { animate, useMotionValue, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, useCallback, useId } from "react";
import { usePathname } from "next/navigation";
import { usePreviousPath } from "../NavProvider";
import { useSpotlight } from "../../hooks/useSpotlight";
import { useDotAnchor } from "../../hooks/useDotAnchor";
import { LightingLayer } from "./LightingLayer";
import { InteractiveDot } from "./InteractiveDot";
import { TitleLine } from "./TitleLine";
import { getTokenDelay, tokenizeTitle } from "./utils";
import { getHeroEntryTransition } from "./transition";
export default function DraggableTitle({
  lines = [
    "Hi, I'm Steven",
    "Senior Software Engineer, clarity-first systems",
    "I design reliable, performant software with pragmatic tradeoffs",
  ],
  fill = false,
  compactSpacing = false,
  compactTitle = false,
  children,
}: {
  lines: string[];
  fill?: boolean;
  compactSpacing?: boolean;
  compactTitle?: boolean;
  children?: React.ReactNode;
}) {
  const pathname = usePathname();
  const prevPath = usePreviousPath();

  const spotlightRef = useRef<HTMLDivElement>(null);
  const lightingMaskRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLSpanElement>(null);
  const hiIGlyphRef = useRef<HTMLSpanElement>(null);
  const [dotAnchor, setDotAnchor] = useState<{ left: number; top: number } | null>(null);
  const dotHomeRef = useRef<{ left: number; top: number } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [dotAnimating, setDotAnimating] = useState(true);
  const [internalScrollEnabled, setInternalScrollEnabled] = useState(false);
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

  const { useFlyIn, enterX } = getHeroEntryTransition(pathname, prevPath);

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

  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px) and (pointer: fine)");
    const apply = () => setInternalScrollEnabled(media.matches);

    apply();
    media.addEventListener("change", apply);

    return () => {
      media.removeEventListener("change", apply);
    };
  }, []);

  useEffect(() => {
    if (!internalScrollEnabled) return;

    const html = document.documentElement;
    const body = document.body;

    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyOverscroll = body.style.overscrollBehaviorY;
    const prevBodyDraggableLock = body.dataset.draggableLock;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehaviorY = "none";
    body.dataset.draggableLock = "true";

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.overscrollBehaviorY = prevBodyOverscroll;
      if (prevBodyDraggableLock === undefined) {
        delete body.dataset.draggableLock;
      } else {
        body.dataset.draggableLock = prevBodyDraggableLock;
      }
    };
  }, [internalScrollEnabled]);

  return (
    <section
      className={
        internalScrollEnabled
          ? "relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden"
          : "relative z-0 flex min-h-0 flex-1 flex-col overflow-visible"
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

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col px-4">
        <div className="relative flex min-h-0 flex-1 flex-col justify-start">
          <div
            className={
              compactSpacing
                ? fill
                  ? "select-none pt-6 pb-5 sm:pt-10 sm:pb-7 [@media(max-height:900px)]:pt-8 [@media(max-height:900px)]:pb-6 [@media(max-height:820px)]:pt-6 [@media(max-height:820px)]:pb-4 [@media(max-height:640px)]:pt-4 [@media(max-height:640px)]:pb-3"
                  : "select-none pt-6 sm:pt-10 [@media(max-height:900px)]:pt-8 [@media(max-height:820px)]:pt-6 [@media(max-height:640px)]:pt-4"
                : fill
                  ? "select-none pt-14 pb-12 sm:pt-24 sm:pb-16 [@media(max-height:900px)]:pt-16 [@media(max-height:820px)]:pt-10 [@media(max-height:640px)]:pt-6 [@media(max-height:820px)]:pb-8 [@media(max-height:640px)]:pb-5"
                  : "select-none pt-14 sm:pt-24 [@media(max-height:900px)]:pt-16 [@media(max-height:820px)]:pt-10 [@media(max-height:640px)]:pt-6"
            }
          >
            {lines.map((line, idx) => (
              <TitleLine
                key={idx}
                line={line}
                idx={idx}
                compactTitle={compactTitle}
                reduceMotion={reduceMotion}
                setDirty={setDirty}
                resetSignal={resetSignal}
                setStaticGlyphRef={setStaticGlyphRef}
              />
            ))}
          </div>

          {children &&
            (internalScrollEnabled ? (
              <div className={compactSpacing
                ? "relative z-10 mt-5 h-0 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-4 [@media(max-height:820px)]:mt-4 [@media(max-height:820px)]:pb-3 [@media(max-height:640px)]:mt-2 [@media(max-height:640px)]:pb-2"
                : "relative z-10 mt-6 h-0 min-h-0 flex-1 overflow-y-auto overscroll-contain pb-6 [@media(max-height:820px)]:mt-4 [@media(max-height:820px)]:pb-4 [@media(max-height:640px)]:mt-3 [@media(max-height:640px)]:pb-3"}>
                {children}
              </div>
            ) : (
              <div className={compactSpacing
                ? "relative z-10 mt-5 pb-4 [@media(max-height:820px)]:mt-4 [@media(max-height:820px)]:pb-3 [@media(max-height:640px)]:mt-2 [@media(max-height:640px)]:pb-2"
                : "relative z-10 mt-6 pb-6 [@media(max-height:820px)]:mt-4 [@media(max-height:820px)]:pb-4 [@media(max-height:640px)]:mt-3 [@media(max-height:640px)]:pb-3"}>{children}</div>
            ))}

          {dirty && (
            <div className="absolute right-4 top-14 [@media(max-height:820px)]:top-12">
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
