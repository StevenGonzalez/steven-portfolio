"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import type { ProjectDetail } from "../data/projects";
import ProjectRow from "./ProjectRow";

export default function ProjectsWithPreview({ projects }: { projects: ProjectDetail[] }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [mode, setMode] = useState<"hover" | "focus" | null>(null);

  const active = useMemo(() => {
    if (!activeSlug) return null;
    return projects.find((p) => p.slug === activeSlug) ?? null;
  }, [activeSlug, projects]);

  return (
    <div className="mt-6 md:grid md:grid-cols-[1fr_320px] md:gap-10">
      <div
        onMouseLeave={() => {
          if (mode === "hover") {
            setActiveSlug(null);
            setMode(null);
          }
        }}
        onBlurCapture={(e) => {
          if (mode !== "focus") return;
          const next = e.relatedTarget as Node | null;
          if (!next) {
            setActiveSlug(null);
            setMode(null);
            return;
          }
          if (!e.currentTarget.contains(next)) {
            setActiveSlug(null);
            setMode(null);
          }
        }}
      >
        {projects.map((p) => (
          <ProjectRow
            key={p.slug}
            project={p}
            active={p.slug === activeSlug}
            onHover={() => {
              setActiveSlug(p.slug);
              setMode("hover");
            }}
            onFocus={() => {
              setActiveSlug(p.slug);
              setMode("focus");
            }}
          />
        ))}
      </div>

      <aside className="mt-10 hidden md:block">
        <div className="sticky top-24">
          <AnimatePresence mode="wait" initial={false}>
            {active ? (
              <motion.div
                key={active.slug}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="rounded-2xl border border-zinc-200/60 bg-white/60 p-5 backdrop-blur dark:border-zinc-800/60 dark:bg-black/30"
              >
                <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Quick peek</div>
                <h2 className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">{active.title}</h2>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{active.summary}</p>

                <div className="mt-3 text-xs text-zinc-500 dark:text-zinc-400">{active.tags.join(" • ")}</div>

                <div className="mt-5 space-y-3">
                  <div>
                    <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Outcome</div>
                    <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{active.outcome}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Architecture</div>
                    <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{active.architecture}</div>
                  </div>
                </div>

                <div className="mt-5">
                  <Link href={`/projects/${active.slug}`} className="text-sm link-underline hover:text-accent">
                    Read case study
                  </Link>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </aside>
    </div>
  );
}
