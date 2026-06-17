import { renderOgCard, ROUTE_ACCENTS, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Projects — Steven Gonzalez";

export default function Image() {
  return renderOgCard({
    eyebrow: "Projects",
    title: "What I built, and why",
    subtitle: "Real project work, real constraints, and the decisions that made the outcome better.",
    accent: ROUTE_ACCENTS.projects,
  });
}
