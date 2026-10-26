import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import BackCrumb from "@/components/BackCrumb";
import ExternalLink from "@/components/ExternalLink";
import NextUp from "@/components/NextUp";
import ProjectScene from "@/components/ProjectScene";
import SectionRail from "@/components/SectionRail";
import { getAllProjectSlugs, getInsightBySlug, getProjectBySlug, projects } from "@/lib/content";
import { pageMetadata } from "@/lib/meta";
import type { ProjectShot } from "@/types/content";

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
  const reading = (project.reading ?? []).map((readingSlug) => {
    const post = getInsightBySlug(readingSlug);
    if (!post) throw new Error(`Project ${project.slug} lists an article that doesn't exist: ${readingSlug}.`);
    return post;
  });
  const sectionItems = [
    ...sections.map((section) => ({ id: section.id, label: section.title })),
    ...(reading.length ? [{ id: "reading", label: "Further reading" }] : []),
  ];
  const facts = [
    { term: "Role", detail: project.role },
    { term: "Scope", detail: project.scope },
    { term: "Key decision", detail: project.keyDecision },
  ].filter((fact) => fact.detail);
  const next = projects[(projects.indexOf(project) + 1) % projects.length];

  return (
    <div className="page">
      <article className="sec">
        <BackCrumb href="/projects" label="Case studies" />
        <div className="doc">
          <div>
            <header className="doc-head">
              <p className="label">Case study</p>
              {/* Named like the project's card and its title, so opening a card grows it into this page, and the back link
                  shrinks it again (data-vt, see BackCrumb). */}
              <ViewTransition name={`proj-title-${project.slug}`}>
                <h1 data-vt={`proj-title-${project.slug}`}>{project.title}</h1>
              </ViewTransition>
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
                    <ExternalLink key={link.href} href={link.href}>
                      {link.label}
                    </ExternalLink>
                  ))}
                </div>
              ) : null}
            </header>

            <ViewTransition name={`proj-${project.slug}`}>
              <figure className="doc-figure" data-vt={`proj-${project.slug}`}>
                <ProjectScene slug={project.slug} label={project.scene} />
              </figure>
            </ViewTransition>

            <div className="prose doc-body">
              {sections.map((section) => (
                <section key={section.id} id={section.id}>
                  <h2>{section.title}</h2>
                  <p>{section.body}</p>
                  {section.id === "approach" && project.shots ? <Shots shots={project.shots} /> : null}
                </section>
              ))}
              {reading.length ? (
                <section id="reading">
                  <h2>Further reading</h2>
                  <ul>
                    {reading.map((post) => (
                      <li key={post.slug}>
                        <Link href={`/insights/${post.slug}`}>{post.title}</Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
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
            {/* Facts about the project rather than sections of it, so they stay out of the page's headings. */}
            {facts.length ? (
              <dl>
                {facts.map((fact) => (
                  <div key={fact.term}>
                    <dt>{fact.term}</dt>
                    <dd>{fact.detail}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </aside>
        </div>
      </article>
    </div>
  );
}

/** The app's own screens, three to a row. They are phone screenshots already sized for the screen, so they skip the
 *  image optimizer. */
function Shots({ shots }: { shots: ProjectShot[] }) {
  return (
    <div className="shots">
      {shots.map((shot) => (
        <figure key={shot.src}>
          <Image src={shot.src} alt={shot.alt} width={shot.width} height={shot.height} unoptimized />
          <figcaption>{shot.caption}</figcaption>
        </figure>
      ))}
    </div>
  );
}
