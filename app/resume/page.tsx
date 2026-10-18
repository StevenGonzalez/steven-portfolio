import { Fragment } from "react";
import PrintButton from "@/components/PrintButton";
import { pageMetadata } from "@/lib/meta";
import { externalProfiles, productionUrl } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Résumé",
  description: "Steven Gonzalez's experience, education and skills.",
  path: "/resume",
});

const jobs = [
  {
    title: "Software Engineer III",
    company: "MiTek",
    when: "October 2019 – present",
    where: "Chesterfield, MO",
    points: [
      "Led the full rewrite of a legacy software platform for a year and a half, from architecture and feature planning to building it across teams.",
      "Designed and built a new API from scratch, including the endpoints that control the machines.",
      "Built new Angular features for the rewrite.",
      "Created a shared repository of CI/CD pipeline templates, so every team builds, tests and deploys the same way.",
      "Build and maintain the Azure DevOps pipelines behind automated testing and deployment.",
      "Moved legacy systems from .NET Framework to .NET 8, and converted VB code to C#.",
      "Brought Docker into legacy workflows to make testing and deployment faster.",
      "Designed and built an installer platform that delivers product updates.",
      "Built and supported desktop applications in C#, SQL, WinForms, WPF and Angular.",
      "Led the team's move to agile practices, including sprint planning and retrospectives.",
      "Worked with PLCs for machine automation and control.",
    ],
  },
  {
    title: "CEO and Software Engineer",
    company: "Virtual Fitness LLC",
    when: "November 2018 – present",
    where: "Ballwin, MO",
    about: "Makers of Virtual Trainer, a cross-platform fitness app that builds workout plans and tracks progress.",
    points: [
      "Built the app front to back on my own: React Native on iOS and Android, with C# APIs, SQL, Azure AI, Azure AI Search, Azure Service Bus and Amazon SES.",
      "The API has 86 endpoints across 14 controllers, and the app and API have more than 6,000 automated tests.",
      "Set up the Azure services and the Azure DevOps delivery behind it.",
      "Worked with a senior product manager to turn customer needs into planned work.",
    ],
  },
  {
    title: "Software Developer",
    company: "Club Ready",
    when: "2017 – 2019",
    points: [
      "Helped build a new ASP.NET Core API, and wrote endpoints across several of its service areas.",
      "Worked with a third-party development company to set requirements and break the project into tasks.",
      "Was the point of contact between development and product for requirements.",
      "Wrote unit tests for domain services.",
      "Built internal tools that cut down support tickets.",
      "Improved the performance of high-impact queries and pages, and rewrote legacy pages and stored procedures.",
      "Designed tables, triggers, indexes and stored procedures across several databases, and used LINQ in the new architecture.",
    ],
  },
];

const sideProjects = [
  {
    title: "Sky Islands",
    when: "2026",
    about:
      "The painted world at the top of stevengonzalez.dev, drawn in code on canvas with no images and no libraries.",
    points: [
      "Moved all of the drawing into two web workers with OffscreenCanvas, which took mobile Lighthouse from 61 to 94–97 and main-thread time at load from 145 to 65 ms.",
      "Made the sound live with Web Audio, and wrote checks that render the world and its sound in headless Firefox and fail on a single changed pixel or sample.",
    ],
  },
];

const schools = [
  { degree: "Bachelor's degree in Computer Science", school: "University of Missouri – St. Louis", year: "2018" },
  { degree: "Associate degree", school: "Jefferson Community College, Hillsboro, MO", year: "2015" },
];

const skills = [
  [
    "Front end",
    "TypeScript, JavaScript, React, Next.js, React Native, Angular, HTML, CSS, Canvas 2D, Web Workers, Web Audio",
  ],
  ["Back end", "C#, ASP.NET Core, Entity Framework Core, Dapper, SQL Server, Cosmos DB, REST API design"],
  ["Messaging", "RabbitMQ, MassTransit, Azure Service Bus"],
  ["Testing", "Jest, React Native Testing Library, xUnit, Moq"],
  ["Delivery", "Azure, Azure DevOps pipelines, Docker, Electron.NET, Git"],
  ["Machines", "Machine control APIs, PLC communication"],
];

export default function ResumePage() {
  return (
    <div className="page">
      <article className="sec resume" aria-labelledby="resume-h">
        <p className="label">Résumé</p>
        <h1 id="resume-h" className="page-h">
          Steven Gonzalez
        </h1>
        <p className="intro">
          Software engineer. I build web and mobile apps, the APIs and databases behind them, and the software that runs
          industrial machines. I care most about quality: automated tests, shared pipelines, and upgrades that
          don&apos;t break anything for the people relying on them.
        </p>
        <p className="resume-links">
          {[...Object.values(externalProfiles).map((profile) => profile.href), productionUrl].map((href) => (
            <a key={href} href={href}>
              {href.replace(/^https:\/\/(www\.)?/, "").replace(/\/$/, "")}
            </a>
          ))}
          <PrintButton />
        </p>

        <section aria-labelledby="exp-h">
          <h2 id="exp-h">Experience</h2>
          {jobs.map((job) => (
            <div key={job.company} className="job">
              <h3>
                {job.title}, <span>{job.company}</span>
              </h3>
              <p className="meta">{[job.when, job.where].filter(Boolean).join(" · ")}</p>
              {job.about ? <p>{job.about}</p> : null}
              <ul>
                {job.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section aria-labelledby="projects-h">
          <h2 id="projects-h">Projects</h2>
          {sideProjects.map((project) => (
            <div key={project.title} className="job">
              <h3>{project.title}</h3>
              <p className="meta">{project.when} · Personal project</p>
              <p>{project.about}</p>
              <ul>
                {project.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>

        <section aria-labelledby="edu-h">
          <h2 id="edu-h">Education</h2>
          {schools.map((s) => (
            <div key={s.school} className="job">
              <h3>{s.degree}</h3>
              <p className="meta">
                {s.school} · {s.year}
              </p>
            </div>
          ))}
        </section>

        <section aria-labelledby="skills-h">
          <h2 id="skills-h">Skills</h2>
          <dl className="facts">
            {skills.map(([area, list]) => (
              <Fragment key={area}>
                <dt>{area}</dt>
                <dd>{list}</dd>
              </Fragment>
            ))}
          </dl>
        </section>
      </article>
    </div>
  );
}
