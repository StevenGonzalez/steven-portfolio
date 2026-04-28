"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ProjectDetail } from "../types/content";

type RowPreviewIntent = "featured" | "hovered" | "focused" | null;

export default function ProjectRow({
  project,
  active,
  previewIntent,
  onHover,
  onFocus,
}: {
  project: ProjectDetail;
  active?: boolean;
  previewIntent?: RowPreviewIntent;
  onHover?: () => void;
  onFocus?: () => void;
}) {
  const visibleTags = project.tags.slice(0, 3);

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.16 }}>
      <Link
        href={`/projects/${project.slug}`}
        className={[
          "group relative flex items-start justify-between gap-5 border-b border-zinc-200/60 px-6 py-5 transition-colors last:border-b-0 dark:border-zinc-800/60",
          active ? "bg-white/85 dark:bg-black/30" : "hover:bg-white/65 dark:hover:bg-black/20",
          "focus-accent",
        ].join(" ")}
        onMouseEnter={onHover}
        onFocus={onFocus}
      >
        <span
          aria-hidden
          className={[
            "absolute inset-y-4 left-2 w-[3px] rounded-full bg-accent transition-opacity duration-200",
            active ? "opacity-100" : "opacity-0 group-hover:opacity-55",
          ].join(" ")}
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="type-meta text-[11px] uppercase tracking-[0.18em] text-accent">
              {previewIntent === "featured" ? "Featured" : "Case study"}
            </span>
            {project.timeline ? (
              <div className="type-meta text-xs text-zinc-500 dark:text-zinc-400">{project.timeline}</div>
            ) : null}
            {project.role ? (
              <span className="type-meta text-xs text-zinc-400 dark:text-zinc-500">{project.role}</span>
            ) : null}
          </div>

          <div className="mt-2 flex flex-wrap items-start gap-x-3 gap-y-2">
            <h3 className="text-lg font-semibold text-zinc-900 transition-colors group-hover:text-accent dark:text-zinc-100">
              {project.title}
            </h3>
          </div>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-zinc-600 dark:text-zinc-400">{project.summary}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {visibleTags.map((tag) => (
              <span key={tag} className="meta-pill">
                {tag}
              </span>
            ))}
            {project.tags.length > visibleTags.length ? (
              <span className="type-meta self-center text-[11px] uppercase tracking-[0.16em] text-zinc-400 dark:text-zinc-500">
                +{project.tags.length - visibleTags.length} more
              </span>
            ) : null}
          </div>
        </div>

        <span
          aria-hidden
          className={[
            "mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm transition-all duration-200",
            active
              ? "border-accent/35 bg-accent/10 text-accent"
              : "border-zinc-200/70 text-zinc-400 group-hover:border-accent/35 group-hover:bg-accent/10 group-hover:text-accent dark:border-zinc-700/70",
          ].join(" ")}
        >
          →
        </span>
      </Link>
    </motion.div>
  );
}
