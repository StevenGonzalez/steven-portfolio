import Link from "next/link";
import { ViewTransition } from "react";
import type { ProjectDetail } from "@/lib/content";
import ExternalLink from "./ExternalLink";

type TitleTag = "h2" | "h3";

/** The work, as cards. The first project leads across the full width and the rest pair up beneath it; if one would be
 *  left on its own at the end, it runs the full width too. Each card's title is a `titleAs` heading, one level below
 *  the heading the grid sits under, and opens the case study. A card and its title share view-transition names with
 *  the case study's painted scene and heading, so opening one grows the card into the page; data-vt carries the same
 *  names for the way back (see BackCrumb). */
export default function ProjectGrid({ projects, titleAs: Title }: { projects: ProjectDetail[]; titleAs: TitleTag }) {
  const [lead, ...rest] = projects;
  const last = rest.length % 2 ? rest.pop() : undefined;

  return (
    <div className="work">
      {lead ? <WideCard project={lead} titleAs={Title} /> : null}
      {rest.map((project) => (
        <ViewTransition key={project.slug} name={`proj-${project.slug}`}>
          <article className="proj" data-glow data-rv data-vt={`proj-${project.slug}`}>
            {project.role ? <p className="meta">{project.role}</p> : null}
            <CardTitle project={project} titleAs={Title} />
            <p>{project.card.blurb}</p>
            <Points points={project.card.points} />
            <p className="stack">{project.card.stack.join(" / ")}</p>
            <ProjectLinks project={project} />
          </article>
        </ViewTransition>
      ))}
      {last ? <WideCard project={last} titleAs={Title} /> : null}
    </div>
  );
}

function WideCard({ project, titleAs: Title }: { project: ProjectDetail; titleAs: TitleTag }) {
  return (
    <ViewTransition name={`proj-${project.slug}`}>
      <article className="proj lead-proj" data-glow data-rv data-vt={`proj-${project.slug}`}>
        <div className="side">
          {project.role ? <p className="meta">{project.role}</p> : null}
          <CardTitle project={project} titleAs={Title} />
          <p>{project.card.blurb}</p>
          <ProjectLinks project={project} />
        </div>
        <div className="side">
          <Points points={project.card.points} />
          <p className="stack">{project.card.stack.join(" / ")}</p>
        </div>
      </article>
    </ViewTransition>
  );
}

function CardTitle({ project, titleAs: Title }: { project: ProjectDetail; titleAs: TitleTag }) {
  return (
    <ViewTransition name={`proj-title-${project.slug}`}>
      <Title data-vt={`proj-title-${project.slug}`}>
        <Link href={`/projects/${project.slug}`}>{project.title}</Link>
      </Title>
    </ViewTransition>
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
      {/* Every card has one, so its name says which project it opens, for a screen reader's list of links. */}
      <Link href={`/projects/${project.slug}`} aria-label={`Case study: ${project.title}`}>
        Case study
      </Link>
      {project.links?.map((link) => (
        <ExternalLink key={link.href} href={link.href}>
          {link.label}
        </ExternalLink>
      ))}
    </div>
  );
}
