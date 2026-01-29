"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { ProjectDetail } from "../data/projects";

export default function ProjectRow({
  project,
  active,
  onHover,
  onFocus,
}: {
  project: ProjectDetail;
  active?: boolean;
  onHover?: () => void;
  onFocus?: () => void;
}) {
  return (
    <motion.div whileHover={{ y: -1 }}>
      <Link
        href={`/projects/${project.slug}`}
        className={
          "group block border-b border-zinc-200/60 py-4 transition hover:bg-zinc-50 dark:border-zinc-800/60 dark:hover:bg-zinc-900" +
          (active ? " bg-zinc-50 dark:bg-zinc-900" : "")
        }
        onMouseEnter={onHover}
        onFocus={onFocus}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{project.title}</h3>
            <p className="mt-1 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">{project.summary}</p>
            <div className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{project.tags.join(" • ")}</div>
          </div>
          <span aria-hidden className="ml-4 text-zinc-400 group-hover:text-accent">→</span>
        </div>
      </Link>
    </motion.div>
  );
}
