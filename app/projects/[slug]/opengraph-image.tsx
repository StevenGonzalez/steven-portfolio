import { cardAlt, renderOgCard, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { getAllProjectSlugs, getProjectBySlug } from "@/lib/content";

export function generateStaticParams() {
  return getAllProjectSlugs().map((slug) => ({ slug }));
}

// Generated rather than exported as constants, so that the alt text can name the project. A slug with no project has
// no card, just as it has no page.
export function generateImageMetadata({ params }: { params: { slug: string } }) {
  const project = getProjectBySlug(params.slug);
  return project ? [{ id: "card", alt: cardAlt(project.title), size: OG_SIZE, contentType: OG_CONTENT_TYPE }] : [];
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);
  if (!project) throw new Error(`No project for ${slug}`);

  return renderOgCard({
    eyebrow: "Case study",
    title: project.title,
    subtitle: project.summary,
    tags: project.tags,
  });
}
