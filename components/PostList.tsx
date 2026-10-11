import Link from "next/link";
import type { InsightPost } from "../lib/content";

/** "Apr 21, 2026" as the machine-readable date a <time> carries. */
function isoDate(date: string) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function PostList({ posts }: { posts: InsightPost[] }) {
  return (
    <ul className="posts">
      {posts.map((post) => (
        <li key={post.slug} data-rv>
          <Link href={`/insights/${post.slug}`}>
            <time dateTime={isoDate(post.date)}>{post.date}</time>
            <div>
              <b>{post.title}</b>
              <span>{post.summary}</span>
              <small>
                {post.category} · {post.readTime}
              </small>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
