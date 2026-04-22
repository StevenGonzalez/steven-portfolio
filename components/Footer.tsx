import Magnetic from "./Magnetic";

export default function Footer() {
  return (
    <footer className="h-14 shrink-0 border-t border-zinc-200/40 bg-white dark:border-zinc-800/50 dark:bg-black [@media(max-height:640px)]:h-11 [@media(max-height:480px)]:h-9">
      <div className="mx-auto flex h-full max-w-6xl items-center px-4 text-sm text-zinc-600 dark:text-zinc-400">
        <div className="relative flex w-full items-center justify-between gap-4">
          <p className="type-meta text-xs">© {new Date().getFullYear()} Steven Gonzalez</p>

          <div id="secret-message" className="secret-message secret-message--in-footer hidden sm:block" aria-hidden="true">
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
