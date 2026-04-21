import Link from "next/link";
import DraggableTitle from "../../components/draggable-title";
import { insights } from "../../data/insights";

export const metadata = {
  title: "Insights | Steven",
  description: "Essays on architecture, systems, delivery, and practical engineering tradeoffs.",
};

export default function InsightsPage() {
  return (
    <DraggableTitle
      lines={["Insights", "Essays on architecture, systems, and tradeoffs."]}
      fill={false}
    >
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <div className="insights-archive-list min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-3xl border border-zinc-200/70 bg-white/70 dark:border-zinc-800/70 dark:bg-black/20">
          {insights.map((p) => (
            <Link
              key={p.slug}
              href={`/insights/${p.slug}`}
              className="group flex items-start justify-between border-b border-zinc-200/60 px-6 py-5 transition-colors hover:bg-zinc-50 last:border-b-0 dark:border-zinc-800/60 dark:hover:bg-zinc-900/60"
            >
              <div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{p.title}</h3>
                  <div className="type-meta text-xs text-zinc-500 dark:text-zinc-400">{p.date}</div>
                </div>
                <p className="mt-1 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">{p.summary}</p>
                <div className="type-meta mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  {[p.category, p.readTime, ...p.tags].join(" / ")}
                </div>
              </div>
              <span aria-hidden className="ml-4 mt-1 shrink-0 text-zinc-400 transition group-hover:text-accent">-&gt;</span>
            </Link>
          ))}
        </div>
      </div>
    </DraggableTitle>
  );
}
