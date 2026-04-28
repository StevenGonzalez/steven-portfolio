import DraggableTitle from "../../components/draggable-title";
import ProjectsWithPreview from "../../components/ProjectsWithPreview";
import { projects } from "../../lib/content";

export const metadata = {
  title: "Projects | Steven",
  description: "Real project work, real constraints, and the decisions that made the outcome better.",
};

export default function ProjectsPage() {
  return (
    <DraggableTitle
      lines={[
        "Projects",
        "What I built, why I built it, and what I learned.",
      ]}
      fill={false}
      compactSpacing
    >
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
        <div className="surface-panel max-w-3xl rounded-2xl px-4 py-4 [@media(max-height:720px)]:hidden">
          <div className="type-meta text-xs text-accent">Quick Note</div>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            Client details are anonymized where needed. The rest is honest: what I built, what I was trying to solve, and what I took away from it.
          </p>
        </div>
        <div className="mt-6 min-h-0 flex-1 overflow-hidden sm:mt-8 [@media(max-height:820px)]:mt-4 [@media(max-height:640px)]:mt-3">
          <ProjectsWithPreview projects={projects} />
        </div>
      </div>
    </DraggableTitle>
  );
}
