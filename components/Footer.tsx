import Link from "next/link";
import { externalProfiles } from "@/lib/site";
import ExternalLink from "./ExternalLink";

/** The foot of every page: the copyright, a bookplate like the one pasted inside a book's cover, and the links. In the
 *  dark theme, a few stars hang above it on the home page, and join up into the island when the pointer comes near. */
export default function Footer() {
  return (
    <footer className="foot">
      <span>© {new Date().getFullYear()} Steven Gonzalez</span>
      <span className="exlibris" aria-hidden="true" />
      <span className="stars" aria-hidden="true" />
      <nav aria-label="More">
        <Link href="/projects">Case studies</Link>
        <Link href="/insights">Writing</Link>
        <Link href="/resume">Résumé</Link>
        <a href="/feed.xml">RSS</a>
        {Object.values(externalProfiles).map((profile) => (
          <ExternalLink key={profile.href} href={profile.href}>
            {profile.label}
          </ExternalLink>
        ))}
      </nav>
    </footer>
  );
}
