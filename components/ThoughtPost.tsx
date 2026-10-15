import { insights } from "../lib/content";
import BackCrumb from "./BackCrumb";
import NextUp from "./NextUp";
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
  slug,
  title,
  description,
  date,
  category = "Insight",
  readTime,
  tags = [],
  toc = [],
  children,
}: {
  slug: string;
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
  // The list runs newest first, so the next article is the one before it in time, and the oldest leads back round.
  const at = insights.findIndex((post) => post.slug === slug);
  const next = at < 0 || insights.length < 2 ? null : insights[(at + 1) % insights.length];

  return (
    <div className="page">
      <article className="sec">
        <BackCrumb href="/insights" label="Writing" />
        <div className="doc">
          <div className="min-w-0">
            <header className="doc-head">
              <p className="label">{category}</p>
              <h1>{title}</h1>
              {description ? <p className="sub">{description}</p> : null}
              <p className="meta">{[date, readTime].filter(Boolean).join(" · ")}</p>
              {tags.length > 0 ? (
                <ul className="pills">
                  {tags.map((tag) => (
                    <li key={tag}>{tag}</li>
                  ))}
                </ul>
              ) : null}
            </header>
            <div className="prose doc-body">
              {children}
            </div>
            {next ? (
              <NextUp label="Next article" href={`/insights/${next.slug}`} title={next.title} summary={next.summary} />
            ) : null}
          </div>
          {sections.length > 0 ? (
            <aside className="rail">
              <SectionRail items={sections} />
            </aside>
          ) : null}
        </div>
      </article>
    </div>
  );
}
