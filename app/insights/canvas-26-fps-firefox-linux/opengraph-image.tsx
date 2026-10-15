import { renderInsightCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Why My Canvas Ran at 26 fps in Firefox on Linux — Steven Gonzalez";

export default function Image() {
  return renderInsightCard("canvas-26-fps-firefox-linux");
}
