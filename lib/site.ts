export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

/** The address the résumé prints, which has to be the live site's wherever the page was built. */
export const productionUrl = "https://stevengonzalez.dev";

export const externalProfiles = {
  gitHub: { href: "https://github.com/StevenGonzalez", label: "GitHub" },
  linkedIn: { href: "https://www.linkedin.com/in/sgonzalez-dev/", label: "LinkedIn" },
} as const;

/** The code for the world at the top of the home page. */
export const worldSourceUrl = `${externalProfiles.gitHub.href}/steven-portfolio/tree/main/lib/world`;
