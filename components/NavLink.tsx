"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ComponentProps } from "react";

type NavLinkProps = ComponentProps<typeof Link> & {
  activeClassName?: string;
  inactiveClassName?: string;
};

export default function NavLink({
  href,
  children,
  className = "",
  activeClassName = "",
  inactiveClassName = "",
  onClick,
  ...props
}: NavLinkProps) {
  const pathname = usePathname();
  const path = typeof href === "string" ? href : href.toString();

  const isActive =
    path === "/" ? pathname === "/" : pathname === path || pathname.startsWith(path + "/");

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`${className} ${isActive ? activeClassName : inactiveClassName}`.trim()}
      onClick={onClick}
      {...props}
    >
      {children}
    </Link>
  );
}
