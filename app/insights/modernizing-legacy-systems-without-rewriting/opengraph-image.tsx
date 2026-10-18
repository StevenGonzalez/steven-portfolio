import { insightCardAlt, renderInsightCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

const slug = "modernizing-legacy-systems-without-rewriting";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = insightCardAlt(slug);

export default function Image() {
  return renderInsightCard(slug);
}
