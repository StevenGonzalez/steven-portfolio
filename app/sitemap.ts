import type { MetadataRoute } from "next";
import { insights, projects } from "@/lib/content";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/projects",
    ...projects.map((project) => `/projects/${project.slug}`),
    "/insights",
    ...insights.map((insight) => `/insights/${insight.slug}`),
    "/resume",
  ];
  return paths.map((path) => ({ url: new URL(path, siteUrl).href }));
}
