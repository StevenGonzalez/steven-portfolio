import Link from "next/link";
import type { ProjectDetail } from "@/lib/content";
import ExternalLink from "./ExternalLink";

type TitleTag = "h2" | "h3";

/** The work, as cards. The first project leads across the full width and the rest pair up beneath it; if one would be
 *  left on its own at the end, it runs the full width too. Each card's title is a `titleAs` heading, one level below
 *  the heading the grid sits under. */
export default function ProjectGrid({ projects, titleAs: Title }: { projects: ProjectDetail[]; titleAs: TitleTag }) {
  const [lead, ...rest] = projects;
  const last = rest.length % 2 ? rest.pop() : undefined;

  return (
    <div className="work">
      {lead ? <WideCard project={lead} titleAs={Title} /> : null}
      {rest.map((project) => (
        <article key={project.slug} className="proj" data-glow data-rv>
          {project.role ? <p className="meta">{project.role}</p> : null}
          <Title>{project.title}</Title>
          <p>{project.card.blurb}</p>
          <Points points={project.card.points} />
          <p className="stack">{project.card.stack.join(" / ")}</p>
          <ProjectLinks project={project} />
        </article>
      ))}
      {last ? <WideCard project={last} titleAs={Title} /> : null}
    </div>
  );
}

function WideCard({ project, titleAs: Title }: { project: ProjectDetail; titleAs: TitleTag }) {
  return (
    <article className="proj lead-proj" data-glow data-rv>
      <div className="side">
        {project.role ? <p className="meta">{project.role}</p> : null}
        <Title>{project.title}</Title>
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
      {project.links?.map((link) => (
        <ExternalLink key={link.href} href={link.href}>
          {link.label}
        </ExternalLink>
      ))}
      {/* Every card has one, so its name says which project it opens, for a screen reader's list of links. */}
      <Link href={`/projects/${project.slug}`} aria-label={`Case study: ${project.title}`}>
        Case study
      </Link>
    </div>
  );
}
