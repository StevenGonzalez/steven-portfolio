import type { ComponentPropsWithoutRef, ReactNode } from "react";

type AnchorProps = ComponentPropsWithoutRef<"a">;
type HeadingProps = ComponentPropsWithoutRef<"h2">;
type MDXComponent = (props: unknown) => ReactNode;
type MDXComponents = Record<string, MDXComponent | undefined>;
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
    h2: ((props: unknown) => {
      const { id, children, ...rest } = props as HeadingProps;

      return (
        <h2 id={id ?? slugify(textFromNode(children))} {...rest}>
          {children}
        </h2>
      );
    }) satisfies MDXComponent,
    a: ((props: unknown) => {
      const { href, rel, target, ...rest } = props as AnchorProps;

      if (!href || typeof href !== "string" || !isExternalHref(href)) {
        return <a href={href} rel={rel} target={target} {...rest} />;
      }

      const safeRel = rel ? `${rel} noopener noreferrer` : "noopener noreferrer";

      return <a href={href} target={target ?? "_blank"} rel={safeRel} {...rest} />;
    }) satisfies MDXComponent,
  };
}
