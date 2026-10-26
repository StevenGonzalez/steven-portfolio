import type { MDXComponents } from "mdx/types";
import { isValidElement, type ComponentPropsWithoutRef, type ReactNode } from "react";
import ExternalLink from "./components/ExternalLink";
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
    // A code block too wide for the page scrolls sideways, so it takes focus, for the arrow keys to scroll it.
    pre: (props: ComponentPropsWithoutRef<"pre">) => <pre tabIndex={0} {...props} />,
    // Markdown links only: MDX leaves an <a> written as JSX alone.
    a: ({ href, ...rest }: ComponentPropsWithoutRef<"a">) =>
      href && isExternalHref(href) ? <ExternalLink href={href} {...rest} /> : <a href={href} {...rest} />,
  };
}
