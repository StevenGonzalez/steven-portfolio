export type ProjectDetail = {
  slug: string;
  title: string;
  summary: string;
  image: string;
  tags: string[];
  problem: string;
  approach: string;
  architecture: string;
  tradeoffs: string;
  outcome: string;
};

export const projects: ProjectDetail[] = [
  {
    slug: "payments-platform",
    title: "Global Payments Platform Modernization",
    summary:
      "Re-architected a legacy monolith into an event-driven payments platform handling millions of transactions daily.",
    image: "/globe.svg",
    tags: ["TypeScript", "Kafka", "PostgreSQL", "Kubernetes"],
    problem:
      "A monolithic system caused scaling bottlenecks, slow releases, and fragile integrations across issuing, acquiring, and reconciliation.",
    approach:
      "Interviewed stakeholders, mapped domain boundaries, defined events and SLAs; iteratively carved out bounded contexts with clear APIs.",
    architecture:
      "Event-driven microservices using Kafka for async workflows, CQRS for read-heavy endpoints, Postgres for transactional stores, Redis for caching.",
    tradeoffs:
      "Accepted eventual consistency for certain flows; increased operational complexity offset by improved reliability and scalability.",
    outcome:
      "99.95% availability, p95 latency reduced by 43%, deploys >20/day with blue/green; auditability and compliance significantly improved.",
  },
  {
    slug: "ml-feature-store",
    title: "Real-time ML Feature Store",
    summary:
      "Built a low-latency feature store powering risk models with millisecond SLAs and versioned features.",
    image: "/window.svg",
    tags: ["Go", "TypeScript", "gRPC", "BigQuery", "Redis"],
    problem:
      "Models starved for fresh features; batch pipelines led to stale predictions and drift.",
    approach:
      "Unified offline/online features, introduced stream processors, versioning, and consistency checks.",
    architecture:
      "Streaming ingestion (Kafka), Flink processors, Redis as online store, BigQuery as offline, gRPC APIs with typed contracts.",
    tradeoffs:
      "Higher infra cost and operational load for strong consistency and low latency guarantees.",
    outcome:
      "AUC up 7%, fraud losses down double digits; engineers self-serve features in hours not weeks.",
  },
  {
    slug: "observability-revamp",
    title: "Observability Revamp",
    summary:
      "Implemented end-to-end tracing, SLOs, and error budgets to align engineering with business reliability goals.",
    image: "/file.svg",
    tags: ["OpenTelemetry", "Grafana", "Prometheus", "SLOs"],
    problem:
      "Multiple tools, no unified view; incidents required ad-hoc digging across logs and metrics.",
    approach:
      "Standardized instrumentation, propagated trace context, created SLOs per service, and set error budgets.",
    architecture:
      "OTel SDKs, Tempo traces, Loki logs, Prom metrics; dashboards and alerts mapped to customer journeys.",
    tradeoffs:
      "Initial instrumentation effort and some runtime overhead vs substantial gains in MTTR and prevention.",
    outcome:
      "MTTR down 54%, proactive detection up; culture shift to reliability as a product.",
  },
  {
    slug: "developer-platform",
    title: "Internal Developer Platform",
    summary:
      "Productized infrastructure and paved paths for services, CI/CD, and security by default.",
    image: "/next.svg",
    tags: ["Backstage", "Terraform", "GitHub Actions", "SAST"],
    problem:
      "Inconsistent service setups and drift caused slow onboarding and security risks.",
    approach:
      "Built golden paths with templates, guardrails, and docs; centralized service catalog and scorecards.",
    architecture:
      "Backstage plugins, Terraform modules, standardized CI/CD pipelines, SBOM and SAST integrations.",
    tradeoffs:
      "Less bespoke flexibility for dramatically improved consistency, security posture, and delivery speed.",
    outcome:
      "Service lead time cut by 60%; fewer incidents; developers focus on product not yak-shaving.",
  },
];
