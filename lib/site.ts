export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

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