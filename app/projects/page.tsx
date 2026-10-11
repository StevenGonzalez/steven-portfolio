import ProjectGrid from "../../components/ProjectGrid";
import { projects } from "../../lib/content";

export const metadata = {
  title: "Case studies | Steven Gonzalez",
  description: "Real project work, real constraints, and the decisions that made the outcome better.",
};

export default function ProjectsPage() {
  return (
    <div className="page">
      <section className="sec" aria-labelledby="projects-h">
        <p className="label" data-rv>
          Case studies
        </p>
        <h1 id="projects-h" className="page-h" data-rv>
          What I built, why, and what I learned
        </h1>
        <p className="intro" data-rv>
          Client details are anonymized where needed. The rest is honest: what I built, what I was trying to solve, and
          what I took away from it.
        </p>
        <ProjectGrid projects={projects} />
      </section>
    </div>
  );
}
