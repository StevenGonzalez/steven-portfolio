import type { MDXComponents } from "mdx/types";
import { isValidElement, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { slugify } from "./lib/slug";

function isExternalHref(href: string) {
  return href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//");
}

/** The words in a heading, including those inside inline code or emphasis. */
function textFromNode(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textFromNode).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textFromNode(node.props.children);
  return "";
}

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    ...components,
    h2: ({ id, children, ...rest }: ComponentPropsWithoutRef<"h2">) => (
      <h2 id={id ?? slugify(textFromNode(children))} {...rest}>
        {children}
      </h2>
    ),
    a: ({ href, rel, target, ...rest }: ComponentPropsWithoutRef<"a">) => {
      if (!href || !isExternalHref(href)) {
        return <a href={href} rel={rel} target={target} {...rest} />;
      }

      const safeRel = rel ? `${rel} noopener noreferrer` : "noopener noreferrer";

      return <a href={href} target={target ?? "_blank"} rel={safeRel} {...rest} />;
    },
  };
}
