"use client";

import { createContext, useContext, useRef } from "react";
import { usePathname } from "next/navigation";

const NavContext = createContext<string | null>(null);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const history = useRef<{ prev: string | null; curr: string }>({
    prev: null,
    curr: pathname,
  });

  if (history.current.curr !== pathname) {
    history.current.prev = history.current.curr;
    history.current.curr = pathname;
  }

  return <NavContext.Provider value={history.current.prev}>{children}</NavContext.Provider>;
}

export const usePreviousPath = () => useContext(NavContext);
