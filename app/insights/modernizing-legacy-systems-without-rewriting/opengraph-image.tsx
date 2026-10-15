import { renderInsightCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Modernizing Legacy Systems Without Rewriting Everything — Steven Gonzalez";

export default function Image() {
  return renderInsightCard("modernizing-legacy-systems-without-rewriting");
}
