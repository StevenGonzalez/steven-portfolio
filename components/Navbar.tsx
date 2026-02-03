"use client";

import Link from "next/link";
import { useState } from "react";
import Magnetic from "./Magnetic";
import NavLink from "./NavLink";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const baseStyles = "type-nav text-sm link-underline nav-underline focus-accent rounded-md px-1 py-0.5 transition";
  const activeStyles = "nav-underline-active text-accent";
  const inactiveStyles = "text-zinc-700 hover:text-accent dark:text-zinc-300";

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/40 bg-white/70 backdrop-blur dark:border-zinc-800/50 dark:bg-black/50">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Magnetic strength={6}>
          <NavLink
            href="/"
            aria-label="Home"
            className="type-nav tracking-wide focus-accent rounded-md px-1 py-0.5 text-sm font-semibold transition"
            activeClassName="text-accent"
            inactiveClassName="text-zinc-900 dark:text-zinc-100"
          >
            Steven
          </NavLink>
        </Magnetic>
        <button
          aria-label="Toggle menu"
          className="rounded-md p-2 text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-900 sm:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="inline-block">
            <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
        <div className="hidden gap-8 sm:flex">
          <Magnetic strength={8}>
            <NavLink
              href="/projects"
              className={baseStyles}
              activeClassName={activeStyles}
              inactiveClassName={inactiveStyles}
            >
              Projects
            </NavLink>
          </Magnetic>
          <Magnetic strength={8}>
            <NavLink
              href="/insights"
              className={baseStyles}
              activeClassName={activeStyles}
              inactiveClassName={inactiveStyles}
            >
              Insights
            </NavLink>
          </Magnetic>
        </div>
      </nav>
      {open && (
        <div className="border-t border-zinc-200/60 bg-white dark:border-zinc-800 dark:bg-black sm:hidden">
          <div className="mx-auto max-w-6xl px-4 py-2">
            <div className="flex flex-col gap-2">
              <Link href="/projects" className="type-nav py-2 text-sm" onClick={() => setOpen(false)}>Projects</Link>
              <Link href="/insights" className="type-nav py-2 text-sm" onClick={() => setOpen(false)}>Insights</Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
