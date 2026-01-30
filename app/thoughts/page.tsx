import Link from "next/link";

const posts = [
  {
    slug: "pull-request-playbook",
    title: "The Pull Request Playbook",
    summary: "A practical guide to writing clear, right-sized pull requests that get reviewed well.",
    date: "Jan 29, 2026",
  },
];

export const metadata = {
  title: "Thoughts | Steven",
  description: "Short essays on engineering and building healthy code review habits.",
};

export default function ThoughtsPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Thoughts</h1>
      <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">Short engineering essays in MDX.</p>
      <div className="mt-6">
        {posts.map((p) => (
          <Link
            key={p.slug}
            href={`/thoughts/${p.slug}`}
            className="group block -mx-4 rounded-2xl border-b border-zinc-200/60 px-4 py-4 transition-colors hover:bg-zinc-50 last:border-b-0 dark:border-zinc-800/60 dark:hover:bg-zinc-900"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{p.title}</h3>
                  {p.date ? <div className="text-xs text-zinc-500 dark:text-zinc-400">{p.date}</div> : null}
                </div>
                <p className="mt-1 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">{p.summary}</p>
              </div>
              <span aria-hidden className="ml-4 text-zinc-400 group-hover:text-accent">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
