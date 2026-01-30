import Link from "next/link";

export default function ThoughtPost({
  title,
  description,
  date,
  children,
}: {
  title: string;
  description?: string;
  date?: string;
  children: React.ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16">
      <div className="text-sm">
        <Link href="/thoughts" className="inline-flex items-center gap-2 link-underline hover:text-accent focus-accent">
          <span aria-hidden>←</span>
          Thoughts
        </Link>
      </div>

      <header className="mt-10">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h1>
          {date ? <div className="text-sm text-zinc-500 dark:text-zinc-400">{date}</div> : null}
        </div>
        {description ? <p className="mt-3 text-zinc-600 dark:text-zinc-400">{description}</p> : null}
      </header>

      <div className="mt-10">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs font-medium tracking-wide text-zinc-500 dark:text-zinc-400">Article</div>
          <div className="h-px flex-1 bg-zinc-200/60 dark:bg-zinc-800/60" />
        </div>
        <div className="rounded-2xl border border-zinc-200/70 bg-white/80 p-6 shadow-[0_1px_0_0_rgba(0,0,0,0.03)] backdrop-blur dark:border-zinc-800/70 dark:bg-black/40 sm:p-8">
          <div className="prose">{children}</div>
        </div>
      </div>
    </article>
  );
}
