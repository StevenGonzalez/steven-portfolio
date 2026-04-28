"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function RouteTheme() {
  const pathname = usePathname();

  useEffect(() => {
    const body = document.body;
    const routeSection = pathname === "/" ? "home" : pathname.split("/").filter(Boolean)[0] ?? "home";

    body.setAttribute("data-route", pathname);
    body.setAttribute("data-route-section", routeSection);
  }, [pathname]);

  return null;
}
