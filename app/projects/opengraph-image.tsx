import { cardAlt, renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = cardAlt("Case studies");

export default function Image() {
  return renderOgCard({
    eyebrow: "Case studies",
    title: "Each project, in more detail",
    subtitle: "For each one: the problem, what I built, the tradeoffs, and how it turned out.",
  });
}
