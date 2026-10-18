import Link from "next/link";
import { displayDate, type InsightPost } from "../lib/content";

export default function PostList({ posts }: { posts: InsightPost[] }) {
  return (
    <ul className="posts">
      {posts.map((post) => (
        <li key={post.slug} data-rv>
          <Link href={`/insights/${post.slug}`}>
            <time dateTime={post.date}>{displayDate(post.date)}</time>
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
