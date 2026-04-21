import { notFound } from "next/navigation";
import Image from "next/image";
import { projects } from "../../../data/projects";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) return {};
  return {
    title: `${project.title} | Steven`,
    description: project.summary,
  };
}

export default async function ProjectDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = projects.find((p) => p.slug === slug);
  if (!project) return notFound();

  const primaryLinks = project.links?.filter((link) => {
    const label = link.label.toLowerCase();
    return !label.includes("privacy") && !label.includes("terms");
  });

  return (
    <article className="mx-auto max-w-6xl px-4 py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{project.title}</h1>
        {project.timeline ? (
          <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{project.timeline}</div>
        ) : null}
        <p className="mt-2 max-w-4xl text-zinc-600 dark:text-zinc-400">{project.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {project.tags.map((t) => (
            <span key={t} className="type-meta rounded-full border border-zinc-200 px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
              {t}
            </span>
          ))}
        </div>

        {project.links?.length ? (
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {project.links.map((l) => (
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

          <section className="mt-10 space-y-10">
            <section id="problem" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Problem</h2>
              <p className="mt-2 text-zinc-700 dark:text-zinc-300">{project.problem}</p>
            </section>
            <section id="approach" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Approach</h2>
              <p className="mt-2 text-zinc-700 dark:text-zinc-300">{project.approach}</p>
            </section>
            <section id="architecture" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Architecture</h2>
              <p className="mt-2 text-zinc-700 dark:text-zinc-300">{project.architecture}</p>
            </section>
            <section id="tradeoffs" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Tradeoffs</h2>
              <p className="mt-2 text-zinc-700 dark:text-zinc-300">{project.tradeoffs}</p>
            </section>
            <section id="outcome" className="scroll-mt-24">
              <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Outcome</h2>
              <p className="mt-2 text-zinc-700 dark:text-zinc-300">{project.outcome}</p>
            </section>
          </section>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
            <div className="type-meta text-xs text-zinc-500 dark:text-zinc-400">
              Project snapshot
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
          </div>
        </aside>
      </div>
    </article>
  );
}
