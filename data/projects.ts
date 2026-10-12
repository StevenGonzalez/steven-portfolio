import type { ProjectDetail } from "../types/content";

export const projects: ProjectDetail[] = [
  {
    slug: "virtual-trainer",
    title: "Virtual Trainer",
    summary:
      "A fitness app I co-founded and built: React Native on iOS and Android, a .NET API on Azure, and an AI trainer that answers from your own workout history.",
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
    scope: "Product, iOS and Android apps, .NET API, Azure",
    timeline: "2019 – present",
    keyDecision:
      "SQL Server for workout and account data, Cosmos DB for document-shaped data, and Service Bus for background work",
    highlights: [
      "Shipped on App Store + Google Play",
      "Configurable dashboard with O(1) widget placement and per-user caching",
      "Context-aware AI trainer grounded in user data",
      "Automated routine generation and workout progression",
      "Event-driven supporting services with Azure Service Bus",
      "More than 6,000 automated tests across the app and the API",
    ],
    card: {
      blurb:
        "A fitness app I co-founded and built: React Native on iOS and Android, a .NET API on Azure, and an AI trainer that answers from your own workout history.",
      points: [
        "Live on the App Store and Google Play",
        "Customizable dashboard with O(1) widget placement and per-user caching",
        "AI trainer that answers from the user's own training history",
        "Generates routines and progresses workouts automatically",
        "Background work runs through Azure Service Bus",
      ],
      stack: ["React Native", ".NET Core", "Azure", "SQL Server", "Cosmos DB", "LLM"],
    },
    problem:
      "My co-founder and I wanted a trainer, not a tracker. Most fitness apps we tried logged workouts well enough but planned them badly, made you fight the screen mid-set, or hid your progress. We wanted an app you could trust to plan your training, that stayed quick between sets, and that still made sense after months of use.",
    approach:
      "I led product and engineering across the app and the back end. The React Native client is built around a model of how training actually works: routines, workouts, exercises, timers, warmups, supersets and history. Each user arranges their own dashboard; widget placement is O(1) and results are cached per user, so it stays quick as people add more. Guided workouts progress automatically, using the same rules of thumb a coach would. Later I added an AI trainer that answers questions from the user's own training data instead of giving generic fitness advice.",
    architecture:
      "The apps talk to a C# .NET API, 86 endpoints across 14 controllers, split along the same lines as the training model. On Azure, SQL Server holds workouts and accounts, Cosmos DB holds the data that is naturally document-shaped, and Service Bus carries background work like notifications so it never holds up a request. In the app I kept screen state, shared app state and server data apart, which kept long workout sessions responsive.",
    tradeoffs:
      "Training logic, personalization and AI each add complexity, and together they add a lot. Automatic progression needed limits so it could adapt without suggesting unsafe jumps. Running both SQL Server and Cosmos DB costs more to operate, so I kept a clear rule for what lives where. Moving work to the background made the app faster, but anything the user needs to see right away stays out of the queue.",
    outcome:
      "Virtual Trainer shipped on the App Store and Google Play with generated routines and workouts, guided training, progress reports, custom exercises, automatic progression and the AI trainer. I designed and ran the whole stack in production, from the mobile apps down to the cloud. The app and the API carry more than 6,000 automated tests between them, which is what keeps it safe to change.",
  },
  {
    slug: "fitness-platform",
    title: "Fitness Business Management Platform",
    summary:
      "Engineer on the SaaS platform that runs studios, gyms and multi-location operators: scheduling, billing, CRM, member experience and reporting.",
    image: "/fitness-platform.svg",
    tags: ["C#", ".NET", "SaaS", "SQL", "Web", "Fitness Tech"],
    role: "Software engineer",
    scope: "Full stack, across most of the product",
    keyDecision:
      "Built each feature to work for every tenant's setup, from a single studio to a national franchise",
    highlights: [
      "Worked across scheduling, billing, CRM, and member experience domains",
      "Built and maintained features used by national fitness operators",
      "Contributed to both product features and underlying platform capabilities",
      "Operated in a multi-tenant SaaS environment with real operational constraints",
    ],
    card: {
      blurb:
        "Multi-tenant SaaS for studios, gyms and multi-location operators: scheduling, billing, CRM, member experience and reporting.",
      points: [
        "Shipped features used by national operators across hundreds of locations",
        "Worked on product features and the shared platform under them",
      ],
      stack: ["C#", ".NET", "SQL", "Web"],
    },
    problem:
      "The platform serves everyone from a single studio to a national franchise, and each one runs differently. Scheduling, billing, leads, member experience, staff workflows and reporting all have to behave the same way for every customer, however they are set up. The hard part is shipping new features without breaking anything for the operators already relying on it.",
    approach:
      "I worked across the product instead of owning one area: scheduling, billing and payments, CRM and leads, member-facing features and internal reporting, wherever the work was. Seeing that much of the system showed me where the real dependencies were, and that shaped both my feature work and the fixes I pushed for underneath it.",
    architecture:
      "It is a multi-tenant web app with a .NET back end, serving many operator setups from shared infrastructure. That only works with strict data isolation, behavior driven by configuration, and clear boundaries between services, so a change in one area cannot break an unrelated workflow for another customer. Reporting has to stay accurate while many operators write to the same data at once.",
    tradeoffs:
      "With that many customers on one system, every change trades speed against safety. A billing or scheduling change can reach a lot of code, so I learned to map what a change touches before making it. Working across areas also meant understanding tenancy, permissions and data integrity more deeply than a single feature team would need to.",
    outcome:
      "My work shipped to national fitness operators across hundreds of locations. I came away knowing what it takes to keep changing a production SaaS that businesses run on every day, where a mistake is visible to customers right away.",
  },
  {
    slug: "industrial-saw-control-platform",
    title: "Industrial Saw Control Platform",
    summary:
      "I build and maintain the software that runs industrial saws: an Angular operator interface, a C# API, Electron.NET desktop packaging, RabbitMQ messaging and PLC integration.",
    image: "/saw-blade-minimal.svg",
    tags: ["Angular", "C#", "Electron.NET", "RabbitMQ", "PLC", "Desktop"],
    role: "Software engineer",
    scope: "Front end, back end, machine integration and how we ship",
    keyDecision:
      "Kept the Angular UI, C# API and messaging as separate layers that can change independently, with fixed, predictable paths for talking to the machine",
    highlights: [
      "Built and maintained Angular features for machine operation workflows",
      "Implemented and supported C# API endpoints consumed by the desktop client",
      "Used Electron.NET to package and ship integrated desktop releases",
      "Integrated RabbitMQ messaging between saw software and companion systems",
      "Implemented PLC communication flows for machine control and status",
      "Contributed to architecture discussions, sprint planning, and estimation",
    ],
    card: {
      blurb:
        "The software that runs industrial saws: an Angular operator interface, a C# API, Electron.NET desktop packaging and RabbitMQ messaging.",
      points: [
        "UI, API and messaging layers that change independently",
        "Deterministic machine communication for control and status",
      ],
      stack: ["Angular", "C#", "Electron.NET", "RabbitMQ"],
    },
    problem:
      "The software keeps track of what the operator is doing, what the machine is doing, and the messages passing between programs, on machines that people rely on to run production. Writing the UI or the API on its own is the easy part. The hard part is keeping the desktop app, the back end, messaging and the PLC predictable while the machine is running, and still shipping every sprint.",
    approach:
      "I work on the Angular front end and the C# API together, building operator workflows end to end. I package the whole stack with Electron.NET so every desktop release ships as one consistent build. I also work on messaging and machine integration, including RabbitMQ flows and PLC communication, and take part in architecture reviews, sprint planning and estimation.",
    architecture:
      "The app is an Angular UI on a C# API, shipped as a desktop application through Electron.NET. RabbitMQ carries messages between the saw software and other programs, and the PLC integration handles control and telemetry to and from the machine. The UI stays quick locally, while anything that talks to the machine goes through explicit services and message contracts that we can watch and control.",
    tradeoffs:
      "Shipping the UI and services together gives us control over deployment and the operator's experience, but every change has to line up across the UI, the API, the machine and the message contracts. Machine control rewards predictability over experimentation, so changes are sequenced and tested carefully. In practice that means small, well-scoped improvements that make the system better without putting what already works at risk.",
    outcome:
      "The platform runs day-to-day machine operations with one consistent UI, back end, packaging model and integration layer. Along the way it has improved how the team makes architecture decisions, runs sprints and estimates work, so the system keeps changing without becoming less reliable in the field.",
  },
  {
    slug: "dotnet-framework-to-dotnet-8-upgrade",
    title: ".NET Framework to .NET 8 Upgrade",
    summary:
      "Led the move of a business-critical application from .NET Framework 4.6 to .NET 8, fixing runtime and dependency breaks without disrupting the workflows people relied on.",
    image: "/winforms-modernization.svg",
    tags: ["C#", ".NET 8", ".NET Framework", "Upgrade", "Compatibility", "Security"],
    role: "Lead engineer",
    scope: "Upgrading a legacy .NET application",
    keyDecision:
      "Upgraded in stages, checking compatibility at each one, instead of rewriting",
    highlights: [
      "Audited high-risk dependencies before changing target frameworks",
      "Resolved runtime and package-level breaking changes during migration",
      "Modernized obsolete encryption paths to current APIs",
      "Preserved business-critical behavior through staged validation and release gates",
    ],
    card: {
      blurb:
        "Moved a business-critical application from .NET Framework 4.6 to .NET 8 in stages, without a rewrite and without disrupting the workflows people relied on.",
      points: [
        "Audited high-risk dependencies before changing targets",
        "Replaced obsolete encryption with current APIs",
      ],
      stack: ["C#", ".NET 8", "Migration", "Security"],
    },
    problem:
      "The application was still central to the business, but it ran on .NET Framework 4.6 with fragile library assumptions, old dependencies and encryption code that had become obsolete. Staying put made every change harder, closed off future upgrades, and left security-sensitive code on a stack that was getting hard to defend.",
    approach:
      "I treated the upgrade as a series of discoveries, not one version bump. I audited the dependencies, listed where things were likely to break, and split the work into packages that could simply be upgraded and ones that had to be replaced. I replaced the obsolete cryptography with supported APIs and fixed runtime, package and API breaks as the app moved to .NET 8. Each stage ended with the main workflows tested before it went out more widely.",
    architecture:
      "The goal was to make the app less fragile on a new runtime while keeping its behavior the same. I moved the target frameworks, tightened dependency boundaries and updated the security-sensitive code without changing how the business workflows behaved. Where an old component could not move forward cleanly, I isolated or replaced it so the rest of the app could keep moving.",
    tradeoffs:
      "A rewrite would have put a system people depended on at risk for no good reason, but a shallow version bump would not have fixed the real problems. So I changed things aggressively where the stack was unsafe or unsupported, and left the rest alone so users could keep trusting how it behaved. That meant deciding piece by piece what to keep, what to replace, and where a little temporary complexity was worth it.",
    outcome:
      "The application now runs on .NET 8 with stronger security, fewer unsupported dependencies and an easier road for future upgrades. The team stopped working around legacy blockers and went back to shipping changes.",
  },
  {
    slug: "azure-devops-pipeline-templates",
    title: "Azure DevOps Pipeline Templates",
    summary:
      "Moved our Azure DevOps pipelines from the classic editor to YAML and built a shared, versioned template repository that teams can adopt without being broken by changes.",
    image: "/azure-devops-templates.svg",
    tags: ["Azure DevOps", "YAML", "CI/CD", "DevEx", "Templates", "Automation"],
    role: "Lead engineer",
    scope: "Build pipelines and developer workflow",
    keyDecision:
      "Published the templates behind semantic version tags, so teams upgrade when they choose to and never get broken by a template change",
    highlights: [
      "Migrated classic Azure DevOps pipelines to YAML",
      "Built a shared template repository for cross-team reuse",
      "Used semantic versioning and tags for safe adoption",
      "Reduced setup time for more complex delivery workflows",
    ],
    card: {
      blurb:
        "Moved classic pipelines to YAML and built a versioned template repository that teams can adopt without being broken by changes.",
      points: [
        "Semantic version tags, so each team chooses when to upgrade",
        "Complex pipelines take less time to set up",
      ],
      stack: ["Azure DevOps", "YAML", "CI/CD"],
    },
    problem:
      "Our Azure DevOps setup had drifted. Many pipelines still lived in the classic UI editor, which made them hard to review, standardize or reuse. Teams kept rebuilding the same advanced steps from scratch, which slowed down new projects and meant the same step behaved differently from one pipeline to the next.",
    approach:
      "I converted the classic pipelines to YAML so they could be versioned and reviewed like code. The bigger win came next: a shared template repository that teams reference directly for common build, test, packaging and deployment steps. Repeated logic now lives in one place, copy-paste drift is gone, and a fix ships once for every pipeline that uses it.",
    architecture:
      "Teams import reusable YAML templates from the shared repository into their own pipelines. I versioned the templates with semantic versioning and published tags that pipelines reference explicitly. That gives template authors and teams a stable contract: improvements keep shipping, while breaking changes go into a new version and existing builds keep working.",
    tradeoffs:
      "Centralizing pipeline logic makes things consistent, but it also creates a shared dependency that teams have to trust. Version tags handled that: teams kept control of when they upgraded, and I could change the templates without surprising anyone. The cost was being strict about versioning and compatibility, which is still far cheaper than every team maintaining its own fragile pipeline logic.",
    outcome:
      "Pipelines are now defined the same way across teams, complex ones take less time to set up, and common steps are easier to maintain. They went from one-off configuration to shared code that is versioned, reviewed and safe to change.",
  },
];
