"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const NavContext = createContext<string | null>(null);

export function NavProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentPath = useRef(pathname);
  const [previousPath, setPreviousPath] = useState<string | null>(null);

  useEffect(() => {
    if (currentPath.current !== pathname) {
      setPreviousPath(currentPath.current);
      currentPath.current = pathname;
    }
  }, [pathname]);

  return <NavContext.Provider value={previousPath}>{children}</NavContext.Provider>;
}

export const usePreviousPath = () => useContext(NavContext);
