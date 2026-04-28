import { DraggableToken } from "./DraggableToken";
import { getTokenDelay, tokenizeTitle, getEnterAnimation, getSpecialTokenParts } from "./utils";

interface TitleLineProps {
  line: string;
  idx: number;
  compactTitle?: boolean;
  reduceMotion: boolean | null;
  setDirty: (dirty: boolean) => void;
  resetSignal: number;
  setStaticGlyphRef: (node: HTMLSpanElement | null) => void;
}

export function TitleLine({
  line,
  idx,
  compactTitle = false,
  reduceMotion,
  setDirty,
  resetSignal,
  setStaticGlyphRef,
}: TitleLineProps) {
  const isTitle = idx === 0;
  const tokens = isTitle ? tokenizeTitle(line) : line.split(" ");
  const lineClasses = isTitle
    ? compactTitle
      ? "font-display text-[clamp(2.2rem,5.5vw,3.4rem)] font-semibold tracking-tight leading-[1.02] text-zinc-900 dark:text-zinc-100 [@media(max-height:860px)]:text-[clamp(2rem,5vw,3rem)] [@media(max-height:740px)]:text-[clamp(1.8rem,4.6vw,2.6rem)]"
      : "font-display text-[clamp(2.75rem,7vw,4.5rem)] font-semibold tracking-tight leading-[1.02] text-zinc-900 dark:text-zinc-100 [@media(max-height:820px)]:text-[clamp(2.35rem,6vw,3.6rem)] [@media(max-height:640px)]:text-[clamp(2rem,5.4vw,3rem)]"
    : idx === 1
      ? compactTitle
        ? "font-display mt-3 text-[clamp(1.05rem,2.4vw,1.4rem)] font-medium leading-snug text-zinc-900 dark:text-zinc-100 [@media(max-height:820px)]:mt-2 [@media(max-height:820px)]:text-[clamp(0.95rem,2.1vw,1.2rem)] [@media(max-height:760px)]:hidden"
        : "font-display mt-5 text-[clamp(1.25rem,3.2vw,2rem)] font-medium leading-snug text-zinc-900 dark:text-zinc-100 [@media(max-height:820px)]:mt-3 [@media(max-height:820px)]:text-[clamp(1.1rem,2.6vw,1.55rem)] [@media(max-height:640px)]:mt-2 [@media(max-height:640px)]:text-[clamp(1rem,2.4vw,1.35rem)]"
      : "mt-3 max-w-4xl text-[clamp(1rem,2.2vw,1.25rem)] leading-relaxed text-zinc-600 dark:text-zinc-400 [@media(max-height:820px)]:mt-2 [@media(max-height:820px)]:text-[clamp(0.95rem,2vw,1.1rem)]";

  const renderToken = (
    key: string,
    content: React.ReactNode,
    enter: ReturnType<typeof getEnterAnimation>,
    token: string,
  ) => (
    <DraggableToken
      key={key}
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
        isTitle && token === " "
          ? {
              whiteSpace: "pre-wrap",
            }
          : undefined
      }
    >
      {content}
    </DraggableToken>
  );

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

        if (isTitle && idx === 0) {
          const specialParts = getSpecialTokenParts(t);
          if (specialParts) {
            return renderToken(
              `${idx}-${i}-special`,
              <span className="inline-flex items-baseline">
                <span>{specialParts.prefix}</span>
                <span className="relative inline-block">
                  <span ref={setStaticGlyphRef}>{specialParts.glyph}</span>
                </span>
                <span>{specialParts.suffix}</span>
              </span>,
              enter,
              t,
            );
          }
        }

        return renderToken(`${idx}-${i}-${t}`, t, enter, t);
      })}
    </div>
  );
}
