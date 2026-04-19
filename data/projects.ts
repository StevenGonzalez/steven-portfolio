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
      "Co-founded and engineered a cross-platform fitness product spanning React Native clients, a .NET API, Azure infrastructure, and an in-app AI trainer grounded in user context.",
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
    scope: "Product strategy, iOS + Android, .NET API, Azure",
    keyDecision:
      "Used SQL Server for structured workout data, Cosmos DB for flexible document models, and Service Bus for async workflows",
    highlights: [
      "Shipped on App Store + Google Play",
      "Configurable dashboard with O(1) widget placement and per-user caching",
      "Context-aware AI trainer grounded in user data",
      "Automated routine generation and workout progression",
      "Event-driven supporting services with Azure Service Bus",
    ],
    problem:
      "My co-founder and I wanted to build the kind of product we could not find in the market: something that felt like a credible personal trainer instead of a generic workout tracker. Most alternatives either had questionable programming, clumsy workout flows, or weak progress visibility. The product needed to feel fast during training, trustworthy in its recommendations, and capable of supporting long-term consistency.",
    approach:
      "I led the product and engineering implementation across the mobile experience and backend platform. On the client side, I built a polished React Native experience around a strong training-domain model: routines, workouts, exercises, timers, warmups, supersets, and history. I also built a configurable dashboard with O(1) widget placement and per-user caching so personalized reporting stayed instant. For the guided workout experience, I implemented automatic progression logic modeled on real coaching heuristics. I later extended the product with an in-app AI trainer that could answer questions using the user's own training context instead of generic fitness advice.",
    architecture:
      "The mobile apps are built in React Native and communicate with a C# .NET API designed around responsiveness and clear domain boundaries. I set up the Azure infrastructure, using SQL Server for relational workout and account data, Cosmos DB for document-oriented use cases, and Service Bus to decouple asynchronous processing such as supporting services and notifications. The frontend architecture balances local UI state with shared global state and server-state synchronization so the app stays responsive even across more complex workout flows.",
    tradeoffs:
      "The product sits at the intersection of training logic, personalization, and AI assistance, which means a lot of power can quickly become complexity. Automatic progression and generated programming needed guardrails so the app could feel adaptive without making unsafe jumps or muddy recommendations. Supporting both SQL Server and Cosmos DB also adds operational cost, so I kept the storage boundaries explicit and used asynchronous workflows where they improved responsiveness without hiding important user feedback.",
    outcome:
      "Virtual Trainer shipped to the App Store and Google Play with routine and workout generation, guided training flows, progress reporting, custom exercise support, automatic progression, and an in-app AI trainer. More importantly, it proved out a full product stack I designed and operated end to end: mobile clients, backend services, cloud infrastructure, asynchronous workflows, and the product judgment required to make those systems feel cohesive to the user.",
  },
  {
    slug: "winforms-modernization",
    title: "WinForms Modernization",
    summary:
      "Led the migration of a legacy WinForms application from .NET Framework 4.6 to .NET 8, navigating incompatible UI dependencies and obsolete encryption without disrupting critical business workflows.",
    image: "/winforms-modernization.svg",
    tags: ["C#", ".NET 8", "WinForms", "Migration", "Security", "Desktop"],
    role: "Lead engineer",
    scope: "Legacy desktop modernization",
    keyDecision:
      "Treated the work as a staged modernization effort rather than a simple runtime upgrade",
    highlights: [
      "Audited high-risk dependencies before touching the runtime",
      "Replaced or isolated unsupported WinForms controls",
      "Modernized obsolete encryption paths to current APIs",
      "Preserved business-critical workflows through staged validation",
    ],
    problem:
      "The application was still important to the business, but it was running on .NET Framework 4.6 with aging third-party WinForms controls, older library assumptions, and encryption code that had become obsolete. The risk was not just technical debt. Staying in place increased maintenance friction, narrowed future options, and left security-sensitive areas on a stack that was becoming harder to justify.",
    approach:
      "I started by treating the migration as a discovery and risk-management exercise, not a blind version jump. I audited dependencies, identified which controls and libraries were likely to break first, and separated direct upgrades from areas that would need replacement or redesign. From there, I worked through control compatibility issues, updated obsolete encryption flows, and resolved the runtime and API-level breaking changes that surfaced as the application moved toward .NET 8.",
    architecture:
      "Because the application was a mature WinForms codebase, the architecture work was mostly about reducing fragility. I preserved core workflow behavior while modernizing the runtime, dependency graph, and security-sensitive code paths. Where older controls could not move forward cleanly, I isolated or replaced them so the surrounding application could continue to evolve on supported foundations instead of staying blocked by legacy UI dependencies.",
    tradeoffs:
      "A rewrite would have created unnecessary delivery risk for a system users already depended on, but a shallow upgrade would not have addressed the real issues. The balance was to modernize aggressively where the stack was actively unsafe or unsupported, while keeping enough continuity that the application's existing behavior remained trustworthy. That required careful decisions about what to preserve, what to replace, and where to accept temporary complexity in order to get onto a healthier long-term platform.",
    outcome:
      "The result was a legacy desktop application moved onto .NET 8 with a stronger security posture, fewer unsupported dependencies, and a much better foundation for future maintenance. More than a successful migration, it turned a brittle legacy codebase into something the team could keep extending instead of merely working around.",
  },
  {
    slug: "azure-devops-pipeline-templates",
    title: "Azure DevOps Pipeline Templates",
    summary:
      "Standardized Azure DevOps delivery workflows by converting classic pipelines to YAML and building a versioned shared template repository that multiple teams could adopt safely.",
    image: "/azure-devops-templates.svg",
    tags: ["Azure DevOps", "YAML", "CI/CD", "DevEx", "Templates", "Automation"],
    role: "Lead engineer",
    scope: "Pipeline platform and developer workflow",
    keyDecision:
      "Published reusable pipeline templates behind semantically versioned tags so teams could opt into upgrades without being broken by template changes",
    highlights: [
      "Migrated classic Azure DevOps pipelines to YAML",
      "Built a shared template repository for cross-team reuse",
      "Used semantic versioning and tags for safe adoption",
      "Reduced setup time for more complex delivery workflows",
    ],
    problem:
      "Our Azure DevOps setup had grown unevenly over time. Many pipelines were still defined through classic UI flows, which made them harder to review, harder to standardize, and harder to reuse across teams. More complex delivery tasks were often rebuilt from scratch, which slowed down onboarding and made pipeline behavior drift over time.",
    approach:
      "I converted a set of classic pipelines into YAML so they could live in source control and be treated like the rest of the codebase. But the real leverage came from going beyond one-off migrations. I built a dedicated pipeline templates repository that other teams could reference directly, giving them a clean starting point for common delivery workflows while still supporting more advanced scenarios. That let me centralize repeated patterns, remove duplication, and make improvements once instead of re-solving the same CI/CD problems in multiple places.",
    architecture:
      "The shared repository was structured around reusable YAML templates that teams could import into their own pipelines. I versioned those templates with semantic versioning and published tags that downstream pipelines referenced explicitly. That created a stable contract between template authors and consuming teams: new improvements could ship continuously, while breaking changes could be introduced in new versions without unexpectedly disrupting existing builds. The result was a lightweight internal platform for CI/CD standardization rather than a collection of disconnected pipeline files.",
    tradeoffs:
      "Centralizing pipeline logic improves consistency, but it also creates a dependency that teams need to trust. The versioned-tag approach was how I balanced those concerns. Teams could adopt the shared templates without giving up control over when they upgraded, and I could continue evolving the templates without causing surprise regressions. The main tradeoff was maintaining discipline around versioning and compatibility, but that was far less costly than leaving every team to manage fragile pipeline logic on its own.",
    outcome:
      "The pipeline work brought more unity to how delivery workflows were defined, reduced the time required to stand up more complicated pipelines, and made common tasks easier to maintain across teams. More importantly, it shifted pipelines from ad hoc configuration toward a reusable engineering asset: versioned, reviewable, and safe to evolve over time.",
  },
];
