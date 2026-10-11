import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Projects — Steven Gonzalez";

export default function Image() {
  return renderOgCard({
    eyebrow: "Case studies",
    title: "What I built, and why",
    subtitle: "The problem, what I built, the tradeoffs and how it turned out, for each project.",
  });
}
