import Link from "next/link";

/** What to read after the last line of a case study or an article, so the page doesn't end in a wall. */
export default function NextUp({
  label,
  href,
  title,
  summary,
}: {
  label: string;
  href: string;
  title: string;
  summary: string;
}) {
  return (
    <nav className="next-up" aria-label={label}>
      <p className="label">{label}</p>
      <Link href={href}>
        <b>{title}</b>
        <span>{summary}</span>
      </Link>
    </nav>
  );
}
