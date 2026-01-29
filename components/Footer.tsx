import Magnetic from "./Magnetic";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200/40 bg-white dark:border-zinc-800/50 dark:bg-black">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center justify-between">
          <p>© {new Date().getFullYear()} Steven</p>
          <div className="flex gap-6">
            <Magnetic strength={8}>
              <a href="https://github.com/" target="_blank" rel="noopener noreferrer" className="link-underline focus-accent rounded-md px-1 py-0.5 hover:text-accent">GitHub</a>
            </Magnetic>
            <Magnetic strength={8}>
              <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer" className="link-underline focus-accent rounded-md px-1 py-0.5 hover:text-accent">LinkedIn</a>
            </Magnetic>
          </div>
        </div>
      </div>
    </footer>
  );
}
