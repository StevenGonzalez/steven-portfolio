import Link from "next/link";
import { getPrimaryProjectLinks, type ProjectDetail } from "../lib/content";

/** The work, as cards. The first project leads across the full width and the rest pair up beneath it; if one would be
 *  left on its own at the end, it runs the full width too. */
export default function ProjectGrid({ projects }: { projects: ProjectDetail[] }) {
  const [lead, ...rest] = projects;
  const last = rest.length % 2 ? rest.pop() : undefined;

  return (
    <div className="work">
      {lead ? <WideCard project={lead} /> : null}
      {rest.map((project) => (
        <article key={project.slug} className="proj" data-glow data-rv>
          {project.role ? <p className="meta">{project.role}</p> : null}
          <h3>{project.title}</h3>
          <p>{project.card.blurb}</p>
          <Points points={project.card.points} />
          <p className="stack">{project.card.stack.join(" / ")}</p>
          <ProjectLinks project={project} />
        </article>
      ))}
      {last ? <WideCard project={last} /> : null}
    </div>
  );
}

function WideCard({ project }: { project: ProjectDetail }) {
  return (
    <article className="proj lead-proj" data-glow data-rv>
      <div className="side">
        {project.role ? <p className="meta">{project.role}</p> : null}
        <h3>{project.title}</h3>
        <p>{project.card.blurb}</p>
        <ProjectLinks project={project} />
      </div>
      <div className="side">
        <Points points={project.card.points} />
        <p className="stack">{project.card.stack.join(" / ")}</p>
      </div>
    </article>
  );
}

function Points({ points }: { points: string[] }) {
  return (
    <ul>
      {points.map((point) => (
        <li key={point}>{point}</li>
      ))}
    </ul>
  );
}

function ProjectLinks({ project }: { project: ProjectDetail }) {
  return (
    <div className="links">
      {getPrimaryProjectLinks(project).map((link) => (
        <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
          {link.label}
        </a>
      ))}
      {/* Every card has one, so its name says which project it opens, for a screen reader's list of links. */}
      <Link href={`/projects/${project.slug}`} aria-label={`Case study: ${project.title}`}>
        Case study
      </Link>
    </div>
  );
}
