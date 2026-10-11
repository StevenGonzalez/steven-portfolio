import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Steven Gonzalez — Senior Software Engineer";

export default function Image() {
  return renderOgCard({
    eyebrow: "Senior Software Engineer",
    title: "Steven Gonzalez",
    subtitle: "Web apps and the real-time systems behind them.",
  });
}
