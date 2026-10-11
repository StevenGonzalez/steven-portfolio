import ProjectGrid from "../../components/ProjectGrid";
import { projects } from "../../lib/content";

export const metadata = {
  title: "Case studies | Steven Gonzalez",
  description: "The problem, what I built, the tradeoffs and how it turned out, for each project.",
};

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
        <ProjectGrid projects={projects} />
      </section>
    </div>
  );
}
