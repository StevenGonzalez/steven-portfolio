import { insights } from "../data/insights";
import { projects } from "../data/projects";
import type { ContentLink, InsightPost, ProjectDetail } from "../types/content";

const NON_PRIMARY_LINK_LABELS = ["privacy", "terms"];

export function isPrimaryProjectLink(link: ContentLink) {
  const label = link.label.toLowerCase();
  return !NON_PRIMARY_LINK_LABELS.some((keyword) => label.includes(keyword));
}

export function getPrimaryProjectLinks(project: ProjectDetail) {
  return (project.links ?? []).filter(isPrimaryProjectLink);
}

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug) ?? null;
}

export function getAllProjectSlugs() {
  return projects.map((project) => project.slug);
}

export function getInsightBySlug(slug: string) {
  return insights.find((insight) => insight.slug === slug) ?? null;
}

export function getAllInsightSlugs() {
  return insights.map((insight) => insight.slug);
}

export { insights, projects };
export type { InsightPost, ProjectDetail };