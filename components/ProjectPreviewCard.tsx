"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { getPrimaryProjectLinks } from "../lib/content";
import type { ProjectDetail } from "../types/content";

interface ProjectPreviewCardProps {
  active: ProjectDetail;
  eyebrow?: string;
}

export default function ProjectPreviewCard({ active, eyebrow = "Project snapshot" }: ProjectPreviewCardProps) {
  const primaryLinks = getPrimaryProjectLinks(active).slice(0, 3);

  return (
    <motion.div
      key={active.slug}
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.16 }}
      className="surface-panel flex h-full flex-col overflow-y-auto rounded-3xl p-5"
    >
      <div className="type-meta text-xs uppercase tracking-[0.18em] text-accent">
        {eyebrow}
      </div>

      <div className="mt-3.5 flex items-start gap-3.5">
        <div className="shrink-0">
          <div className="overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-sm dark:border-zinc-800/70 dark:bg-black/20">
            <Image
              src={active.image}
              alt={active.title}
              width={72}
              height={72}
              className="h-[4.5rem] w-[4.5rem] object-cover"
            />
          </div>
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
            {active.title}
          </h2>
          {active.timeline ? (
            <div className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
              {active.timeline}
            </div>
          ) : null}
          {active.role ? (
            <div className="mt-2 text-sm text-zinc-700 dark:text-zinc-300">
              {active.role}
            </div>
          ) : null}
          {active.scope ? (
            <div className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
              {active.scope}
            </div>
          ) : null}
        </div>
      </div>

      <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">{active.summary}</p>

      {primaryLinks.length > 0 && (
        <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-2 text-sm">
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
      )}

      {active.keyDecision ? (
        <div className="mt-4">
          <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
            Key decision
          </div>
          <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {active.keyDecision}
          </div>
        </div>
      ) : null}

      {active.highlights?.length ? (
        <div className="mt-4">
          <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">
            Highlights
          </div>
          <ul className="mt-2 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
            {active.highlights.slice(0, 4).map((h) => (
              <li key={h} className="flex gap-2">
                <span aria-hidden className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent/70" />
                <span className="min-w-0">{h}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {active.tags.slice(0, 6).map((t) => (
          <span key={t} className="meta-pill">
            {t}
          </span>
        ))}
      </div>

      <div className="mt-auto pt-4">
        <Link
          href={`/projects/${active.slug}`}
          className="text-sm link-underline hover:text-accent focus-accent"
        >
          Read case study
        </Link>
      </div>
    </motion.div>
  );
}
