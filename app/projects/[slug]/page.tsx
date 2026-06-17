import { notFound } from "next/navigation";
import Image from "next/image";
import SectionRail from "../../../components/SectionRail";
import GlowPanel from "../../../components/GlowPanel";
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
    title: `${project.title} | Steven`,
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
    <article className="mx-auto max-w-6xl px-4 py-16">
      <header className="mb-8">
        <div className="type-meta text-xs text-accent">Case study</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{project.title}</h1>
        {project.timeline ? (
          <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{project.timeline}</div>
        ) : null}
        <p className="mt-3 max-w-4xl text-zinc-600 dark:text-zinc-400">{project.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {project.tags.map((t) => (
            <span key={t} className="meta-pill">
              {t}
            </span>
          ))}
        </div>

        {primaryLinks.length ? (
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {primaryLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="link-underline hover:text-accent focus-accent"
              >
                {l.label}
              </a>
            ))}
          </div>
        ) : null}
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_260px]">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
            <Image
              src={project.image}
              alt={project.title}
              width={1280}
              height={720}
              className="h-auto w-full object-cover"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1024px"
            />
          </div>

          <GlowPanel className="surface-panel mt-10 rounded-2xl px-6 py-8 sm:px-8">
            <div className="prose max-w-[68ch]">
              {sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <h2>{section.title}</h2>
                  <p>{section.body}</p>
                </section>
              ))}
            </div>
          </GlowPanel>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <GlowPanel className="surface-panel rounded-2xl p-5">
            <div className="type-meta text-xs text-zinc-500 dark:text-zinc-400">
              Project snapshot
            </div>

            <div className="mt-5 border-b border-zinc-200 pb-5 dark:border-zinc-800">
              <SectionRail items={sectionItems} />
            </div>

            {project.role ? (
              <div className="mt-5">
                <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Role</div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{project.role}</p>
              </div>
            ) : null}

            {project.scope ? (
              <div className="mt-5">
                <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Scope</div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{project.scope}</p>
              </div>
            ) : null}

            {project.keyDecision ? (
              <div className="mt-5">
                <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Key decision</div>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{project.keyDecision}</p>
              </div>
            ) : null}

            {project.highlights?.length ? (
              <div className="mt-5">
                <div className="text-xs font-medium text-zinc-900 dark:text-zinc-100">Highlights</div>
                <ul className="mt-2 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
                  {project.highlights.slice(0, 4).map((highlight) => (
                    <li key={highlight} className="flex gap-2">
                      <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <span>{highlight}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {primaryLinks?.length ? (
              <div className="mt-5 border-t border-zinc-200 pt-4 dark:border-zinc-800">
                <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
                  {primaryLinks.slice(0, 3).map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      target="_blank"
                      rel="noreferrer"
                      className="link-underline hover:text-accent focus-accent"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
            </GlowPanel>
          </div>
        </aside>
      </div>
    </article>
  );
}
