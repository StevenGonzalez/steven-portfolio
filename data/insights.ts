export type InsightPost = {
  slug: string;
  title: string;
  summary: string;
  date: string;
  category: string;
  readTime: string;
  tags: string[];
};

export const insights: InsightPost[] = [
  {
    slug: "ci-cd-templates-that-work",
    title: "What Makes CI/CD Templates Actually Useful",
    summary: "How reusable pipeline templates become safer, more maintainable delivery infrastructure instead of another source of build mystery.",
    date: "Apr 21, 2026",
    category: "Developer Experience",
    readTime: "6 min read",
    tags: ["CI/CD", "DevEx", "Azure DevOps"],
  },
  {
    slug: "modernizing-legacy-systems-without-rewriting",
    title: "Modernizing Legacy Systems Without Rewriting Everything",
    summary: "A practical approach to upgrading business-critical software by managing risk, preserving behavior, and improving the foundation in stages.",
    date: "Mar 12, 2026",
    category: "Architecture",
    readTime: "7 min read",
    tags: ["Modernization", ".NET", "Risk"],
  },
  {
    slug: "pull-request-playbook",
    title: "The Pull Request Playbook",
    summary: "A practical guide to writing clear, right-sized pull requests that get reviewed well.",
    date: "Jan 29, 2026",
    category: "Engineering Practice",
    readTime: "8 min read",
    tags: ["Code Review", "Teamwork", "Quality"],
  },
  {
    slug: "designing-software-around-tradeoffs-not-hype",
    title: "Designing Software Around Tradeoffs, Not Hype",
    summary: "A practical look at choosing technology by constraints, risks, and long-term ownership instead of novelty.",
    date: "Jan 15, 2026",
    category: "Engineering Judgment",
    readTime: "7 min read",
    tags: ["Architecture", "Tradeoffs", "Decision Making"],
  },
  {
    slug: "pulling-ai-into-real-products",
    title: "How I Think About Pulling AI Into Real Products",
    summary: "Where AI adds leverage, where deterministic software still matters, and how to build trust into product experiences.",
    date: "Dec 18, 2025",
    category: "Product Engineering",
    readTime: "8 min read",
    tags: ["AI", "Product", "Guardrails"],
  },
  {
    slug: "reliable-desktop-software-web-first-world",
    title: "Building Reliable Desktop Software in a Web-First World",
    summary: "What changes when web technologies have to support local workflows, packaged releases, and real operational environments.",
    date: "Nov 20, 2025",
    category: "Systems",
    readTime: "8 min read",
    tags: ["Desktop", "Electron.NET", "Reliability"],
  },
  {
    slug: "production-saas-edge-cases",
    title: "What Production SaaS Teaches You About Edge Cases",
    summary: "How multi-tenancy, billing, scheduling, reporting, and permissions turn simple features into real systems problems.",
    date: "Oct 23, 2025",
    category: "SaaS Engineering",
    readTime: "7 min read",
    tags: ["SaaS", "Multi-tenancy", "Operations"],
  },
  {
    slug: "hidden-cost-of-one-more-feature",
    title: "The Hidden Cost of Just One More Feature",
    summary: "Why feature work compounds, how complexity shows up later, and what engineers can do to protect product velocity.",
    date: "Sep 18, 2025",
    category: "Product Engineering",
    readTime: "7 min read",
    tags: ["Complexity", "Product", "Maintainability"],
  },
  {
    slug: "code-other-engineers-can-safely-change",
    title: "Code That Other Engineers Can Safely Change",
    summary: "A practical guide to building codebases that reduce fear through clear boundaries, names, tests, and reviewable changes.",
    date: "Aug 14, 2025",
    category: "Engineering Practice",
    readTime: "7 min read",
    tags: ["Maintainability", "Testing", "Code Quality"],
  },
  {
    slug: "from-feature-work-to-system-ownership",
    title: "From Feature Work to System Ownership",
    summary: "How engineering impact changes when you start thinking about delivery, risk, architecture, support, and product outcomes together.",
    date: "Jul 17, 2025",
    category: "Engineering Growth",
    readTime: "7 min read",
    tags: ["Ownership", "Leadership", "Systems"],
  },
  {
    slug: "when-to-use-async-workflows",
    title: "When to Use Async Workflows",
    summary: "A grounded look at queues, retries, idempotency, observability, and the tradeoffs behind asynchronous system design.",
    date: "Jun 19, 2025",
    category: "Architecture",
    readTime: "8 min read",
    tags: ["Messaging", "Queues", "Reliability"],
  },
  {
    slug: "fast-code-vs-fast-software",
    title: "The Difference Between Fast Code and Fast Software",
    summary: "Why performance is bigger than algorithms, and how perceived speed depends on data access, UI flow, caching, and feedback.",
    date: "May 22, 2025",
    category: "Performance",
    readTime: "7 min read",
    tags: ["Performance", "UX", "Caching"],
  },
  {
    slug: "estimation-is-risk-discovery",
    title: "Why Estimation Is Really Risk Discovery",
    summary: "A healthier way to estimate software work by surfacing unknowns, dependencies, validation paths, and delivery risk.",
    date: "Apr 24, 2025",
    category: "Delivery",
    readTime: "6 min read",
    tags: ["Estimation", "Planning", "Risk"],
  },
];
