import type { Metadata } from "next";
import { getInsightBySlug } from "./content";

export const SITE_NAME = "Steven Gonzalez";

/** Title, description, canonical address and link-preview tags for one page. The layout adds the site's name to the
 *  title. A page states its own openGraph and twitter tags, since one that set none would inherit the layout's, which
 *  describe the home page. The preview image comes from the page's opengraph-image file. */
export function pageMetadata({
  title,
  description,
  path,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type, siteName: SITE_NAME, title, description, url: path },
    twitter: { card: "summary_large_image", title, description },
  };
}

/** An article's metadata, from its entry in data/insights.ts. */
export function insightMetadata(slug: string) {
  const post = getInsightBySlug(slug);
  if (!post) throw new Error(`No insight metadata for ${slug}`);
  return pageMetadata({ title: post.title, description: post.summary, path: `/insights/${slug}`, type: "article" });
}
