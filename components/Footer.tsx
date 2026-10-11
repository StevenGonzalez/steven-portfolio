import Link from "next/link";
import { externalProfiles } from "../lib/site";

export default function Footer() {
  return (
    <footer className="foot">
      <span>© {new Date().getFullYear()} Steven Gonzalez</span>
      <nav aria-label="More">
        <Link href="/projects">Case studies</Link>
        <Link href="/insights">Writing</Link>
        {externalProfiles.map((profile) => (
          <a key={profile.href} href={profile.href} target="_blank" rel="noopener noreferrer">
            {profile.label}
          </a>
        ))}
      </nav>
    </footer>
  );
}
