import { notFound } from "next/navigation";
import BackCrumb from "../../../components/BackCrumb";
import ProjectScene from "../../../components/ProjectScene";
import SectionRail from "../../../components/SectionRail";
import { getAllProjectSlugs, getPrimaryProjectLinks, getProjectBySlug } from "../../../lib/content";

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
  return {
    title: `${project.title} | Steven Gonzalez`,
    description: project.summary,
  };
}

export default async function ProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) return notFound();

  const primaryLinks = getPrimaryProjectLinks(project);
  const sections = sectionDefinitions.map((section) => ({
    ...section,
    body: project[section.key],
  }));
  const sectionItems = sections.map((section) => ({ id: section.id, label: section.title }));

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
              {primaryLinks.length ? (
                <div className="links">
                  {primaryLinks.map((link) => (
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
                </section>
              ))}
            </div>
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
