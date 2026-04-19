"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function RouteTheme() {
  const pathname = usePathname();

  useEffect(() => {
    document.body.setAttribute("data-route", pathname);
    return () => {
      document.body.removeAttribute("data-route");
    };
  }, [pathname]);

  return null;
}
