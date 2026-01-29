export default function Footer() {
  return (
    <footer className="border-t border-zinc-200/40 bg-white dark:border-zinc-800/50 dark:bg-black">
      <div className="mx-auto max-w-6xl px-4 py-8 text-sm text-zinc-600 dark:text-zinc-400">
        <div className="flex items-center justify-between">
          <p>© {new Date().getFullYear()} Steven</p>
          <div className="flex gap-6">
            <a href="https://github.com/" target="_blank" rel="noopener noreferrer" className="link-underline hover:text-accent">GitHub</a>
            <a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer" className="link-underline hover:text-accent">LinkedIn</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
