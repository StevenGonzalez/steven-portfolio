import { renderInsightCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "When a Web App Runs a Machine — Steven Gonzalez";

export default function Image() {
  return renderInsightCard("reliable-desktop-software-web-first-world");
}
