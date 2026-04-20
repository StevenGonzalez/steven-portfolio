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
      "Co-founded and built a cross-platform fitness product with React Native clients, a .NET API, Azure infrastructure, and an in-app AI trainer grounded in each user's training context.",
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
      "My co-founder and I wanted to build the kind of product we could not find in the market: something that behaved like a credible personal trainer instead of a generic workout tracker. Most alternatives had weak programming quality, clumsy workout flows, or poor progress visibility. The product needed to feel fast during training, trustworthy in its recommendations, and usable over long training cycles.",
    approach:
      "I led product and engineering implementation across the mobile experience and backend platform. On the client side, I built the React Native experience around a training-domain model for routines, workouts, exercises, timers, warmups, supersets, and history. I also built a configurable dashboard with O(1) widget placement and per-user caching so personalized reporting stayed responsive. For guided workouts, I implemented automatic progression logic modeled on practical coaching heuristics. I later extended the product with an in-app AI trainer that answers questions using the user's own training context instead of generic fitness advice.",
    architecture:
      "The mobile apps are built in React Native and communicate with a C# .NET API designed around clear domain boundaries and fast interaction paths. I set up Azure infrastructure using SQL Server for relational workout and account data, Cosmos DB for document-shaped use cases, and Service Bus to decouple asynchronous processing such as supporting services and notifications. The frontend balances local UI state, shared global state, and server-state synchronization so the app stays responsive across complex workout flows.",
    tradeoffs:
      "The product sits at the intersection of training logic, personalization, and AI assistance, so capability can quickly become complexity. Automatic progression and generated programming needed guardrails so the app could adapt without making unsafe jumps or muddy recommendations. Supporting both SQL Server and Cosmos DB also adds operational cost, so I kept storage boundaries explicit and used asynchronous workflows where they improved responsiveness without hiding important user feedback.",
    outcome:
      "Virtual Trainer shipped to the App Store and Google Play with routine and workout generation, guided training flows, progress reporting, custom exercise support, automatic progression, and an in-app AI trainer. It also validated an end-to-end stack I designed and operated in production: mobile clients, backend services, cloud infrastructure, asynchronous workflows, and product decisions that kept those systems cohesive for users.",
  },
  {
    slug: "winforms-modernization",
    title: "WinForms Modernization",
    summary:
      "Led migration of a business-critical WinForms application from .NET Framework 4.6 to .NET 8, resolving incompatible UI dependencies and obsolete encryption without disrupting core workflows.",
    image: "/winforms-modernization.svg",
    tags: ["C#", ".NET 8", "WinForms", "Migration", "Security", "Desktop"],
    role: "Lead engineer",
    scope: "Legacy desktop modernization",
    keyDecision:
      "Treated the effort as phased modernization with explicit risk gates, not a one-shot runtime jump",
    highlights: [
      "Audited high-risk dependencies before touching the runtime",
      "Replaced or isolated unsupported WinForms controls",
      "Modernized obsolete encryption paths to current APIs",
      "Preserved business-critical workflows through staged validation and release gates",
    ],
    problem:
      "The application was still central to operations, but it was running on .NET Framework 4.6 with aging third-party WinForms controls, brittle library assumptions, and encryption code that had become obsolete. The risk was not just technical debt. Staying in place increased maintenance friction, narrowed upgrade paths, and left security-sensitive areas on a stack that was increasingly difficult to justify.",
    approach:
      "I treated migration as discovery plus risk management, not a blind version jump. I audited dependencies, ranked failure-prone controls and libraries, and split work into direct upgrades versus replacement tracks. I then addressed control compatibility, replaced obsolete crypto usage with supported APIs, and resolved runtime and API-level breaking changes as the app moved to .NET 8. Each phase closed with workflow-level validation before broad rollout.",
    architecture:
      "Because this was a mature WinForms codebase, the architecture work focused on reducing fragility while preserving known workflow behavior. I modernized the runtime, dependency graph, and security-sensitive paths. Where older controls could not move forward cleanly, I isolated or replaced them behind safer boundaries so the surrounding application could continue evolving on supported foundations.",
    tradeoffs:
      "A rewrite would have created unnecessary delivery risk for a system users already depended on, but a shallow upgrade would not fix core issues. The balance was aggressive modernization where the stack was unsafe or unsupported, while preserving enough continuity that users could trust existing behavior. That required deliberate choices about what to preserve, what to replace, and where temporary complexity was acceptable to reach a sustainable platform.",
    outcome:
      "The result was a legacy desktop application moved onto .NET 8 with stronger security, fewer unsupported dependencies, and a healthier maintenance path. The team shifted from repeatedly working around legacy blockers to delivering changes on a supported platform with lower upgrade risk.",
  },
  {
    slug: "azure-devops-pipeline-templates",
    title: "Azure DevOps Pipeline Templates",
    summary:
      "Standardized Azure DevOps delivery workflows by converting classic pipelines to YAML and building a versioned shared template repository teams could adopt safely.",
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
      "Our Azure DevOps setup had become inconsistent over time. Many pipelines were still defined through classic UI flows, which made them harder to review, standardize, and reuse across teams. More advanced delivery steps were frequently rebuilt from scratch, slowing onboarding and causing behavior drift.",
    approach:
      "I converted classic pipelines into YAML so they could be versioned and reviewed like code. The bigger gain came from moving beyond one-off migrations: I built a dedicated template repository that teams could reference directly for common build, test, packaging, and deployment patterns. This centralized repeated logic, removed copy-paste drift, and let improvements ship once across many consumers.",
    architecture:
      "The shared repository was structured around reusable YAML templates that teams imported into their own pipelines. I versioned templates with semantic versioning and published tags that downstream pipelines referenced explicitly. That created a stable contract between template authors and consuming teams: improvements could ship continuously, while breaking changes landed in new versions without surprising existing builds. The result was a lightweight internal CI/CD platform instead of disconnected pipeline files.",
    tradeoffs:
      "Centralizing pipeline logic improves consistency, but it creates a shared dependency teams need to trust. The versioned-tag model balanced this: teams adopted shared templates without giving up control over upgrade timing, and I could evolve templates without surprise regressions. The tradeoff was stricter discipline around versioning and compatibility, which was still far cheaper than each team maintaining fragile pipeline logic independently.",
    outcome:
      "The pipeline work unified how delivery workflows were defined, reduced time to stand up complex pipelines, and made common tasks easier to maintain across teams. More importantly, it shifted pipelines from ad hoc configuration to a reusable engineering asset: versioned, reviewable, and safe to evolve over time.",
  },
];
