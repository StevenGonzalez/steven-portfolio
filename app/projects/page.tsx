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
      <p className="mt-5 max-w-2xl border-l-2 border-zinc-300 pl-3 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-500">
        Some professional case studies are intentionally anonymized to respect confidentiality while still showing technical decisions, tradeoffs, and outcomes.
      </p>
      <div className="mt-8 sm:mt-12">
        <ProjectsWithPreview projects={projects} />
      </div>
    </DraggableTitle>
  );
}
