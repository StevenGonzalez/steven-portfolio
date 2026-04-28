import Link from "next/link";
import type { InsightPost } from "../types/content";

export default function InsightArchiveRow({ insight }: { insight: InsightPost }) {
  const visibleTags = insight.tags.slice(0, 2);

  return (
    <Link
      href={`/insights/${insight.slug}`}
      className="group relative flex items-start justify-between gap-5 border-b border-zinc-200/60 px-6 py-5 transition-colors last:border-b-0 hover:bg-white/65 focus-accent dark:border-zinc-800/60 dark:hover:bg-black/20"
    >
      <span
        aria-hidden
        className="absolute inset-y-4 left-2 w-[3px] rounded-full bg-accent opacity-0 transition-opacity duration-200 group-hover:opacity-55"
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="type-meta text-[11px] uppercase tracking-[0.18em] text-accent">
            {insight.category}
          </span>
          <span className="type-meta text-xs text-zinc-500 dark:text-zinc-400">{insight.date}</span>
          <span className="type-meta text-xs text-zinc-400 dark:text-zinc-500">{insight.readTime}</span>
        </div>

        <h3 className="mt-2 text-lg font-semibold text-zinc-900 transition-colors group-hover:text-accent dark:text-zinc-100">
          {insight.title}
        </h3>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">{insight.summary}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {visibleTags.map((tag) => (
            <span key={tag} className="meta-pill">
              {tag}
            </span>
          ))}
          {insight.tags.length > visibleTags.length ? (
            <span className="type-meta self-center text-[11px] uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
              +{insight.tags.length - visibleTags.length} more
            </span>
          ) : null}
        </div>
      </div>

      <span
        aria-hidden
        className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200/70 text-sm text-zinc-400 transition-all duration-200 group-hover:border-accent/35 group-hover:bg-accent/10 group-hover:text-accent dark:border-zinc-700/70"
      >
        →
      </span>
    </Link>
  );
}