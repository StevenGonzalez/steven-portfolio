"use client";

import { usePathname } from "next/navigation";
import { ViewTransition } from "react";

/** Makes every move to a new page a view transition, so the page can turn (globals.css). React starts one only when a
 *  change puts a ViewTransition in, and most pages have none of their own, so this one is put in afresh for each
 *  address. It names nothing, so the whole page turns as one. */
export default function PageTurn() {
  const pathname = usePathname();
  return (
    <ViewTransition key={pathname} default="none">
      <span hidden />
    </ViewTransition>
  );
}
