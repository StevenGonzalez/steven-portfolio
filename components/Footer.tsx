import { externalProfiles } from "../lib/site";
import Magnetic from "./Magnetic";

export default function Footer() {
  return (
    <footer className="relative z-[500] shrink-0 px-3 pb-2 pt-1.5 sm:px-4 [@media(max-height:640px)]:pb-1.5 [@media(max-height:640px)]:pt-1">
      <div className="surface-panel mx-auto max-w-6xl rounded-2xl px-4 py-2.5 shadow-[0_18px_44px_-38px_rgba(24,24,27,0.28)] dark:shadow-[0_20px_48px_-40px_rgba(0,0,0,0.7)]">
        <div className="relative flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="type-meta text-[11px]">© {new Date().getFullYear()} Steven Gonzalez</p>
          </div>

          <div id="secret-message" className="secret-message secret-message--in-footer hidden sm:block" aria-hidden="true">
            Curiosity is an underrated engineering skill.
          </div>

          <div className="flex items-center gap-5 sm:gap-6">
              {externalProfiles.map((profile) => (
                <Magnetic key={profile.href} strength={8}>
                  <a href={profile.href} target="_blank" rel="noopener noreferrer" className="type-nav link-underline accent-underline focus-accent rounded-md px-1 py-0.5 text-sm hover:text-accent">
                    {profile.label}
                  </a>
                </Magnetic>
              ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
