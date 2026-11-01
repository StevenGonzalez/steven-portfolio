import Link from "next/link";
import { displayDate, type InsightPost } from "@/lib/content";

export default function PostList({ posts }: { posts: InsightPost[] }) {
  return (
    <ul className="posts">
      {posts.map((post) => (
        <li key={post.slug} data-rv>
          <Link href={`/insights/${post.slug}`}>
            <span className="toc">
              <b>{post.title}</b>
              <span className="leader" aria-hidden="true" />
              <span className="mins">{post.readTime}</span>
            </span>
            <span className="sum">{post.summary}</span>
            <small>
              <time dateTime={post.date}>{displayDate(post.date)}</time> · {post.category}
            </small>
          </Link>
        </li>
      ))}
    </ul>
  );
}
