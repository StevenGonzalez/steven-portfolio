import ProjectsWithPreview from "../../components/ProjectsWithPreview";
import { projects } from "../../data/projects";

export const metadata = {
  title: "Projects | Steven",
  description: "Case studies with problem, approach, architecture, tradeoffs, and outcomes.",
};

export default function ProjectsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Projects</h1>
      <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">
        A few case studies highlighting pragmatic engineering and clear architectures.
      </p>
      <ProjectsWithPreview projects={projects} />
    </div>
  );
}
