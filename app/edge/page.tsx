import Edge from "@/components/Edge";
import { pageMetadata } from "@/lib/meta";

export const metadata = pageMetadata({
  title: "The edge of the world",
  description:
    "Where the cloud sea runs off the edge of the sky islands, with a galaxy far below. Let a lantern go and it becomes a star.",
  path: "/edge",
});

export default function EdgePage() {
  return <Edge />;
}
