import Link from "next/link";
import { getPrimaryProjectLinks, type ProjectDetail } from "../lib/content";

/** The work, as cards. The first project leads across the full width; the rest pair up beneath it. */
export default function ProjectGrid({ projects }: { projects: ProjectDetail[] }) {
  const [lead, ...rest] = projects;

  return (
    <div className="work">
      {lead ? (
        <article className="proj lead-proj" data-glow data-rv>
          <div className="side">
            {lead.role ? <p className="meta">{lead.role}</p> : null}
            <h3>{lead.title}</h3>
            <p>{lead.card.blurb}</p>
            <ProjectLinks project={lead} />
          </div>
          <div className="side">
            <Points points={lead.card.points} />
            <p className="stack">{lead.card.stack.join(" / ")}</p>
          </div>
        </article>
      ) : null}
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
    </div>
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
      <Link href={`/projects/${project.slug}`}>Case study</Link>
    </div>
  );
}
