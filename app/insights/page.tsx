import Link from "next/link";
import DraggableTitle from "../../components/draggable-title";
import { insights } from "../../data/insights";

export const metadata = {
  title: "Insights | Steven",
  description: "Short essays on engineering and building healthy code review habits.",
};

export default function InsightsPage() {
  return (
    <DraggableTitle
      lines={["Insights", "Essays on architecture, systems, and tradeoffs."]}
      fill={false}
    >
      <div className="mt-12 sm:mt-16">
        <div className="rounded-3xl border border-zinc-200/70 bg-white/70 dark:border-zinc-800/70 dark:bg-black/20 overflow-hidden">
          {insights.map((p) => (
            <Link
              key={p.slug}
              href={`/insights/${p.slug}`}
              className="group flex items-start justify-between border-b border-zinc-200/60 px-6 py-5 transition-all hover:bg-zinc-50 last:border-b-0 dark:border-zinc-800/60 dark:hover:bg-zinc-900/60"
            >
              <div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{p.title}</h3>
                  {p.date ? <div className="type-meta text-xs text-zinc-500 dark:text-zinc-400">{p.date}</div> : null}
                </div>
                <p className="mt-1 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">{p.summary}</p>
              </div>
              <span aria-hidden className="ml-4 mt-1 shrink-0 text-zinc-400 transition group-hover:text-accent">→</span>
            </Link>
          ))}
        </div>
      </div>
    </DraggableTitle>
  );
}
