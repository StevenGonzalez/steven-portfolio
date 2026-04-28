export const getTokenDelay = (lineIndex: number, tokenIndex: number) => {
  if (lineIndex === 0) return 0.12 + tokenIndex * 0.042;
  if (lineIndex === 1) return 0.78 + tokenIndex * 0.055;
  return 1.12 + tokenIndex * 0.03;
};

const SPECIAL_TOKEN_SEGMENTS: Record<string, { prefix: string; glyph: string; suffix: string }> = {
  "Hi": { prefix: "H", glyph: "ı", suffix: "" },
  "Insights": { prefix: "Ins", glyph: "ı", suffix: "ghts" },
  "Projects": { prefix: "Pro", glyph: "ȷ", suffix: "ects" },
  "Experience": { prefix: "Exper", glyph: "ı", suffix: "ence" },
  "Minigame": { prefix: "M", glyph: "ı", suffix: "nigame" },
};

export const tokenizeTitle = (line: string) => {
  return line.split(/(\s+)/g).filter((p) => p.length > 0);
};

export const getSpecialTokenParts = (token: string) => {
  const punctuationMatch = token.match(/[.,!?;:]+$/);
  const punctuation = punctuationMatch?.[0] ?? "";
  const baseToken = punctuation ? token.slice(0, -punctuation.length) : token;
  const special = SPECIAL_TOKEN_SEGMENTS[baseToken];

  if (!special) return null;

  return {
    prefix: special.prefix,
    glyph: special.glyph,
    suffix: `${special.suffix}${punctuation}`,
  };
};

export const getEnterAnimation = (delay: number, isTitle: boolean, reduceMotion: boolean | null) => {
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
