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

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/** An article's date, stored as "2026-04-21", as it reads on the page: "Apr 21, 2026". */
export function displayDate(date: string) {
  return dateFormat.format(new Date(date));
}

export { insights, projects };
export type { InsightPost, ProjectDetail };