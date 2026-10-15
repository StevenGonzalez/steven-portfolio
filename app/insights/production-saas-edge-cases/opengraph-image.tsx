import { renderInsightCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "What Production SaaS Teaches You About Edge Cases — Steven Gonzalez";

export default function Image() {
  return renderInsightCard("production-saas-edge-cases");
}
