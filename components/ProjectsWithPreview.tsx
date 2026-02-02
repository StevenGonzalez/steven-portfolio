"use client";

import Link from "next/link";
import Image from "next/image";
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

  const primaryLinks = useMemo(() => {
    if (!active?.links?.length) return [];
    return active.links
      .filter((l) => {
        const label = l.label.toLowerCase();
        return !label.includes("privacy") && !label.includes("terms");
      })
      .slice(0, 3);
  }, [active]);

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
              <motion.div
                key={active.slug}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                transition={{ duration: 0.16 }}
                className="rounded-2xl border border-zinc-200/60 bg-white/60 p-5 backdrop-blur dark:border-zinc-800/60 dark:bg-black/30"
              >
                <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Project snapshot</div>

                <div className="mt-3 flex items-start gap-3">
                  <div className="shrink-0">
                    <div className="overflow-hidden rounded-xl border border-zinc-200/70 bg-white dark:border-zinc-800/70 dark:bg-black/20">
                      <Image
                        src={active.image}
                        alt={active.title}
                        width={56}
                        height={56}
                        className="h-14 w-14 object-cover"
                      />
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{active.title}</h2>
                    {active.timeline ? (
                      <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{active.timeline}</div>
                    ) : null}
                    {active.role ? (
                      <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">{active.role}</div>
                    ) : null}
                    {active.scope ? (
                      <div className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{active.scope}</div>
                    ) : null}
                  </div>
                </div>

                {primaryLinks.length ? (
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                    {primaryLinks.map((l) => (
                      <Link
                        key={l.href}
                        href={l.href}
                        target="_blank"
                        rel="noreferrer"
                        className="link-underline hover:text-accent focus-accent"
                      >
                        {l.label}
                      </Link>
                    ))}
                  </div>
                ) : null}

                {active.keyDecision ? (
                  <div className="mt-5">
                    <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Key decision</div>
                    <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{active.keyDecision}</div>
                  </div>
                ) : null}

                {active.highlights?.length ? (
                  <div className="mt-5">
                    <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Highlights</div>
                    <ul className="mt-2 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {active.highlights.slice(0, 4).map((h) => (
                        <li key={h} className="flex gap-2">
                          <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                          <span className="min-w-0">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                <div className="mt-5 flex flex-wrap gap-2">
                  {active.tags.slice(0, 6).map((t) => (
                    <span
                      key={t}
                      className="rounded-full border border-zinc-200/70 px-2 py-1 text-[11px] text-zinc-700 dark:border-zinc-800/70 dark:text-zinc-300"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <div className="mt-5">
                  <Link href={`/projects/${active.slug}`} className="text-sm link-underline hover:text-accent">
                    Read case study
                  </Link>
                </div>
              </motion.div>
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
