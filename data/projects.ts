import type { ProjectDetail } from "@/types/content";

export const projects: ProjectDetail[] = [
  {
    slug: "virtual-trainer",
    title: "Virtual Trainer",
    summary:
      "A fitness app I co-founded and built: React Native on iOS and Android, a .NET API on Azure, and an AI trainer that answers from your own workout history.",
    scene:
      "A barbell resting on a squat rack on a floating island, lifted through its reps by two bunches of balloons.",
    tags: ["React Native", ".NET Core", "Azure", "SQL Server", "Cosmos DB", "Azure AI"],
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
    ],
    shots: [
      {
        src: "/projects/virtual-trainer/dashboard.webp",
        width: 520,
        height: 1009,
        caption: "The dashboard",
        alt: "The Virtual Trainer dashboard with charts for workouts completed, weekly streak, workout frequency and volume.",
      },
      {
        src: "/projects/virtual-trainer/guided-session.webp",
        width: 520,
        height: 1009,
        caption: "A guided set",
        alt: "A guided session on Bench Press: 4 sets of 10 reps at 150 lbs with 1:15 rest, and a note from the trainer on where you left off.",
      },
      {
        src: "/projects/virtual-trainer/exercise-library.webp",
        width: 520,
        height: 1009,
        caption: "The exercise library",
        alt: "Bench Press in the exercise library, with its demo, the member's personal records and step-by-step instructions.",
      },
      {
        src: "/projects/virtual-trainer/safety-check.webp",
        width: 520,
        height: 1009,
        caption: "Planning a routine",
        alt: "Before building a plan, the trainer asks whether anything has changed with your health, with the answers Nothing new and Something's changed.",
      },
      {
        src: "/projects/virtual-trainer/trainer-change.webp",
        width: 520,
        height: 1009,
        caption: "Asking for a change",
        alt: "After a member asks to swap the bench press for dumbbells, the trainer confirms the swap and the Upper Body day shows Bench Press with dumbbells.",
      },
      {
        src: "/projects/virtual-trainer/ask-trainer.webp",
        width: 520,
        height: 1009,
        caption: "Asking the trainer",
        alt: "A member asks the trainer how to breathe during a heavy squat, and the trainer answers with a link to the squat walkthrough.",
      },
    ],
    role: "Co-founder • Sole engineer",
    scope: "Product, iOS and Android apps, .NET API, Azure",
    timeline: "2019 – present",
    keyDecision:
      "Plain code owns workout history, timers, completed sets, account state and progression. The AI trainer reads them and explains them, but doesn't own them",
    card: {
      blurb:
        "A fitness app I co-founded and built: React Native on iOS and Android, a .NET API on Azure, and an AI trainer that answers from your own workout history.",
      points: [
        "Live on the App Store and Google Play",
        "Customizable dashboard, cached per user",
        "AI trainer that answers from the user's own training history",
        "Generates routines and progresses workouts automatically",
        "Background work runs through Azure Service Bus",
      ],
      stack: ["React Native", ".NET Core", "Azure", "SQL Server", "Cosmos DB", "Azure AI"],
    },
    problem:
      "My co-founder and I wanted a trainer, not a tracker. Most fitness apps we tried logged workouts well enough but planned them badly, made you fight the screen mid-set, or hid your progress. We wanted an app you could trust to plan your training, that stayed quick between sets, and that still made sense after months of use.",
    approach:
      "I led the product and built the app and the back end on my own. The React Native client is built around a model of how training actually works: routines, workouts, exercises, timers, warmups, supersets and history. Each user arranges their own dashboard, and its results are cached per user, so it stays quick as people add more. Guided workouts progress automatically, using the same rules of thumb a coach would. Later I added an AI trainer that answers from the user's own training data instead of giving generic fitness advice. Most of the work there is choosing what goes into the model's context for each question: what's relevant, what's out of date, and what's too sensitive to send at all. If the trainer suggests a change, like swapping the bench press for dumbbells, the change goes through the same checks as one made in the app before it touches real data.",
    architecture:
      "The apps talk to a C# .NET API, 86 endpoints across 14 controllers, split along the same lines as the training model. On Azure, SQL Server holds workouts and accounts, Cosmos DB holds the data that is naturally document-shaped, and Service Bus carries background work like notifications so it never holds up a request. In the app I kept screen state, shared app state and server data apart, which kept long workout sessions responsive.",
    tradeoffs:
      "Automatic progression needed limits so it could adapt without suggesting unsafe jumps. Running both SQL Server and Cosmos DB costs more to operate, so I kept a clear rule for what lives where. Moving work to the background made the app faster, but anything the user needs to see right away stays out of the queue.",
    outcome:
      "Virtual Trainer shipped on the App Store and Google Play with generated routines and workouts, guided training, progress reports, custom exercises, automatic progression and the AI trainer. I designed and ran the whole stack in production, from the mobile apps down to the cloud. The app and the API carry more than 6,000 automated tests between them, which is what keeps it safe to change.",
    reading: ["pulling-ai-into-real-products"],
  },
  {
    slug: "sky-islands",
    title: "Sky Islands",
    summary:
      "The painted world at the top of this site: plain JavaScript drawing on canvas in two web workers, with no images and no libraries. Moving the drawing off the main thread took mobile Lighthouse from 61 to 94–97.",
    scene:
      "An easel on a floating island, where a brush is finishing a painting of a smaller island with a lantern tree, and the lights in the painting drift up out of it into the sky.",
    tags: ["Canvas 2D", "Web Workers", "OffscreenCanvas", "Web Audio", "View Transitions", "Performance"],
    links: [
      {
        label: "Source",
        href: "https://github.com/StevenGonzalez/steven-portfolio/tree/main/lib/world",
      },
    ],
    role: "Personal project",
    scope: "Design, rendering, performance and interaction",
    timeline: "2026",
    keyDecision:
      "Moved all of the drawing into web workers, so the page's own thread only reads the pointer and moves finished layers",
    card: {
      blurb:
        "The painted world at the top of this site: plain JavaScript on canvas in web workers, with no images and no libraries.",
      points: [
        "Mobile Lighthouse went from 61 to 94–97 once all drawing moved into web workers",
        "The theme switch swaps layers painted ahead of time, so it never freezes",
        "Slow devices get lower resolution instead of dropped frames",
      ],
      stack: ["JavaScript", "Canvas 2D", "Web Workers", "Web Audio"],
    },
    problem:
      "I wanted the top of my site to show how I build things instead of describing it: a painted world that people want to stay in and play with. It had to feel alive and full of small surprises, and it still had to load and respond like a normal page on an ordinary phone. A big painted image would have been heavy and couldn't move, and every library I added would have been more to download before anything appeared.",
    approach:
      "Everything is drawn with the Canvas 2D API from a seeded random generator, so there are no image files and it is the same island on every visit. The scene is 11 stacked canvases. Eight are painted once for each size and theme and after that only slide; the other three hold everything that moves and are the only ones redrawn each frame. Each layer has its own depth, which gives the parallax, and its own resolution, so a soft sky renders at 60% and the blurred ferns in front at 30%. On top of that sit a field guide, seasons that follow the calendar, and sound made live with Web Audio. Interaction follows a few rules: hovering only looks, a click touches, nothing on screen explains how to play, and on a first visit the creatures arrive one at a time instead of all at once. The keyboard can play too: after the Sound button, Tab goes into the world, the arrow keys step from thing to thing, Enter clicks, and each name is read out. The field guide and Sound are ordinary buttons, and Escape closes the guide. If your system asks for reduced motion, the world draws once and holds still.",
    architecture:
      "Two web workers do the drawing. The paint worker paints the still layers and sends them back as ImageBitmaps, which pass between threads without being copied, and then paints the other theme in the background. The render worker owns the animated canvases, handed over with transferControlToOffscreen(), and draws every frame. The page's main thread only reads the pointer and the scroll position, posts them across, and moves the finished layers with CSS transforms. The hover hit tests run in the render worker against the same shapes it draws. Browsers without OffscreenCanvas run the same renderer on the main thread through the same messages, so there is one renderer to test. The rest of the site is Next.js 16 and React 19, with every page built ahead of time and the articles written in MDX.",
    tradeoffs:
      "Drawing everything in code made the download small but made the first frame expensive, so most of the work went into deciding what never has to be drawn twice. Quality follows measured frame times, not a list of devices: when frames run long, the renderer drops to half-rate layers and then to lower resolution, and it never steps back up, because flipping between modes would be more noticeable than either one. A benchmark script drives headless Firefox through fixed scenes, runs the change and the last commit in alternating rounds, and fails if any scene gets more than 1 ms a frame slower, so a new feature either fits or gets cheaper. Two more checks render the change and the last commit side by side and fail if a single pixel or sound sample differs, so a cleanup can never quietly change the picture or the sound.",
    outcome:
      "Moving the drawing off the main thread took mobile Lighthouse from 61 to between 94 and 97, with desktop at 99 and nothing shifting while the page loads. Painting the first frame in the worker cut main-thread time at load from 145 to 65 ms on a standard screen and from 282 to 44 ms on a high-density one. The theme switch went from a one-second freeze to an instant swap. In Firefox on Linux, which draws canvas on the CPU, the lower-resolution step took clicking around the world from 26 to 53 frames a second. The painted scenes on these case studies, this one included, run on the same code.",
    reading: ["how-the-sky-islands-work", "canvas-26-fps-firefox-linux", "sound-with-no-audio-files"],
  },
  {
    slug: "industrial-saw-control-platform",
    title: "Industrial Saw Control Platform",
    summary:
      "I led the rewrite of the software that runs industrial saws: a new C# API with the machine-control endpoints, an Angular operator interface, Electron.NET desktop packaging, RabbitMQ messaging and PLC integration. The company cancelled it after a year and a half to put its people on other work.",
    scene:
      "A mill on a floating island whose water wheel is a circular saw blade, turned by a waterfall from the rock above.",
    tags: ["Angular", "C#", "Electron.NET", "RabbitMQ", "PLC", "Desktop"],
    role: "Lead engineer",
    scope: "Architecture, a new API, the Angular front end, and planning across teams",
    keyDecision:
      "Shipped the Angular UI and the C# API as one Electron.NET build, so an operator can never run one version of the UI against another version of the API",
    card: {
      blurb:
        "Led the rewrite of the software that runs industrial saws: a new C# API with the machine-control endpoints, an Angular operator interface and Electron.NET desktop packaging.",
      points: [
        "Designed and built the new API from scratch, machine control included",
        "UI and API ship as one desktop build, so their versions always match",
        "Planned the architecture and features across teams",
      ],
      stack: ["Angular", "C#", "Electron.NET", "RabbitMQ"],
    },
    problem:
      "The saws ran on a legacy software platform, and the company set out to replace it with a full rewrite. The software keeps track of what the operator is doing, what the machine is doing, and the messages passing between programs, on machines that people rely on to run production. Writing the UI or the API on its own is the easy part. The hard part is keeping the desktop app, the back end, messaging and the PLC predictable while the machine is running.",
    approach:
      "I led the rewrite: the architecture, the plan for which features came first, and building it with the other teams involved. I designed and built a new C# API from the ground up, including the endpoints that control the machines, and built Angular features for the new operator interface on top of it. The whole stack ships through Electron.NET as one desktop build, so a release never pairs one version of the UI with another version of the API. I also worked on messaging and machine integration, including RabbitMQ flows and PLC communication, and led the team's move to agile practices, including sprint planning and retrospectives.",
    architecture:
      "The app is an Angular UI on a C# API, shipped as a desktop application through Electron.NET. RabbitMQ carries messages between the saw software and other programs, and the PLC integration handles control and telemetry to and from the machine. The API checks a machine command before it goes anywhere, messaging moves it between programs, and the PLC layer handles the protocol. The UI doesn't guess. It shows what the system actually knows: connected or not, busy, waiting, done or failed. I was careful with optimistic updates, because showing a state the machine hasn't confirmed is how operators learn not to trust the screen.",
    tradeoffs:
      "Shipping the UI and services together gives control over deployment and the operator's experience, but every change has to line up across the UI, the API, the machine and the message contracts. Machine control rewards predictability over experimentation, so changes were sequenced and tested carefully. A rewrite also has to be planned across teams that each own a piece of it, so a lot of my job was making sure those pieces would fit together before anyone built them.",
    outcome:
      "After a year and a half, the company cancelled the rewrite to put its people on other work. By then I had designed and built the new API, machine-control endpoints included, and built Angular features for the new operator interface.",
    reading: ["reliable-desktop-software-web-first-world"],
  },
  {
    slug: "fitness-platform",
    title: "Fitness Business Management Platform",
    timeline: "2017 – 2019",
    summary:
      "Developer on the SaaS platform that runs studios, gyms and multi-location operators. I helped build its new ASP.NET Core API, sped up high-impact queries and pages, and was the link between engineering and product.",
    scene: "Five floating islands, each with a small lit studio, joined by lines that lights travel along.",
    tags: ["C#", "ASP.NET Core", "SQL", "LINQ", "SaaS", "Multi-tenancy"],
    role: "Software developer",
    scope: "API, database and requirements, across most of the product",
    keyDecision:
      "Tested changes against real customers' settings rather than the default setup, which almost never looks like a real customer's",
    card: {
      blurb:
        "Multi-tenant SaaS for studios, gyms and multi-location operators: scheduling, billing, CRM, member experience and reporting.",
      points: [
        "Helped build a new ASP.NET Core API, with endpoints across several service areas",
        "Sped up high-impact queries and pages, and rewrote legacy stored procedures",
        "Shipped features used by national operators across hundreds of locations",
      ],
      stack: ["C#", "ASP.NET Core", "SQL", "LINQ"],
    },
    problem:
      "The platform serves everyone from a single studio to a national franchise, and each one runs differently. Scheduling, billing, leads, member experience, staff workflows and reporting all have to be correct for every customer, however they are set up. The hard part is shipping new features without breaking anything for the operators already relying on it.",
    approach:
      "I worked across the product instead of owning one area: scheduling, billing and payments, CRM and leads, member-facing features and internal reporting, wherever the work was. I helped build a new ASP.NET Core API and wrote endpoints in several of its service areas, with unit tests for the domain services behind them. I was the point of contact between development and product for requirements, and I worked with a third-party development company to set requirements and break the project into tasks. Seeing that much of the system showed me where the real dependencies were, and that shaped both my feature work and the fixes I pushed for underneath it.",
    architecture:
      "It is a multi-tenant web app with a .NET back end, serving many operator setups from shared infrastructure, so every query carries a second question: is this the right customer's data? Tenant IDs, location scoping, role checks and report filters are what let many businesses share one system safely, and a background job that touches shared tables needs the same filtering as a request. Reporting has to stay accurate while many operators write to the same data at once. On the data side, I designed tables, triggers, indexes and stored procedures across several databases, and used LINQ in the new architecture.",
    tradeoffs:
      "With that many customers on one system, every change trades speed against safety. A billing or scheduling change can reach a lot of code, so I learned to map what a change touches before making it. For performance, I went after the queries and pages with the most impact, and rewrote legacy pages and stored procedures. The cost of working across areas was depth, since I didn't own any one of them end to end. What I got for it was knowing where the dependencies were.",
    outcome:
      "My work shipped to national fitness operators across hundreds of locations, and the internal tools I built cut down support tickets. I came away knowing what it takes to keep changing a production SaaS that businesses run on every day, where a mistake is visible to customers right away.",
    reading: ["production-saas-edge-cases"],
  },
  {
    slug: "dotnet-framework-to-dotnet-8-upgrade",
    title: ".NET Framework to .NET 8 Upgrade",
    summary:
      "Led the move of a business-critical application from .NET Framework 4.7.1 to .NET 8, fixing runtime and dependency breaks without disrupting the workflows people relied on.",
    scene:
      "An old stone tower on a floating island, with new stone going on top and a crane lifting the next block up.",
    tags: ["C#", ".NET 8", ".NET Framework", "Upgrade", "Compatibility", "Security"],
    role: "Lead engineer",
    scope: "Upgrading a legacy .NET application",
    keyDecision:
      "Upgraded in place, in stages, changing one kind of thing per stage, so every break had one likely cause",
    card: {
      blurb:
        "Moved a business-critical application from .NET Framework 4.7.1 to .NET 8 in stages, without a rewrite and without disrupting the workflows people relied on.",
      points: [
        "Audited high-risk dependencies before changing targets",
        "Replaced obsolete encryption with current APIs",
      ],
      stack: ["C#", ".NET 8", "Migration", "Security"],
    },
    problem:
      "The application was still central to the business, but it ran on .NET Framework 4.7.1 with old dependencies and encryption code built on APIs that had become obsolete. Staying put made every change harder, closed off future upgrades, and left the security-sensitive code on those obsolete APIs.",
    approach:
      'I treated the upgrade as a series of discoveries, not one version bump. Before changing a target framework, I sorted every dependency: upgrade it, replace it with something supported, remove it, or isolate it for now. That list became the plan, and it answered "how far along are we?" better than a percentage. I replaced the obsolete cryptography with current APIs as its own piece of work, with tests aimed at exactly that path, and fixed runtime, package and API breaks as the app moved to .NET 8. Each stage had to pass the same checks before it went further: it builds and starts on .NET 8, the main workflows behave as before, data reads and writes the same way, the security-sensitive paths still work, and we know how to roll it back.',
    architecture:
      "The goal was to make the app less fragile on a new runtime while keeping its behavior the same. I moved the target frameworks, tightened dependency boundaries and updated the security-sensitive code without changing how the business workflows behaved. Where an old component could not move forward cleanly, I isolated or replaced it so the rest of the app could keep moving.",
    tradeoffs:
      "A rewrite would have put a system people depended on at risk for no good reason, but a shallow version bump would not have fixed the real problems. So I changed things aggressively where the stack was unsafe or unsupported, and left the rest alone so users could keep trusting how it behaved. That meant deciding piece by piece what to keep, what to replace, and where a little temporary complexity was worth it.",
    outcome:
      "The application now runs on .NET 8 with supported dependencies, current encryption and an easier road for future upgrades. The team stopped working around legacy blockers and went back to shipping changes.",
    reading: ["modernizing-legacy-systems-without-rewriting"],
  },
  {
    slug: "azure-devops-pipeline-templates",
    title: "Azure DevOps Pipeline Templates",
    summary:
      "Moved our Azure DevOps pipelines from the classic editor to YAML and built a shared, versioned template repository that teams can adopt without being broken by changes.",
    scene: "An aqueduct of identical arches carrying water from a spring out to three small islands.",
    tags: ["Azure DevOps", "YAML", "CI/CD", "DevEx", "Templates", "Automation"],
    role: "Lead engineer",
    scope: "Build pipelines and developer workflow",
    keyDecision:
      "Published the templates behind semantic version tags, so teams upgrade when they choose to and never get broken by a template change",
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
      "Our Azure DevOps setup had drifted. Many pipelines still lived in the classic UI editor, which made them hard to review, standardize or reuse. Teams kept rebuilding the same build, test, packaging and deploy steps, which slowed down new projects and meant the same step behaved differently from one pipeline to the next.",
    approach:
      "I converted the classic pipelines to YAML so they could be versioned and reviewed like code. The bigger win came next: a shared template repository that teams reference directly for common build, test, packaging and deployment steps. Only steps that already repeated became templates; a step one project needs stays in that project. Teams can change paths, optional stages and environment values, but the order of the steps and the safety checks are the same for everyone, and a fix ships once for every pipeline that uses it.",
    architecture:
      "Teams import reusable YAML templates from the shared repository into their own pipelines. A pipeline references the template repository at a semantic version tag, like v2.3.0, and passes a short list of parameters, each with a default that fits the common case. A patch release fixes something without changing behavior, a minor one adds something optional, and only a major one changes the contract. That gives template authors and teams a stable contract: improvements keep shipping, while breaking changes go into a new version and existing builds keep working.",
    tradeoffs:
      "Centralizing pipeline logic makes things consistent, but it also creates a shared dependency that teams have to trust. Version tags handled that: teams kept control of when they upgraded, and I could change the templates without surprising anyone. The cost was being strict about versioning and compatibility, which is still far cheaper than every team maintaining its own fragile pipeline logic. And a template that saves ten minutes of setup but costs an hour every time a build breaks is a bad trade, so step names say exactly what they do and failures surface close to their cause.",
    outcome:
      "Pipelines are now defined the same way across teams, complex ones take less time to set up, and common steps are easier to maintain. They went from one-off configuration to shared code that is versioned, reviewed and safe to change.",
    reading: ["ci-cd-templates-that-work"],
  },
];
