import Link from "next/link";
import { thoughts } from "@/data/thoughts";

export const metadata = {
  title: "Thoughts | Steven",
  description: "Short essays on engineering and building healthy code review habits.",
};

export default function ThoughtsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-20 sm:pt-32 pb-16">
      <h1 className="font-display text-[clamp(2.5rem,6vw,4.5rem)] font-semibold tracking-tight leading-[1.02] text-zinc-900 dark:text-zinc-100">
        Thoughts
      </h1>
      <p className="mt-4 max-w-2xl text-[clamp(1rem,2vw,1.25rem)] leading-relaxed text-zinc-600 dark:text-zinc-400">
        Short engineering essays in MDX.
      </p>
      <div className="mt-12 sm:mt-16">
        {thoughts.map((p) => (
          <Link
            key={p.slug}
            href={`/thoughts/${p.slug}`}
            className="group block -mx-4 rounded-2xl border-b border-zinc-200/60 px-4 py-4 transition-all hover:bg-zinc-50 hover:-translate-y-0.5 last:border-b-0 dark:border-zinc-800/60 dark:hover:bg-zinc-900"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{p.title}</h3>
                  {p.date ? <div className="type-meta text-xs text-zinc-500 dark:text-zinc-400">{p.date}</div> : null}
                </div>
                <p className="mt-1 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">{p.summary}</p>
              </div>
              <span aria-hidden className="ml-4 text-zinc-400 group-hover:text-accent">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
