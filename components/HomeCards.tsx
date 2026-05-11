"use client";

import Link from "next/link";
import type { ProjectDetail, InsightPost } from "../types/content";

function setGlow(e: React.MouseEvent<HTMLAnchorElement>) {
  const rect = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty("--glow-x", `${e.clientX - rect.left}px`);
  e.currentTarget.style.setProperty("--glow-y", `${e.clientY - rect.top}px`);
}

export default function HomeCards({
  project,
  insight,
}: {
  project: ProjectDetail;
  insight: InsightPost;
}) {
  return (
    <div className="mt-3 space-y-3">
      <div>
        <div className="type-meta text-[11px] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Latest Build</div>
        <Link
          href={`/projects/${project.slug}`}
          className="card-glow mt-1.5 block rounded-2xl border border-zinc-200/70 bg-white/60 px-4 py-3 transition hover:border-accent/35 hover:bg-white/85 dark:border-zinc-800/70 dark:bg-black/20 dark:hover:bg-black/30"
          onMouseMove={setGlow}
        >
          <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{project.title}</div>
          <p className="mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400 [@media(max-height:860px)]:hidden">{project.summary}</p>
          <div className="mt-2.5 flex flex-wrap gap-2 [@media(max-height:820px)]:hidden">
            {project.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="meta-pill">{tag}</span>
            ))}
          </div>
        </Link>
      </div>

      <div>
        <div className="type-meta text-[11px] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Latest Essay</div>
        <Link
          href={`/insights/${insight.slug}`}
          className="card-glow mt-1.5 block rounded-2xl border border-zinc-200/70 bg-white/60 px-4 py-3 transition hover:border-accent/35 hover:bg-white/85 dark:border-zinc-800/70 dark:bg-black/20 dark:hover:bg-black/30"
          onMouseMove={setGlow}
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="type-meta text-[11px] uppercase tracking-[0.18em] text-accent">{insight.category}</span>
            <span className="type-meta text-xs text-zinc-500 dark:text-zinc-400">{insight.readTime}</span>
          </div>
          <div className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">{insight.title}</div>
          <p className="mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400 [@media(max-height:860px)]:hidden">{insight.summary}</p>
        </Link>
      </div>
    </div>
  );
}
