import { renderOgCard, ROUTE_ACCENTS, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Insights — Steven Gonzalez";

export default function Image() {
  return renderOgCard({
    eyebrow: "Insights",
    title: "Things I learned the hard way",
    subtitle: "Notes on architecture and delivery from building software in the real world.",
    accent: ROUTE_ACCENTS.insights,
  });
}
