import type { InsightPost } from "@/types/content";

export const insights: InsightPost[] = [
  {
    slug: "moving-the-dashboard-onto-the-phone",
    title: "Moving Virtual Trainer's Dashboard onto the Phone",
    summary:
      "The dashboard cards and the achievement badges counted workouts with two copies of the same rules, one in C# and one in TypeScript. This is how I merged them.",
    date: "2026-10-26",
    category: "Mobile Engineering",
    readTime: "4 min read",
    tags: ["React Native", "React Query", "Consistency"],
  },
  {
    slug: "sound-with-no-audio-files",
    title: "Sound With No Audio Files",
    summary:
      "How the world at the top of this site makes its sound with the Web Audio API, from wind to whale song, without a single recording.",
    date: "2026-10-15",
    category: "Web Audio",
    readTime: "6 min read",
    tags: ["Web Audio", "Sound", "Testing"],
  },
  {
    slug: "canvas-26-fps-firefox-linux",
    title: "Why My Canvas Ran at 26 fps in Firefox on Linux",
    summary:
      "The world at the top of this site lagged in my own browser. The cause was pixel count, and the fix was a second step down in resolution.",
    date: "2026-10-15",
    category: "Web Graphics",
    readTime: "3 min read",
    tags: ["Canvas", "Firefox", "Performance"],
  },
  {
    slug: "how-the-sky-islands-work",
    title: "How the Sky Islands at the Top of This Site Work",
    summary:
      "A painted world in Canvas 2D with no images or libraries: layers, two web workers, and the rules that keep it fast and easy to play with.",
    date: "2026-10-11",
    category: "Web Graphics",
    readTime: "5 min read",
    tags: ["Canvas", "Web Workers", "Performance"],
  },
  {
    slug: "ci-cd-templates-that-work",
    title: "What Makes CI/CD Templates Actually Useful",
    summary:
      "What I learned moving our Azure DevOps pipelines to YAML and into one shared, versioned template repository.",
    date: "2026-04-21",
    category: "Developer Experience",
    readTime: "4 min read",
    tags: ["CI/CD", "DevEx", "Azure DevOps"],
  },
  {
    slug: "modernizing-legacy-systems-without-rewriting",
    title: "Modernizing Legacy Systems Without Rewriting Everything",
    summary:
      "How I moved a business-critical desktop app from .NET Framework 4.7.1 to .NET 8 in stages, without a rewrite and without changing how people used it.",
    date: "2026-03-12",
    category: "Architecture",
    readTime: "4 min read",
    tags: ["Modernization", ".NET", "Risk"],
  },
  {
    slug: "pulling-ai-into-real-products",
    title: "How I Think About Pulling AI Into Real Products",
    summary:
      "What I learned adding an AI trainer to Virtual Trainer: what the model does, what stays in plain code, and how I test it.",
    date: "2025-12-18",
    category: "Product Engineering",
    readTime: "4 min read",
    tags: ["AI", "Product", "Guardrails"],
  },
  {
    slug: "reliable-desktop-software-web-first-world",
    title: "When a Web App Runs a Machine",
    summary: "What changes when an Angular and C# app ships as desktop software that runs industrial saws.",
    date: "2025-11-20",
    category: "Systems",
    readTime: "4 min read",
    tags: ["Desktop", "Electron.NET", "Reliability"],
  },
  {
    slug: "production-saas-edge-cases",
    title: "What Production SaaS Teaches You About Edge Cases",
    summary:
      "How multi-tenancy, billing, scheduling, reporting and permissions turn simple-looking features into hard ones.",
    date: "2025-10-23",
    category: "SaaS Engineering",
    readTime: "4 min read",
    tags: ["SaaS", "Multi-tenancy", "Operations"],
  },
];
