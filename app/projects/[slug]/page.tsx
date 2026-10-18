import Image from "next/image";
import { notFound } from "next/navigation";
import BackCrumb from "../../../components/BackCrumb";
import NextUp from "../../../components/NextUp";
import ProjectScene from "../../../components/ProjectScene";
import SectionRail from "../../../components/SectionRail";
import { getAllProjectSlugs, getProjectBySlug, projects } from "../../../lib/content";
import { pageMetadata } from "../../../lib/meta";
import type { ProjectShot } from "../../../types/content";

const sectionDefinitions = [
  { id: "problem", title: "Problem", key: "problem" },
  { id: "approach", title: "Approach", key: "approach" },
  { id: "architecture", title: "Architecture", key: "architecture" },
  { id: "tradeoffs", title: "Tradeoffs", key: "tradeoffs" },
  { id: "outcome", title: "Outcome", key: "outcome" },
] as const;

export function generateStaticParams() {
  return getAllProjectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return {};
  return pageMetadata({ title: project.title, description: project.summary, path: `/projects/${slug}` });
}

export default async function ProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return notFound();

  const sections = sectionDefinitions.map((section) => ({
    ...section,
    body: project[section.key],
  }));
  const sectionItems = sections.map((section) => ({ id: section.id, label: section.title }));
  const next = projects[(projects.indexOf(project) + 1) % projects.length];

  return (
    <div className="page">
      <article className="sec">
        <BackCrumb href="/projects" label="Case studies" />
        <div className="doc">
          <div className="min-w-0">
            <header className="doc-head">
              <p className="label">Case study</p>
              <h1>{project.title}</h1>
              <p className="sub">{project.summary}</p>
              {project.timeline ? <p className="meta">{project.timeline}</p> : null}
              <ul className="pills">
                {project.tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
              {project.links?.length ? (
                <div className="links">
                  {project.links.map((link) => (
                    <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer">
                      {link.label}
                    </a>
                  ))}
                </div>
              ) : null}
            </header>

            <figure className="doc-figure">
              <ProjectScene slug={project.slug} label={project.scene} />
            </figure>

            <div className="prose doc-body">
              {sections.map((section) => (
                <section key={section.id} id={section.id}>
                  <h2>{section.title}</h2>
                  <p>{section.body}</p>
                  {section.id === "approach" && project.shots ? <Shots shots={project.shots} /> : null}
                </section>
              ))}
            </div>

            <NextUp
              label="Next case study"
              href={`/projects/${next.slug}`}
              title={next.title}
              summary={next.card.blurb}
            />
          </div>

          <aside className="rail">
            <SectionRail items={sectionItems} />
            {project.role ? (
              <div>
                <h2>Role</h2>
                <p>{project.role}</p>
              </div>
            ) : null}
            {project.scope ? (
              <div>
                <h2>Scope</h2>
                <p>{project.scope}</p>
              </div>
            ) : null}
            {project.keyDecision ? (
              <div>
                <h2>Key decision</h2>
                <p>{project.keyDecision}</p>
              </div>
            ) : null}
          </aside>
        </div>
      </article>
    </div>
  );
}

/** The app's own screens, three to a row. They are phone screenshots saved at 520 by 1009, already sized for the
 *  screen, so they skip the image optimizer. */
function Shots({ shots }: { shots: ProjectShot[] }) {
  return (
    <div className="shots">
      {shots.map((shot) => (
        <figure key={shot.src}>
          <Image src={shot.src} alt={shot.alt} width={520} height={1009} unoptimized />
          <figcaption>{shot.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}
