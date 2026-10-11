import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";
import Link from "next/link";
import PostList from "../components/PostList";
import ProjectGrid from "../components/ProjectGrid";
import World from "../components/World";
import { insights, projects } from "../lib/content";
import { externalProfiles } from "../lib/site";

/** What the world costs to send: its own source, gzipped, measured when the page is built. */
function worldKb() {
  const dir = path.join(process.cwd(), "lib", "world");
  const source = readdirSync(dir)
    .filter((name) => name.endsWith(".js"))
    .map((name) => readFileSync(path.join(dir, name)));
  return Math.round(gzipSync(Buffer.concat(source)).length / 1024);
}

const linkedIn = externalProfiles.find((profile) => profile.label === "LinkedIn")!;
const gitHub = externalProfiles.find((profile) => profile.label === "GitHub")!;

export default function Home() {
  return (
    <>
      <World />
      <div className="site">
        <canvas className="seam" id="seam" aria-hidden="true" />

        <section className="sec" id="work" aria-labelledby="work-h">
          <p className="label" data-rv>
            Selected work
          </p>
          <h2 id="work-h" data-rv>
            What I&apos;ve built
          </h2>
          <ProjectGrid projects={projects} />
        </section>

        <section className="sec" id="about" aria-labelledby="about-h">
          <p className="label" id="about-h" data-rv>
            About
          </p>
          <div className="about">
            <blockquote data-rv>
              I like making slow things <em>fast</em> and fragile things boring.
            </blockquote>
            <div className="body" data-rv>
              <p>
                I build software for industrial machines: operator interfaces, messaging, and the systems that tie them
                together. Before that I co-founded Virtual Trainer and built features for a business platform used by gyms
                and studios across the country.
              </p>
              <p>
                Most of it has been web work, usually Angular or React on a .NET back end. Day to day I care about two
                things: that the app feels quick, and that the next person can change the code without breaking something.
              </p>
              <dl className="facts">
                <dt>Front end</dt>
                <dd>TypeScript, Angular, React, React Native</dd>
                <dt>Back end</dt>
                <dd>C#, .NET, SQL Server, Cosmos DB, RabbitMQ</dd>
                <dt>Platform</dt>
                <dd>Azure, Azure DevOps, Electron.NET</dd>
              </dl>
            </div>
          </div>
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
              The scenery is painted once in a background worker, then stacked in layers that slide with your pointer;
              only the things that move are redrawn each frame. It&apos;s plain JavaScript on canvas with no libraries,
              about {worldKb()} KB gzipped, and it holds still if your system asks for reduced motion.
            </p>
          </div>
          <a className="more" href={`${gitHub.href}/steven-portfolio/tree/main/lib/world`}
            target="_blank"
            rel="noopener noreferrer"
            data-rv
          >
            Read the source on GitHub
          </a>
        </section>

        <section className="sec contact" id="contact" aria-labelledby="contact-h">
          <p className="label" id="contact-h" data-rv>
            Contact
          </p>
          <p className="big" data-rv>
            Hiring, or building something interesting? Send me a message.
          </p>
          <div className="row" data-rv>
            <a className="btn solid" href={linkedIn.href} target="_blank" rel="noopener noreferrer">
              Message me on LinkedIn
            </a>
            <a className="btn line" href={gitHub.href} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </div>
        </section>
      </div>
      <canvas className="seam low" id="seam-low" aria-hidden="true" />
    </>
  );
}
