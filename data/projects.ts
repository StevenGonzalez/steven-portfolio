export type ProjectDetail = {
  slug: string;
  title: string;
  timeline?: string;
  summary: string;
  image: string;
  tags: string[];
  links?: { label: string; href: string }[];
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
    role: "Co-founder • Lead engineer",
    scope: "iOS + Android + .NET API",
    keyDecision:
      "SQL for relational + Cosmos for documents; Service Bus for async workflows",
    highlights: [
      "Shipped on App Store + Google Play",
      "O(1) Dashboard Widgets + Per-User Caching",
      "Context-Aware AI Trainer (LLM) built with custom context",
      "Automated Routine Generation + Automatic Progression",
      "Event-Driven Architecture with Azure Service Bus",
    ],
    problem:
      "My co-founder and I were frustrated by what was out there. Too many apps had questionable information or clunky UX that made consistency harder, not easier. We wanted a true personal trainer replacement: credible programming grounded in coaching knowledge, delivered through an experience that stays fast and clear during the workout.",
    approach:
      "I engineered a high-performance interactive dashboard allowing users to add reporting widgets, backed by an O(1) algorithm and per-user caching for instant load times. The core domain is structured around Routines (collections of Workouts) and Workouts (sets of Exercises), supporting advanced tracking features like rest timers, warmups, and supersets. I built the frontend using React Native, leveraging Zustand for global state, Tanstack Query for data synchronization, and Axios, to create a highly polished, responsive UI. For the 'Guided Workout' flow, I implemented automatic weight progression and a hand-held experience based on real personal trainer logic. Additionally, I integrated a floating AI Trainer—an LLM capable of answering fitness questions with context about the user's specific data.",
    architecture:
      "The mobile app is built with React Native and connects to a C# .NET Core API. The API utilizes in-memory caching to maximize performance. I architected a distributed system where a dedicated Email Service is decoupled from the main API, communicating triggers via Azure Service Bus. I setup the entire Azure infrastructure, including SQL Server for relational data and Cosmos DB for document storage. The frontend architecture prioritizes UX, using efficient local state (useState) alongside global state to maintain responsiveness.",
    tradeoffs:
      "Combining generated programming, an LLM coach, and automatic progression requires careful guardrails: you want users to feel momentum without unsafe jumps or confusing recommendations. Supporting both SQL Server and Cosmos DB adds operational complexity, so boundaries are explicit (what lives where, and why) and async workflows via Service Bus are used to keep the app responsive.",
    outcome:
      "Shipped on the App Store and Google Play with routine/workout generation, a built-in exercise library plus custom exercises, workout history viewable by date range, a polished dashboard, automatic progression, and an in-app AI Trainer. The result is a trainer-style experience that helps users stay consistent and see progress, backed by a robust and scalable architecture.",
  },
];
