import type { ComponentPropsWithoutRef } from "react";

/** A link to another site. It opens in a new tab, and says so to anyone who hears the link rather than sees it. */
export default function ExternalLink({ children, ...rest }: Omit<ComponentPropsWithoutRef<"a">, "target" | "rel">) {
  return (
    <a {...rest} target="_blank" rel="noopener noreferrer">
      {children}
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
