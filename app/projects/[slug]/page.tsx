import { notFound } from "next/navigation";
import Image from "next/image";
import { projects } from "../../../data/projects";
import SectionRail from "../../../components/SectionRail";

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

  const sections = [
    { id: "problem", label: "Problem" },
    { id: "approach", label: "Approach" },
    { id: "architecture", label: "Architecture" },
    { id: "tradeoffs", label: "Tradeoffs" },
    { id: "outcome", label: "Outcome" },
  ];

  return (
    <article className="mx-auto max-w-6xl px-4 py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{project.title}</h1>
        {project.timeline ? (
          <div className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{project.timeline}</div>
        ) : null}
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{project.summary}</p>
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

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_240px]">
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
          <div className="sticky top-24 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <SectionRail items={sections} />
          </div>
        </aside>
      </div>
    </article>
  );
}
