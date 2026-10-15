import { renderInsightCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Sound With No Audio Files — Steven Gonzalez";

export default function Image() {
  return renderInsightCard("sound-with-no-audio-files");
}
