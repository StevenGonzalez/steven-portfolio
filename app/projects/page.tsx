import ProjectGrid from "@/components/ProjectGrid";
import { projects } from "@/lib/content";
import { pageMetadata } from "@/lib/meta";

export const metadata = pageMetadata({
  title: "Case studies",
  description: "The problem, what I built, the tradeoffs and how it turned out, for each project.",
  path: "/projects",
});

export default function ProjectsPage() {
  return (
    <div className="page">
      <section className="sec" aria-labelledby="projects-h">
        <p className="label" data-rv>
          Case studies
        </p>
        <h1 id="projects-h" className="page-h" data-rv>
          Each project, in more detail
        </h1>
        <p className="intro" data-rv>
          For each one: the problem, what I built, the tradeoffs, and how it turned out. Some client details are left
          out.
        </p>
        <ProjectGrid projects={projects} titleAs="h2" />
      </section>
    </div>
  );
}
