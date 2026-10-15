import { renderInsightCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "What Makes CI/CD Templates Actually Useful — Steven Gonzalez";

export default function Image() {
  return renderInsightCard("ci-cd-templates-that-work");
}
