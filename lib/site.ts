export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const primaryNavLinks = [
  {
    href: "/projects",
    label: "Projects",
    description: "Case studies in product, platform, and systems engineering.",
  },
  {
    href: "/insights",
    label: "Insights",
    description: "Writing on software architecture, delivery, and practical tradeoffs.",
  },
  {
    href: "/arcade",
    label: "Minigame",
    description: "A deliberately playful proof that quality and personality can coexist.",
  },
] as const;

export const externalProfiles = [
  {
    href: "https://github.com/StevenGonzalez",
    label: "GitHub",
  },
  {
    href: "https://www.linkedin.com/in/sgonzalez-dev/",
    label: "LinkedIn",
  },
] as const;