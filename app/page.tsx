import Link from "next/link";
import DraggableTitle from "../components/draggable-title";
import { insights, projects } from "../lib/content";

export default function Home() {
  const featuredProject = projects[0];
  const featuredInsight = insights[0];
  const workingPrinciples = [
    "Care about the outcome",
    "Ask better questions first",
    "Keep improving what matters",
  ];

  return (
    <div className="flex flex-1 flex-col">
      <DraggableTitle
        fill
        compactSpacing
        lines={[
          "Hi, I'm Steven",
          "Senior Software Engineer",
          "I solve problems. I take pride in my work. I give a damn.",
        ]}
      >
        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1.45fr)_minmax(18rem,0.95fr)]">
          <section className="surface-panel flex h-full flex-col rounded-[1.75rem] px-5 py-3.5 sm:px-6 sm:py-4">
            <div className="type-meta text-xs text-accent">How I Work</div>
            <p className="mt-2.5 max-w-3xl text-sm leading-7 text-zinc-600 dark:text-zinc-400 sm:text-[0.98rem] [@media(max-height:860px)]:leading-6">
              I put a lot of myself into what I build. I care whether it works, whether it lasts, and whether it actually helps the person on the other end. I care about getting the outcome right for the people it affects. That is what keeps me engaged. I care about clear communication, thoughtful tradeoffs, and work that still holds up long after launch. If there is a chance to make things better for users or teammates, I want to be the person who does that.
            </p>

            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              {workingPrinciples.map((principle) => (
                <span key={principle} className="meta-pill">
                  {principle}
                </span>
              ))}
            </div>
          </section>

          <section className="surface-panel rounded-[1.75rem] px-5 py-3.5 sm:px-6 sm:py-4">
            <div className="type-meta text-xs text-accent">What I&apos;m Building</div>
            <div className="mt-3 space-y-3">
              <div>
                <div className="type-meta text-[11px] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Latest Build</div>
                <Link href={`/projects/${featuredProject.slug}`} className="mt-1.5 block rounded-2xl border border-zinc-200/70 bg-white/60 px-4 py-3 transition hover:border-accent/35 hover:bg-white/85 dark:border-zinc-800/70 dark:bg-black/20 dark:hover:bg-black/30">
                  <div className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{featuredProject.title}</div>
                  <p className="mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400 [@media(max-height:860px)]:hidden">{featuredProject.summary}</p>
                  <div className="mt-2.5 flex flex-wrap gap-2 [@media(max-height:820px)]:hidden">
                    {featuredProject.tags.slice(0, 3).map((tag) => (
                      <span key={tag} className="meta-pill">{tag}</span>
                    ))}
                  </div>
                </Link>
              </div>

              <div>
                <div className="type-meta text-[11px] uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Latest Essay</div>
                <Link href={`/insights/${featuredInsight.slug}`} className="mt-1.5 block rounded-2xl border border-zinc-200/70 bg-white/60 px-4 py-3 transition hover:border-accent/35 hover:bg-white/85 dark:border-zinc-800/70 dark:bg-black/20 dark:hover:bg-black/30">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="type-meta text-[11px] uppercase tracking-[0.18em] text-accent">{featuredInsight.category}</span>
                    <span className="type-meta text-xs text-zinc-500 dark:text-zinc-400">{featuredInsight.readTime}</span>
                  </div>
                  <div className="mt-2 text-base font-semibold text-zinc-900 dark:text-zinc-100">{featuredInsight.title}</div>
                  <p className="mt-1.5 text-sm leading-6 text-zinc-600 dark:text-zinc-400 [@media(max-height:860px)]:hidden">{featuredInsight.summary}</p>
                </Link>
              </div>
            </div>
          </section>
        </div>
      </DraggableTitle>
    </div>
  );
}
