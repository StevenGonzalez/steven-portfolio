import type { Metadata } from "next";
import { getInsightBySlug } from "./content";

const SITE_NAME = "Steven Gonzalez";

/** Title, description and link-preview tags for one page. A page that sets no openGraph or twitter of its own inherits
 *  the layout's, which describe the home page, so every shared article or case study used to preview as the home page
 *  and point back to it. Each page states all of them through here instead. The preview image comes from the page's
 *  opengraph-image file. */
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
    title: `${title} | ${SITE_NAME}`,
    description,
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
