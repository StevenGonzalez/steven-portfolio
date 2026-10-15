import { renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Writing — Steven Gonzalez";

export default function Image() {
  return renderOgCard({
    eyebrow: "Writing",
    title: "Notes on building software",
    subtitle: "I write when I run into something that took longer to figure out than it should have.",
  });
}
