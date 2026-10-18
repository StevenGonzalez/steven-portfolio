import type { Metadata } from "next";
import Link from "next/link";
import ExternalLink from "@/components/ExternalLink";
import PostList from "@/components/PostList";
import ProjectGrid from "@/components/ProjectGrid";
import World from "@/components/World";
import { insights, projects } from "@/lib/content";
import { externalProfiles, worldSourceUrl } from "@/lib/site";
import { worldKb } from "@/lib/world-size";

// Everything else comes from the layout, which describes the home page.
export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <>
      <World />
      <div className="site">
        <canvas className="seam" id="seam" aria-hidden="true" />

        <section className="sec" id="about" aria-labelledby="about-h">
          <h2 className="label" id="about-h" data-rv>
            About
          </h2>
          <div className="about" data-rv>
            <p>
              I&apos;m a full-stack engineer, strongest on the web. I&apos;ve built React and Angular front ends, the
              .NET APIs and databases behind them, iOS and Android apps in React Native, and{" "}
              <Link href="/projects/industrial-saw-control-platform">a desktop app that runs industrial saws</Link>.
              Before the saws I worked on{" "}
              <Link href="/projects/fitness-platform">
                a SaaS platform that gyms and studios across the country run on
              </Link>
              , and co-founded <Link href="/projects/virtual-trainer">Virtual Trainer</Link>, which I built end to end.
            </p>
            <p>
              I love automation, and it&apos;s how I get to quality. Letting machines run the checks frees people to
              spend their attention on the hard problems. Virtual Trainer has more than 6,000 automated tests across the
              app and the API. At work I moved our build pipelines into{" "}
              <Link href="/projects/azure-devops-pipeline-templates">shared, versioned YAML templates</Link> that every
              team builds on.
            </p>
            <p>
              I sweat the details people feel: how fast a page loads, how it holds up on a cheap phone, whether it works
              from the keyboard. <Link href="/projects/sky-islands">The world at the top of this page</Link> is drawn in
              a background worker, so the page stays responsive while it moves.
            </p>
            <dl className="facts">
              <dt>Front end</dt>
              <dd>TypeScript, React, Angular, React Native</dd>
              <dt>Back end</dt>
              <dd>C#, .NET, SQL Server, Cosmos DB, RabbitMQ</dd>
              <dt>Testing</dt>
              <dd>Jest, React Native Testing Library, xUnit, Moq</dd>
              <dt>Delivery</dt>
              <dd>Azure, Azure DevOps pipelines, Electron.NET</dd>
            </dl>
          </div>
        </section>

        <section className="sec" id="work" aria-labelledby="work-h">
          <p className="label" data-rv>
            Selected work
          </p>
          <h2 id="work-h" data-rv>
            What I&apos;ve built
          </h2>
          <ProjectGrid projects={projects} titleAs="h3" />
        </section>

        <section className="sec" id="writing" aria-labelledby="writing-h">
          <p className="label" data-rv>
            Writing
          </p>
          <h2 id="writing-h" data-rv>
            Notes on building software
          </h2>
          <PostList posts={insights.slice(0, 5)} />
          <Link className="more" href="/insights" data-rv>
            All {insights.length} articles
          </Link>
        </section>

        <section className="sec" id="colophon" aria-labelledby="colophon-h">
          <p className="label" data-rv>
            Colophon
          </p>
          <h2 id="colophon-h" data-rv>
            How the world up top works
          </h2>
          <div className="colo">
            <p data-rv>
              There are no images in it. Every rock, leaf and cloud is drawn in code when the page loads, from a fixed
              random seed, so it&apos;s the same island on every visit.
            </p>
            <p data-rv>
              The scenery is painted once, then stacked in layers that slide with your pointer, and only the things that
              move are redrawn each frame. All of the drawing happens in background workers, so the page itself stays
              free. It&apos;s plain JavaScript on canvas with no libraries, about {worldKb()} KB gzipped, and it holds
              still if your system asks for reduced motion.
            </p>
          </div>
          <Link className="more" href="/insights/how-the-sky-islands-work" data-rv>
            How it&apos;s built, in more detail
          </Link>
          <ExternalLink className="more" href={worldSourceUrl} data-rv>
            Read the source on GitHub
          </ExternalLink>
        </section>

        <section className="sec contact" id="contact" aria-labelledby="contact-h">
          <h2 className="label" id="contact-h" data-rv>
            Contact
          </h2>
          <p className="big" data-rv>
            Hiring, or building something interesting? Send me a message.
          </p>
          <div className="row" data-rv>
            <ExternalLink className="btn solid" href={externalProfiles.linkedIn.href}>
              Message me on LinkedIn
            </ExternalLink>
            <ExternalLink className="btn line" href={externalProfiles.gitHub.href}>
              GitHub
            </ExternalLink>
            <Link className="btn line" href="/resume">
              Résumé
            </Link>
          </div>
        </section>
      </div>
      <canvas className="seam low" id="seam-low" aria-hidden="true" />
    </>
  );
}
