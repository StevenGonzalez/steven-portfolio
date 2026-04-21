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
    slug: "fitness-platform",
    title: "Fitness Business Management Platform",
    summary:
      "Contributed across a full-suite fitness business management SaaS platform serving studios, gyms, and multi-location operators with scheduling, billing, CRM, member experience, and reporting.",
    image: "/fitness-platform.svg",
    tags: ["C#", ".NET", "SaaS", "SQL", "Web", "Fitness Tech"],
    role: "Software engineer",
    scope: "Full-stack, cross-product platform contribution",
    keyDecision:
      "Designed features for multi-tenant scale while preserving operational consistency across diverse fitness operator types",
    highlights: [
      "Worked across scheduling, billing, CRM, and member experience domains",
      "Built and maintained features used by national fitness operators",
      "Contributed to both product features and underlying platform capabilities",
      "Operated in a multi-tenant SaaS environment with real operational constraints",
    ],
    problem:
      "The platform serves a wide range of fitness operators, from single-location startups to large franchises, each with different operational needs. It has to support scheduling, billing, lead management, member experience, staff workflows, and reporting in a consistent way across customers with different configurations. Delivering new capabilities without disrupting existing operators at scale is a constant engineering challenge.",
    approach:
      "I contributed across the breadth of the platform rather than a single vertical. That meant working on scheduling flows, billing and payment paths, CRM and lead management, member-facing experiences, and internal reporting depending on what the product needed. Working across domains gave me a wide view of how the system held together and where the real dependencies and constraints were, which informed how I approached both feature work and systemic improvements.",
    architecture:
      "The platform is a multi-tenant SaaS with a web frontend and a .NET backend, structured to serve many operator configurations through shared infrastructure. Supporting that breadth requires careful data isolation, configuration-driven behavior, and well-defined service boundaries so product changes in one area do not break unrelated workflows for other customers. Reporting and analytics run across a data layer that has to stay consistent despite high write volume from concurrent operator activity.",
    tradeoffs:
      "Breadth at a SaaS company means balancing feature velocity against operational stability across many concurrent customers. A change to billing or scheduling logic can touch a large surface area, so the tradeoff was always between moving fast and moving safely. Working across domains also means understanding cross-cutting concerns like multi-tenancy, permissions, and data integrity at a level that siloed feature work would not require.",
    outcome:
      "My work contributed to a platform used by national fitness operators across hundreds of locations. Beyond individual features, broad cross-domain contribution built a strong understanding of what it takes to evolve a production SaaS with real customers, operational complexity, and the kind of scale where engineering decisions have immediate visible consequences.",
  },
  {
    slug: "industrial-saw-control-platform",
    title: "Industrial Saw Control Platform",
    summary:
      "Build and maintain production software for industrial saw systems using an Angular frontend, C# API backend, and Electron.NET desktop packaging, with RabbitMQ messaging and PLC integration.",
    image: "/saw-blade-minimal.svg",
    tags: ["Angular", "C#", "Electron.NET", "RabbitMQ", "PLC", "Desktop"],
    role: "Software engineer",
    scope: "Frontend, backend, machine integration, and delivery process",
    keyDecision:
      "Used a modular desktop architecture where Angular UI, C# API, and messaging layers could evolve independently while maintaining deterministic machine communication paths",
    highlights: [
      "Built and maintained Angular features for machine operation workflows",
      "Implemented and supported C# API endpoints consumed by the desktop client",
      "Used Electron.NET to package and ship integrated desktop releases",
      "Integrated RabbitMQ messaging between saw software and companion systems",
      "Implemented PLC communication flows for machine control and status",
      "Contributed to architecture discussions, sprint planning, and estimation",
    ],
    problem:
      "The software has to coordinate user-driven workflows, machine state, and inter-process communication in a production environment where reliability matters. The challenge is not just writing UI or API code in isolation. It is making sure desktop behavior, backend logic, messaging, and PLC interactions remain predictable under real operating conditions while still moving quickly through sprint-based delivery.",
    approach:
      "I work across the Angular frontend and C# API to implement and evolve operator-facing workflows and backend capabilities together. I package the combined stack with Electron.NET so desktop releases remain consistent. I also contribute to messaging and machine-integration work, including RabbitMQ flows and PLC communication paths, and collaborate closely with other engineers during architecture reviews, sprint planning, and estimation to keep implementation aligned with system constraints.",
    architecture:
      "The application is structured as an Angular UI paired with a C# API and delivered as a desktop application through Electron.NET. RabbitMQ handles messaging between the saw software and other programs, while PLC integration provides control and telemetry pathways to the machine itself. The architecture balances local desktop responsiveness with explicit service and messaging boundaries so machine interactions remain controlled and observable.",
    tradeoffs:
      "A combined desktop-plus-service stack gives strong control over deployment and operator experience, but it increases coordination costs across UI, API, machine communication, and messaging contracts. PLC integration also favors deterministic behavior over rapid experimentation, so changes require careful sequencing and validation. The practical tradeoff is choosing incremental, well-scoped improvements that preserve operational confidence while still improving architecture and developer workflow.",
    outcome:
      "The result is a production platform that supports day-to-day machine operations with a cohesive UI, backend, desktop packaging model, and integration layer. Beyond feature work, this has strengthened cross-team engineering practices around architecture decisions, sprint execution, and estimation, helping the system evolve without losing reliability in the field.",
  },
  {
    slug: "dotnet-framework-to-dotnet-8-upgrade",
    title: ".NET Framework to .NET 8 Upgrade",
    summary:
      "Led a business-critical application upgrade from .NET Framework 4.6 to .NET 8, resolving breaking runtime and dependency issues without disrupting core workflows.",
    image: "/winforms-modernization.svg",
    tags: ["C#", ".NET 8", ".NET Framework", "Upgrade", "Compatibility", "Security"],
    role: "Lead engineer",
    scope: "Legacy .NET platform upgrade",
    keyDecision:
      "Ran the work as a compatibility-first platform upgrade with staged risk gates instead of a rewrite",
    highlights: [
      "Audited high-risk dependencies before changing target frameworks",
      "Resolved runtime and package-level breaking changes during migration",
      "Modernized obsolete encryption paths to current APIs",
      "Preserved business-critical behavior through staged validation and release gates",
    ],
    problem:
      "The application was still central to operations, but it was running on .NET Framework 4.6 with brittle library assumptions, aging dependencies, and encryption code that had become obsolete. The risk was not just technical debt. Staying in place increased maintenance friction, narrowed future upgrade paths, and left security-sensitive areas on a stack that was increasingly difficult to justify.",
    approach:
      "I treated migration as discovery plus risk management, not a blind version jump. I audited dependencies, mapped likely break points, and split work into direct upgrades versus replacement tracks. I then replaced obsolete crypto usage with supported APIs and resolved runtime, package, and API-level breakages as the app moved to .NET 8. Each phase closed with workflow-level validation before broad rollout.",
    architecture:
      "The architecture work focused on reducing fragility while preserving known behavior under a new runtime. I modernized target frameworks, dependency boundaries, and security-sensitive paths while keeping business workflows stable. Where legacy components could not move forward cleanly, I isolated or replaced them behind safer boundaries so the application could continue evolving on supported foundations.",
    tradeoffs:
      "A rewrite would have created unnecessary delivery risk for a system users already depended on, but a shallow version bump would not fix core issues. The balance was aggressive modernization where the stack was unsafe or unsupported, while preserving enough continuity that users could trust existing behavior. That required deliberate choices about what to preserve, what to replace, and where temporary complexity was acceptable to reach a sustainable platform.",
    outcome:
      "The result was a legacy application moved onto .NET 8 with stronger security, fewer unsupported dependencies, and a healthier maintenance path. The team shifted from repeatedly working around legacy blockers to delivering changes on a supported platform with lower upgrade risk.",
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
