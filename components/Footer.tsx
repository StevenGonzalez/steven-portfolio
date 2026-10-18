import Link from "next/link";
import { externalProfiles } from "../lib/site";
import ExternalLink from "./ExternalLink";

export default function Footer() {
  return (
    <footer className="foot">
      <span>© {new Date().getFullYear()} Steven Gonzalez</span>
      <nav aria-label="More">
        <Link href="/projects">Case studies</Link>
        <Link href="/insights">Writing</Link>
        <Link href="/resume">Résumé</Link>
        {Object.values(externalProfiles).map((profile) => (
          <ExternalLink key={profile.href} href={profile.href}>
            {profile.label}
          </ExternalLink>
        ))}
      </nav>
    </footer>
  );
}
