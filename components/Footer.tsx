import Magnetic from "./Magnetic";

export default function Footer() {
  return (
    <footer className="shrink-0 border-t border-zinc-200/40 bg-white dark:border-zinc-800/50 dark:bg-black">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-zinc-600 dark:text-zinc-400">
        <div className="relative flex items-center justify-between">
          <p className="type-meta text-xs">© {new Date().getFullYear()} Steven Gonzalez</p>

          <div id="secret-message" className="secret-message secret-message--in-footer" aria-hidden="true">
            Curiosity is an underrated engineering skill.
          </div>

          <div className="flex gap-6">
            <Magnetic strength={8}>
              <a href="https://github.com/StevenGonzalez" target="_blank" rel="noopener noreferrer" className="type-nav link-underline accent-underline focus-accent rounded-md px-1 py-0.5 hover:text-accent">GitHub</a>
            </Magnetic>
            <Magnetic strength={8}>
              <a href="https://www.linkedin.com/in/sgonzalez-dev/" target="_blank" rel="noopener noreferrer" className="type-nav link-underline accent-underline focus-accent rounded-md px-1 py-0.5 hover:text-accent">LinkedIn</a>
            </Magnetic>
          </div>
        </div>
      </div>
    </footer>
  );
}
