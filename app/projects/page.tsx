import DraggableTitle from "../../components/draggable-title";
import ProjectsWithPreview from "../../components/ProjectsWithPreview";
import { projects } from "../../data/projects";

export const metadata = {
  title: "Projects | Steven",
  description: "Case studies with problem, approach, architecture, tradeoffs, and outcomes.",
};

export default function ProjectsPage() {
  return (
    <DraggableTitle
      lines={[
        "Projects",
        "Case studies in pragmatic engineering and architecture.",
      ]}
      fill={false}
    >
      <div className="mt-6 max-w-2xl rounded-xl border border-zinc-200/70 bg-white/40 px-4 py-3 backdrop-blur-sm dark:border-zinc-800/70 dark:bg-black/20">
        <p className="type-meta text-[11px] uppercase tracking-[0.08em] text-zinc-500 dark:text-zinc-400">
          Confidentiality note
        </p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          Some professional case studies are intentionally anonymized to respect confidentiality while still showing technical decisions, tradeoffs, and outcomes.
        </p>
      </div>
      <div className="mt-8 sm:mt-12">
        <ProjectsWithPreview projects={projects} />
      </div>
    </DraggableTitle>
  );
}
