import type { ComponentPropsWithoutRef, ReactNode } from "react";

type AnchorProps = ComponentPropsWithoutRef<"a">;
type HeadingProps = ComponentPropsWithoutRef<"h2">;
type MDXComponents = Record<string, unknown>;

function isExternalHref(href: string) {
  return href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//");
}

function textFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map(textFromNode).join("");
  }

  return "";
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    h2: ({ id, children, ...props }: HeadingProps) => (
      <h2 id={id ?? slugify(textFromNode(children))} {...props}>
        {children}
      </h2>
    ),
    a: ({ href, rel, target, ...props }: AnchorProps) => {
      if (!href || typeof href !== "string" || !isExternalHref(href)) {
        return <a href={href} rel={rel} target={target} {...props} />;
      }

      const safeRel = rel ? `${rel} noopener noreferrer` : "noopener noreferrer";

      return <a href={href} target={target ?? "_blank"} rel={safeRel} {...props} />;
    },
  };
}
