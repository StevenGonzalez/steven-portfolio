import PostList from "@/components/PostList";
import { insights } from "@/lib/content";
import { pageMetadata } from "@/lib/meta";

export const metadata = pageMetadata({
  title: "Writing",
  description:
    "I write when I run into something that took longer to figure out than it should have. Maybe it saves someone else the time.",
  path: "/insights",
});

export default function InsightsPage() {
  return (
    <div className="page">
      <section className="sec" aria-labelledby="insights-h">
        <p className="label" data-rv>
          Writing
        </p>
        <h1 id="insights-h" className="page-h" data-rv>
          Notes on building software
        </h1>
        <p className="intro" data-rv>
          I write when I run into something that took longer to figure out than it should have. Maybe it saves someone
          else the time.
        </p>
        <PostList posts={insights} />
      </section>
    </div>
  );
}
