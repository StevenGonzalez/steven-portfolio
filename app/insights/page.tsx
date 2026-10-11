import PostList from "../../components/PostList";
import { insights } from "../../lib/content";

export const metadata = {
  title: "Writing | Steven Gonzalez",
  description: "Notes on architecture and delivery from building software in the real world.",
};

export default function InsightsPage() {
  return (
    <div className="page">
      <section className="sec archive" aria-labelledby="insights-h">
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
