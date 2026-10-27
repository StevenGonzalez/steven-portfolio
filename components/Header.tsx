"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import ThemeToggle from "./ThemeToggle";

/** Over the world on the home page the bar is transparent, and turns solid as soon as the hero copy reaches it so the
 *  two never overlap. Over the edge of the world it stays transparent. Every other page has no world behind the bar,
 *  so it is solid from the start. The scroll state goes straight onto the element rather than through React, since it
 *  changes on every scroll frame. */
export default function Header() {
  const path = usePathname(),
    home = path === "/";
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = ref.current;
    const copy = home ? document.querySelector("[data-hero-copy]") : null;
    if (!nav || !copy) return;
    const update = () => nav.classList.toggle("solid", copy.getBoundingClientRect().top < nav.offsetHeight);
    update();
    addEventListener("scroll", update, { passive: true });
    addEventListener("resize", update, { passive: true });
    return () => {
      removeEventListener("scroll", update);
      removeEventListener("resize", update);
    };
  }, [home]);

  return (
    <header ref={ref} className={home || path === "/edge" ? "nav" : "nav solid"}>
      <Link className="wordmark" href="/">
        Steven Gonzalez
      </Link>
      <nav aria-label="Sections">
        <Link href="/#about" className="hide-sm">
          About
        </Link>
        <Link href="/#work">Work</Link>
        <Link href="/#writing">Writing</Link>
        <Link href="/#contact" className="hide-sm">
          Contact
        </Link>
        <ThemeToggle />
      </nav>
    </header>
  );
}
