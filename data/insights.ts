export type InsightPost = {
  slug: string;
  title: string;
  summary: string;
  date: string;
};

export const insights: InsightPost[] = [
  {
    slug: "pull-request-playbook",
    title: "The Pull Request Playbook",
    summary: "A practical guide to writing clear, right-sized pull requests that get reviewed well.",
    date: "Jan 29, 2026",
  },
];
