import { renderOgCard, ROUTE_ACCENTS, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Steven Gonzalez — Senior Software Engineer";

export default function Image() {
  return renderOgCard({
    eyebrow: "Senior Software Engineer",
    title: "Steven Gonzalez",
    subtitle: "Reliable systems, pragmatic architecture, and software other engineers can safely change.",
    accent: ROUTE_ACCENTS.home,
  });
}
