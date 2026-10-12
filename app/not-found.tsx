import Link from "next/link";

export const metadata = {
  title: "Page not found | Steven Gonzalez",
};

export default function NotFound() {
  return (
    <div className="page">
      <section className="sec lost" aria-labelledby="lost-h">
        <p className="label">404</p>
        <h1 id="lost-h" className="page-h">
          This page came loose and drifted off
        </h1>
        <p className="intro">
          The link may be old, or the page may have moved.
        </p>
        <p className="lost-links">
          <Link className="btn solid" href="/">
            Back to the islands
          </Link>
          <Link href="/projects">Case studies</Link>
          <Link href="/insights">Writing</Link>
        </p>
        <figure className="doc-figure">
          <div
            className="scene-cv"
            data-scene="lost"
            role="img"
            aria-label="A mooring post on a floating island with a snapped rope, and a small island drifting away in the distance."
          />
        </figure>
      </section>
    </div>
  );
}
