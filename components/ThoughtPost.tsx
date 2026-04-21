import SectionRail from "./SectionRail";

type TocItem = {
  title: string;
  href: string;
};

function tocToSections(toc: TocItem[]) {
  return toc.map((item) => ({
    id: item.href.replace(/^#/, ""),
    label: item.title,
  }));
}

export default function ThoughtPost({
  title,
  description,
  date,
  category = "Insight",
  readTime,
  tags = [],
  toc = [],
  children,
}: {
  title: string;
  description?: string;
  date?: string;
  category?: string;
  readTime?: string;
  tags?: string[];
  toc?: TocItem[];
  children: React.ReactNode;
}) {
  const sections = tocToSections(toc);

  return (
    <article className="mx-auto max-w-6xl px-4 py-16">
      <header className="mb-8">
        <div className="type-meta text-xs text-accent">{category}</div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">{title}</h1>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-sm text-zinc-500 dark:text-zinc-400">
          {date ? <span>{date}</span> : null}
          {readTime ? <span>{readTime}</span> : null}
        </div>
        {description ? <p className="mt-2 max-w-3xl text-zinc-600 dark:text-zinc-400">{description}</p> : null}
        {tags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="type-meta rounded-full border border-zinc-200 px-2 py-1 text-xs text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
              >
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_240px]">
        <div className="min-w-0">
          <div className="rounded-2xl border border-zinc-200/70 bg-white/70 px-6 py-8 dark:border-zinc-800/70 dark:bg-black/20 sm:px-8">
            <div className="prose max-w-[68ch]">{children}</div>
          </div>
        </div>

        {sections.length > 0 ? (
          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
              <SectionRail items={sections} />
            </div>
          </aside>
        ) : null}
      </div>
    </article>
  );
}
