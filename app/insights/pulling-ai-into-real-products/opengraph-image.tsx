import { renderInsightCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "How I Think About Pulling AI Into Real Products — Steven Gonzalez";

export default function Image() {
  return renderInsightCard("pulling-ai-into-real-products");
}
