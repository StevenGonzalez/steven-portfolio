import { renderInsightCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "How the Sky Islands at the Top of This Site Work — Steven Gonzalez";

export default function Image() {
  return renderInsightCard("how-the-sky-islands-work");
}
