import SectionRail from "./SectionRail";
import GlowPanel from "./GlowPanel";

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
              <span key={tag} className="meta-pill">
                {tag}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_240px]">
        <div className="min-w-0">
          <GlowPanel className="surface-panel rounded-2xl px-6 py-8 sm:px-8">
            <div className="prose max-w-[68ch]">{children}</div>
          </GlowPanel>
        </div>

        {sections.length > 0 ? (
          <aside className="hidden lg:block">
            <div className="sticky top-24">
              <GlowPanel className="surface-panel rounded-2xl p-4">
                <SectionRail items={sections} />
              </GlowPanel>
            </div>
          </aside>
        ) : null}
      </div>
    </article>
  );
}
