import Link from "next/link";

const posts = [
  {
    slug: "engineering-tradeoffs",
    title: "On Engineering Tradeoffs",
    summary: "Optimizing for clarity and reliability over cleverness.",
  },
  {
    slug: "architecture-as-communication",
    title: "Architecture as Communication",
    summary: "How good architecture accelerates teams and decisions.",
  },
  {
    slug: "measuring-reliability",
    title: "Measuring Reliability Pragmatically",
    summary: "SLOs, error budgets, and focusing on outcomes.",
  },
];

export const metadata = {
  title: "Thoughts | Steven",
  description: "Short essays on engineering, architecture, and reliability.",
};

export default function ThoughtsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Thoughts</h1>
      <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">Short engineering essays in MDX.</p>
      <div className="mt-8 space-y-6">
        {posts.map((p) => (
          <Link key={p.slug} href={`/thoughts/${p.slug}`} className="block rounded-xl border border-zinc-200 p-4 transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900">
            <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{p.title}</h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">{p.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
