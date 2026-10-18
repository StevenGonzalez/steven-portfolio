import { insights } from "../data/insights";
import { projects } from "../data/projects";
import type { InsightPost, ProjectDetail } from "../types/content";

export function getProjectBySlug(slug: string) {
  return projects.find((project) => project.slug === slug) ?? null;
}

export function getAllProjectSlugs() {
  return projects.map((project) => project.slug);
}

export function getInsightBySlug(slug: string) {
  return insights.find((insight) => insight.slug === slug) ?? null;
}

export { insights, projects };
export type { InsightPost, ProjectDetail };