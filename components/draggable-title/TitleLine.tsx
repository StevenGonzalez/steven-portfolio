import { DraggableToken } from "../DraggableToken";
import { getTokenDelay, tokenizeTitle, getEnterAnimation } from "./utils";

interface TitleLineProps {
  line: string;
  idx: number;
  reduceMotion: boolean | null;
  setDirty: (dirty: boolean) => void;
  resetSignal: number;
  setStaticGlyphRef: (node: HTMLSpanElement | null) => void;
}

export function TitleLine({
  line,
  idx,
  reduceMotion,
  setDirty,
  resetSignal,
  setStaticGlyphRef,
}: TitleLineProps) {
  const isTitle = idx === 0;
  const tokens = isTitle ? tokenizeTitle(line) : line.split(" ");
  const lineClasses = isTitle
    ? "font-display text-[clamp(2.75rem,7vw,4.5rem)] font-semibold tracking-tight leading-[1.02] text-zinc-900 dark:text-zinc-100"
    : idx === 1
    ? "font-display mt-5 text-[clamp(1.25rem,3.2vw,2rem)] font-medium leading-snug text-zinc-900 dark:text-zinc-100"
    : "mt-3 max-w-4xl text-[clamp(1rem,2.2vw,1.25rem)] leading-relaxed text-zinc-600 dark:text-zinc-400";

  return (
    <div className={lineClasses}>
      {tokens.map((t, i) => {
        if (isTitle && /^\s+$/.test(t)) {
          return (
            <span key={`${idx}-${i}-space`} className="inline-block whitespace-pre" aria-hidden="true">
              {t}
            </span>
          );
        }

        const revealIndex = isTitle 
          ? tokens.slice(0, i).filter(pt => !/^\s+$/.test(pt)).length
          : i; 

        const delay = getTokenDelay(idx, revealIndex);
        const enter = getEnterAnimation(delay, isTitle, reduceMotion);

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
                    <span ref={setStaticGlyphRef}>ı</span>
                  </span>
                  <span>{comma}</span>
                </span>
              </DraggableToken>
            );
          }

          if (isTitle && idx === 0 && (t === "Insights" || t === "Insights.")) {
            const suffix = t.replace("Insights", "");
            return (
              <DraggableToken
                key={`${idx}-${i}-insights`}
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
                  <span>Ins</span>
                  <span className="relative inline-block">
                    <span ref={setStaticGlyphRef}>ı</span>
                  </span>
                  <span>ghts{suffix}</span>
                </span>
              </DraggableToken>
            );
          }

          if (isTitle && idx === 0 && (t === "Projects" || t === "Projects.")) {
            const suffix = t.replace("Projects", "");
            return (
              <DraggableToken
                key={`${idx}-${i}-projects`}
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
                  <span>Pro</span>
                  <span className="relative inline-block">
                    <span ref={setStaticGlyphRef}>ȷ</span>
                  </span>
                  <span>ects{suffix}</span>
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
        })}
    </div>
  );
}
