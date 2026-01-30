export type ProjectDetail = {
  slug: string;
  title: string;
  timeline?: string;
  summary: string;
  image: string;
  tags: string[];
  links?: { label: string; href: string }[];
  problem: string;
  approach: string;
  architecture: string;
  tradeoffs: string;
  outcome: string;
};

export const projects: ProjectDetail[] = [
  {
    slug: "virtual-trainer",
    title: "Virtual Trainer",
    timeline: "2019 to present",
    summary:
      "A cross-platform personal training app (iOS + Android) that generates routines and workouts, visualizes progress in a polished dashboard, and includes an in-app AI Trainer.",
    image: "/virtual-trainer.svg",
    tags: [
      "React Native",
      ".NET Core",
      "Azure",
      "SQL Server",
      "Cosmos DB",
      "LLM",
    ],
    links: [
      {
        label: "App Store",
        href: "https://apps.apple.com/us/app/virtual-trainer-ai-fitness/id6503172379",
      },
      {
        label: "Google Play",
        href: "https://play.google.com/store/apps/details?id=com.virtualfitness.virtualtrainer",
      },
      {
        label: "Website",
        href: "https://virtualtrainerapp.com/",
      },
      {
        label: "Privacy",
        href: "https://virtualtrainerapp.com/privacy-policy/",
      },
      {
        label: "Terms",
        href: "https://virtualtrainerapp.com/terms-of-use/",
      },
    ],
    problem:
      "My co-founder and I were frustrated by what was out there. Too many apps had questionable information or clunky UX that made consistency harder, not easier. We wanted a true personal trainer replacement: credible programming grounded in coaching knowledge, delivered through an experience that stays fast and clear during the workout.",
    approach:
      "Started with structure first: the domain model, the tables, and what we needed to persist to support history and analytics. Then I ramped up quickly on React Native and built the core loop end-to-end: generate routines and workouts, guide the session with a focused in-workout view, and review progress through a dashboard. I shipped a built-in exercise library to teach movement patterns, plus custom exercise creation for anything we did not have yet. On top, I added an AI Trainer (LLM) for coaching and fitness Q\u0026A in-context with user goals and training data. Automated workflows and progression keep the experience trainer-like without manual bookkeeping.",
    architecture:
      "React Native mobile clients talk to a .NET Core REST API. The API persists relational data in Microsoft SQL Server and uses Azure Cosmos DB where document-style storage fits better. Azure Service Bus coordinates asynchronous workflows, and Azure Functions trigger email workflows via an Email API. The AI Trainer experience is backed by an LLM and integrated as a first-class feature alongside workout generation, progression logic, history, and dashboard analytics.",
    tradeoffs:
      "Combining generated programming, an LLM coach, and automatic progression requires careful guardrails: you want users to feel momentum without unsafe jumps or confusing recommendations. Supporting both SQL Server and Cosmos DB adds operational complexity, so boundaries are explicit (what lives where, and why) and async workflows via Service Bus are used to keep the app responsive.",
    outcome:
      "Shipped on the App Store and Google Play with routine/workout generation, a built-in exercise library plus custom exercises, workout history, a polished dashboard, automatic progression and workflows, and an in-app AI Trainer. The result is a trainer-style experience that helps users stay consistent and see progress without spending their session managing spreadsheets.",
  },
];
