import Link from "next/link";
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
    <div className="page">
      <article className="sec">
        <Link className="crumb" href="/insights">
          ← Writing
        </Link>
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
