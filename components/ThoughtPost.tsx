import Link from "next/link";

export default function ThoughtPost({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
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

      <header className="mt-8">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h1>
        {description ? <p className="mt-3 text-zinc-600 dark:text-zinc-400">{description}</p> : null}
      </header>

      <div className="prose mt-10">{children}</div>
    </article>
  );
}
