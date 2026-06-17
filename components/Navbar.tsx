"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { primaryNavLinks } from "../lib/site";
import GlowPanel from "./GlowPanel";
import Magnetic from "./Magnetic";
import NavLink from "./NavLink";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const baseStyles = "type-nav text-sm link-underline nav-underline focus-accent rounded-md px-1 py-0.5 transition";
  const activeStyles = "nav-underline-active text-accent";
  const inactiveStyles = "text-zinc-700 hover:text-accent dark:text-zinc-300";

  return (
    <header className="fixed inset-x-0 top-0 z-[500] px-3 pt-2 sm:px-4 sm:pt-2.5">
      <GlowPanel className="surface-panel mx-auto max-w-6xl rounded-2xl px-4 shadow-[0_18px_44px_-36px_rgba(24,24,27,0.35)] dark:shadow-[0_20px_48px_-38px_rgba(0,0,0,0.8)]">
        <nav className="flex h-12 items-center justify-between gap-4">
          <Magnetic strength={6}>
            <NavLink
              href="/"
              aria-label="Home"
              className="type-nav tracking-[0.18em] focus-accent rounded-md px-1 py-0.5 text-[0.82rem] font-semibold uppercase transition"
              activeClassName="text-accent"
              inactiveClassName="text-zinc-900 dark:text-zinc-100"
            >
              Steven
            </NavLink>
          </Magnetic>

          <div className="hidden items-center gap-7 sm:flex">
            {primaryNavLinks.map((item) => (
              <Magnetic key={item.href} strength={8}>
                <NavLink
                  href={item.href}
                  className={baseStyles}
                  activeClassName={activeStyles}
                  inactiveClassName={inactiveStyles}
                >
                  {item.label}
                </NavLink>
              </Magnetic>
            ))}
          </div>

          <button
            type="button"
            aria-label="Toggle menu"
            aria-controls="mobile-site-menu"
            aria-expanded={open}
            className="focus-accent inline-flex items-center justify-center rounded-full border border-zinc-200/80 bg-white/70 p-1.5 text-zinc-700 transition hover:border-accent/35 hover:text-accent dark:border-zinc-800/80 dark:bg-black/30 dark:text-zinc-300 sm:hidden"
            onClick={() => setOpen((value) => !value)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="inline-block">
              {open ? (
                <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.div
              key="mobile-menu"
              id="mobile-site-menu"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: "hidden" }}
              className="border-t border-zinc-200/70 dark:border-zinc-800/70 sm:hidden"
            >
              <div className="flex flex-col gap-2 py-2.5">
                {primaryNavLinks.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    className="focus-accent rounded-xl px-3 py-3 transition"
                    activeClassName="bg-accent/10 text-accent"
                    inactiveClassName="text-zinc-700 hover:bg-white/70 hover:text-accent dark:text-zinc-300 dark:hover:bg-black/20"
                    onClick={() => setOpen(false)}
                  >
                    <span className="type-nav text-sm font-medium">{item.label}</span>
                    <span className="mt-1 block text-sm leading-6 text-zinc-500 dark:text-zinc-400">{item.description}</span>
                  </NavLink>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlowPanel>
    </header>
  );
}
