export type ContentLink = {
  label: string;
  href: string;
};

export type ProjectDetail = {
  slug: string;
  title: string;
  timeline?: string;
  summary: string;
  image: string;
  tags: string[];
  links?: ContentLink[];
  role?: string;
  scope?: string;
  keyDecision?: string;
  highlights?: string[];
  problem: string;
  approach: string;
  architecture: string;
  tradeoffs: string;
  outcome: string;
};

export type InsightPost = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  category: string;
  readTime: string;
  tags: string[];
};