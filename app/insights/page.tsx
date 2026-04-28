import DraggableTitle from "../../components/draggable-title";
import InsightArchiveRow from "../../components/InsightArchiveRow";
import { insights } from "../../lib/content";

export const metadata = {
  title: "Insights | Steven",
  description: "Notes on architecture and delivery from building software in the real world.",
};

export default function InsightsPage() {
  return (
    <DraggableTitle
      lines={["Insights", "Things I learned the hard way and chose to share."]}
      fill={false}
      compactSpacing
    >
      <div className="flex h-full min-h-0 flex-1 flex-col">
        <div className="surface-panel max-w-3xl rounded-2xl px-4 py-4 [@media(max-height:720px)]:hidden">
          <div className="type-meta text-xs text-accent">Why This Exists</div>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            I write when I run into something that took longer to figure out than it should have. Maybe it saves someone else the time.
          </p>
        </div>

        <div className="mt-6 min-h-0 flex-1 sm:mt-8 [@media(max-height:820px)]:mt-4 [@media(max-height:640px)]:mt-3">
          <div className="insights-archive-list surface-panel min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-3xl">
            {insights.map((insight) => (
              <InsightArchiveRow key={insight.slug} insight={insight} />
            ))}
          </div>
        </div>
      </div>
    </DraggableTitle>
  );
}
