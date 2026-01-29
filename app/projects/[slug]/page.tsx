import { notFound } from "next/navigation";
import Image from "next/image";
import { projects } from "../../../data/projects";

export function generateStaticParams() {
  return projects.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const project = projects.find((p) => p.slug === params.slug);
  if (!project) return {};
  return {
    title: `${project.title} | Steven`,
    description: project.summary,
  };
}

export default function ProjectDetail({ params }: { params: { slug: string } }) {
  const project = projects.find((p) => p.slug === params.slug);
  if (!project) return notFound();

  return (
    <article className="mx-auto max-w-4xl px-4 py-16">
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{project.title}</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">{project.summary}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {project.tags.map((t) => (
            <span key={t} className="rounded-full border border-zinc-200 px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-300">
              {t}
            </span>
          ))}
        </div>
      </header>
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

      <section className="mt-10 space-y-8">
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Problem</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">{project.problem}</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Approach</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">{project.approach}</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Architecture</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">{project.architecture}</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Tradeoffs</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">{project.tradeoffs}</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Outcome</h2>
          <p className="mt-2 text-zinc-700 dark:text-zinc-300">{project.outcome}</p>
        </div>
      </section>
    </article>
  );
}
