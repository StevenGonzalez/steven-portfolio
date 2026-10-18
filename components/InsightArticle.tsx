import type { ReactNode } from "react";
import { displayDate, getInsightBySlug, insights } from "../lib/content";
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

/** An article's page. Everything but its contents comes from its entry in data/insights.ts. */
export default function InsightArticle({ slug, toc = [], children }: { slug: string; toc?: TocItem[]; children: ReactNode }) {
  const post = getInsightBySlug(slug);
  if (!post) throw new Error(`No insight metadata for ${slug}`);
  const { title, summary, date, category, readTime, tags } = post;
  const sections = tocToSections(toc);
  // The list runs newest first, so the next article is the one before it in time, and the oldest leads back round.
  const next = insights.length < 2 ? null : insights[(insights.indexOf(post) + 1) % insights.length];

  return (
    <div className="page">
      <article className="sec">
        <BackCrumb href="/insights" label="Writing" />
        <div className="doc">
          <div>
            <header className="doc-head">
              <p className="label">{category}</p>
              <h1>{title}</h1>
              <p className="sub">{summary}</p>
              <p className="meta">
                <time dateTime={date}>{displayDate(date)}</time> · {readTime}
              </p>
              <ul className="pills">
                {tags.map((tag) => (
                  <li key={tag}>{tag}</li>
                ))}
              </ul>
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
