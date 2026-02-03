"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import ProjectRow from "./ProjectRow";
import ProjectPreviewCard from "./ProjectPreviewCard";
import type { ProjectDetail } from "../data/projects";

export default function ProjectsWithPreview({ projects }: { projects: ProjectDetail[] }) {
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const [mode, setMode] = useState<"hover" | "focus" | null>(null);

  const active = useMemo(() => {
    if (!activeSlug) return null;
    return projects.find((p) => p.slug === activeSlug) ?? null;
  }, [activeSlug, projects]);

  return (
    <div
      className="mt-6 md:grid md:grid-cols-[1fr_320px] md:gap-10"
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
      <div>
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

      <aside className="hidden md:block">
        <div className="sticky top-24">
          <AnimatePresence mode="wait" initial={false}>
            {active ? (
              <ProjectPreviewCard active={active} />
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="rounded-2xl border border-zinc-200/60 bg-white/40 p-5 backdrop-blur dark:border-zinc-800/60 dark:bg-black/20"
              >
                <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Project snapshot</div>
                <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
                  Hover or focus a project to see quick links, highlights, and key decisions.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </aside>
    </div>
  );
}
