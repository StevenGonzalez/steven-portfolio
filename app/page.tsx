import DraggableTitle from "../components/draggable-title";
import HomeCards from "../components/HomeCards";
import { insights, projects } from "../lib/content";

const workingPrinciples = [
  "Care about the outcome",
  "Ask better questions first",
  "Keep improving what matters",
];

export default function Home() {
  const featuredProject = projects[0];
  const featuredInsight = insights[0];

  return (
    <div className="flex flex-1 flex-col">
      <DraggableTitle
        fill
        compactSpacing
        lines={[
          "Hi, I'm Steven",
          "Senior Software Engineer",
          "I solve hard problems and give a damn about the outcome.",
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
            <HomeCards project={featuredProject} insight={featuredInsight} />
          </section>
        </div>
      </DraggableTitle>
    </div>
  );
}
