import type { ComponentPropsWithoutRef } from "react";

type AnchorProps = ComponentPropsWithoutRef<"a">;

function isExternalHref(href: string) {
  return href.startsWith("http://") || href.startsWith("https://") || href.startsWith("//");
}

export function useMDXComponents(components: any) {
  return {
    ...components,
    a: ({ href, rel, target, ...props }: AnchorProps) => {
      if (!href || typeof href !== "string" || !isExternalHref(href)) {
        return <a href={href} rel={rel} target={target} {...props} />;
      }

      const safeRel = rel ? `${rel} noopener noreferrer` : "noopener noreferrer";

      return <a href={href} target={target ?? "_blank"} rel={safeRel} {...props} />;
    },
  };
}
