import { renderOgCard, ROUTE_ACCENTS, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";
import { getAllProjectSlugs, getProjectBySlug } from "@/lib/content";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Project case study — Steven Gonzalez";

export function generateStaticParams() {
  return getAllProjectSlugs().map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    return renderOgCard({
      eyebrow: "Case study",
      title: "Projects",
      accent: ROUTE_ACCENTS.projects,
    });
  }

  return renderOgCard({
    eyebrow: "Case study",
    title: project.title,
    subtitle: project.summary,
    tags: project.tags,
    accent: ROUTE_ACCENTS.projects,
  });
}
