"use client";

import { AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import ProjectRow from "./ProjectRow";
import ProjectPreviewCard from "./ProjectPreviewCard";
import type { ProjectDetail } from "../types/content";

type PreviewIntent = "featured" | "hovered" | "focused";

export default function ProjectsWithPreview({ projects }: { projects: ProjectDetail[] }) {
  const featuredSlug = projects[0]?.slug ?? null;
  const [hoveredSlug, setHoveredSlug] = useState<string | null>(null);
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);

  const activeSlug = hoveredSlug ?? focusedSlug ?? featuredSlug;
  const previewIntent: PreviewIntent = hoveredSlug
    ? "hovered"
    : focusedSlug
      ? "focused"
      : "featured";

  const active = useMemo(() => {
    if (!activeSlug) return null;
    return projects.find((p) => p.slug === activeSlug) ?? null;
  }, [activeSlug, projects]);

  const previewEyebrow =
    previewIntent === "featured"
      ? "Featured case study"
      : previewIntent === "focused"
        ? "Focused project"
        : "Project snapshot";

  return (
    <div
      className="flex h-full min-h-0 flex-col overflow-hidden md:grid md:grid-cols-[minmax(0,1fr)_320px] md:grid-rows-[minmax(0,1fr)] md:items-stretch md:gap-6"
      onMouseLeave={() => {
        setHoveredSlug(null);
      }}
      onBlurCapture={(e) => {
        const next = e.relatedTarget as Node | null;
        if (!next || !e.currentTarget.contains(next)) {
          setFocusedSlug(null);
        }
      }}
    >
      <div className="projects-index-panel surface-panel h-full min-h-0 overflow-y-auto overscroll-contain rounded-3xl">
        {projects.map((p) => (
          <ProjectRow
            key={p.slug}
            project={p}
            active={p.slug === activeSlug}
            previewIntent={
              p.slug === hoveredSlug ? "hovered" : p.slug === focusedSlug ? "focused" : p.slug === featuredSlug && previewIntent === "featured" ? "featured" : null
            }
            onHover={() => {
              setHoveredSlug(p.slug);
            }}
            onFocus={() => {
              setFocusedSlug(p.slug);
              setHoveredSlug(null);
            }}
          />
        ))}
      </div>

      <aside className="hidden min-h-0 md:block md:h-full">
        <div className="projects-index-panel h-full min-h-0 overflow-y-auto overscroll-contain">
          <AnimatePresence mode="wait" initial={false}>
            {active ? <ProjectPreviewCard active={active} eyebrow={previewEyebrow} /> : null}
          </AnimatePresence>
        </div>
      </aside>
    </div>
  );
}
